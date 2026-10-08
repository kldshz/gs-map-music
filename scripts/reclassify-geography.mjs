import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {makeCatalog,classifyAnchor,scopeKey,scopeLabel} from './lib/geography.mjs';
import {generateAssociations} from './lib/ost-associations.mjs';
import {auditCoverage} from './audit-anchor-music.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const map=await read('public/data/kongying-map.json'),library=await read('public/data/music-library.json'),edits=await read('data/association-edits.json');
const previous=structuredClone(library),catalog=makeCatalog(map);
// Optional migration baseline is local-only and read-only; preserve a complete, reviewable first diff.
const baseline=process.argv.includes('--baseline')?await read(process.argv[process.argv.indexOf('--baseline')+1]):null;
for(const a of map.anchors)a.geography=classifyAnchor(a,catalog);
const source=await read('data/sources/ost-bulk-source.json');
const trackAlbums=new Map(source.albums.flatMap(a=>a.tracks.map(t=>['netease:'+t.neteaseId,a])));
// Reuse enriched origin, retained original source metadata and all 25 already imported albums.
const groups=new Map();
for(const track of library.tracks){
 const album=trackAlbums.get(track.id)??{title:'风与牧歌之城',wikiUrl:track.sceneInfo.wikiSourceUrl};
 const key=album.title;if(!groups.has(key))groups.set(key,{...album,tracks:[]});
 groups.get(key).tracks.push({...track.sceneInfo,id:track.id,neteaseId:track.neteaseId});
}
const effective=structuredClone(library);
for(const edit of edits.edits){const at=effective.associations.findIndex(a=>a.trackId===edit.trackId&&a.anchorId===edit.anchorId);if(edit.action==='remove'&&at>=0)effective.associations.splice(at,1);if(edit.action==='add'&&at<0)effective.associations.push({trackId:edit.trackId,anchorId:edit.anchorId,matchType:'manual',evidenceStatus:'pending'});}
const candidates=generateAssociations({albums:[...groups.values()]},map,effective);
const protectedLinks=library.associations.filter(a=>a.evidenceStatus==='verified'||a.matchType==='manual');
const removals=new Set(edits.edits.filter(e=>e.action==='remove').map(e=>e.trackId+'|'+e.anchorId));
const edges=new Map(protectedLinks.map(a=>[a.trackId+'|'+a.anchorId,a]));
const byTrack=new Map(library.tracks.map(t=>[t.id,t]));
const classifications=[];
for(const {track,classification:r} of candidates){
 const t=byTrack.get(track.id);t.sceneInfo.geographicScopes=r.geographicScopes;t.sceneInfo.mainRegions=r.countries;
 for(const point of r.points){
  // Keep the source baseline recoverable. The preserved remove overlay suppresses it in the website.
  const key=t.id+'|'+point.id;if(edges.has(key))continue;
  edges.set(key,{id:`geo:${t.neteaseId}:${point.sourceId}`,trackId:t.id,anchorId:point.id,evidenceStatus:'pending',matchType:r.method,evidenceNote:`出处：${t.sceneInfo.originText||'未提供'}。${r.reason}`,sourceUrl:t.sceneInfo.wikiSourceUrl});
 }
 classifications.push({trackId:t.id,title:t.sceneInfo.wikiTitle,originText:t.sceneInfo.originText,category:r.kind,method:r.method,scopes:r.geographicScopes,anchorIds:r.points.filter(p=>!removals.has(t.id+'|'+p.id)).map(p=>p.id)});
}
library.associations=[...edges.values()].sort((a,b)=>a.trackId.localeCompare(b.trackId)||a.anchorId.localeCompare(b.anchorId));
const oldEdges=new Map((baseline??previous).associations.map(a=>[a.trackId+'|'+a.anchorId,a]));
const removed=[...oldEdges].filter(([key])=>!edges.has(key)).map(([,a])=>({trackId:a.trackId,anchorId:a.anchorId,previousMatchType:a.matchType}));
const added=[...edges].filter(([key])=>!oldEdges.has(key)).map(([,a])=>({trackId:a.trackId,anchorId:a.anchorId,matchType:a.matchType}));
const controls=['kongying:121680','kongying:121678'].map(id=>map.anchors.find(a=>a.id===id));
assert.equal(controls[0].geography.secondary,'巡猎者木屋');assert.equal(controls[1].geography.secondary,null);
assert.equal(library.tracks.length,1663);assert.equal(edges.size,library.associations.length);
for(const t of library.tracks){const old=previous.tracks.find(p=>p.id===t.id);assert.equal(t.personalNote,old.personalNote);assert.equal(t.sceneInfo.originText,old.sceneInfo.originText);}
for(const p of protectedLinks)assert.deepEqual(edges.get(p.trackId+'|'+p.anchorId),p);
const existingReport=await read('data/review/geography-reclassification.json').catch(e=>{if(e.code!=='ENOENT')throw e;return null});
const taxonomy=[...new Map(map.anchors.map(a=>[scopeKey(a.geography),{country:a.country,primary:a.geography.primary,secondary:a.geography.secondary}])).values()];
const report={policy:'2026-10-08 精细目录优先；同类独占阻止通用补充；无证据不以专辑地点曲填覆盖；全部pending，人工覆盖优先。',summary:{tracks:library.tracks.length,associations:library.associations.length,anchors:map.anchors.length,secondaryAssigned:map.anchors.filter(a=>a.geography.secondary).length,secondaryEmpty:map.anchors.filter(a=>!a.geography.secondary).length,distanceCandidates:map.anchors.filter(a=>a.geography.method==='landmark-distance').length,primaryEmpty:map.anchors.filter(a=>!a.geography.primary).length,unlocated:classifications.filter(c=>!c.scopes.length).length,withoutPoint:classifications.filter(c=>!c.anchorIds.length).length,archivedTracks:classifications.filter(c=>c.method==='region-archive'&&c.anchorIds.length).length,removed:removed.length,added:added.length},controls:controls.map(a=>({id:a.id,geography:a.geography})),coverage:auditCoverage(map,library,edits),taxonomy,classifications};
// Preserve the first migration diff on an idempotent rerun.
if(existingReport&&!removed.length&&!added.length){report.summary.removed=existingReport.summary.removed;report.summary.added=existingReport.summary.added;report.removed=existingReport.removed;report.added=existingReport.added;}
else {report.removed=removed;report.added=added;}
await fs.writeFile('public/data/kongying-map.json',JSON.stringify(map)+'\n');
await fs.writeFile('public/data/music-library.json',JSON.stringify(library,null,2)+'\n');
await fs.writeFile('data/review/geography-reclassification.json',JSON.stringify(report,null,2)+'\n');
const lines=['# 统一地理目录与音乐挂载校对','',`当前 ${report.summary.tracks} 曲 / ${report.summary.associations} 关系，全部新生成关系pending。原说明、出处、个人评价和人工记录保持。`,'',`877点位：二级已填 ${report.summary.secondaryAssigned}，留空 ${report.summary.secondaryEmpty}，地标距离候选 ${report.summary.distanceCandidates}，一级待确定 ${report.summary.primaryEmpty}。`,'',`迁移新增 ${report.summary.added} / 移除 ${report.summary.removed} 关系；没有点位的曲目 ${report.summary.withoutPoint}，未确定地区 ${report.summary.unlocated}，神像归档 ${report.summary.archivedTracks}。`,'','官方地名来自实际渲染DOM的63一级/229二级标签。地标是文本标注位置，不是边界/建筑入口。V3转换为近似图像变换；同地区350单位以内、次近距离至少差80单位才自动归二级，地下不按地表距离归类。点位原说明中明确细地点优先。所有分类仍待校对；不是官方点位到区域API。','',...controls.map(a=>`- ${a.id}：${scopeLabel(a.geography)}${a.geography.secondary?'':' / 二级留空'}`),'','## 统一目录','', '| 国家 | 一级地区 | 二级地点 | 点位数 |','| --- | --- | --- | --- |',...taxonomy.sort((a,b)=>scopeKey(a).localeCompare(scopeKey(b),'zh-CN')).map(s=>`| ${s.country} | ${s.primary??'待确定'} | ${s.secondary??'（空）'} | ${map.anchors.filter(a=>scopeKey(a.geography)===scopeKey(s)).length} |`),'','## 无点位曲目','', '| 曲目ID | 曲名 | 统一分类 | 原出处 |','| --- | --- | --- | --- |',...classifications.filter(c=>!c.anchorIds.length).map(c=>`| ${c.trackId} | ${c.title} | ${c.scopes.map(scopeLabel).join('；')||'未定位'} | ${c.originText.replaceAll('\n','；').replaceAll('|','／')} |`),'','完整逐曲分类、迁移删加清单见data/review/geography-reclassification.json。MySQL历史数据未自动迁移，网页JSON为当前修订。'];
await fs.writeFile('docs/GEOGRAPHY_REVIEW.md',lines.join('\n')+'\n');
console.log(JSON.stringify({changed:{removed:removed.length,added:added.length},...report.summary,coverage:report.coverage.summary},null,2));
