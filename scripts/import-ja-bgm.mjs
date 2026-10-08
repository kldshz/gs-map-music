import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {generateAssociations,hasOrigin,originalOrigin,category} from './lib/ost-associations.mjs';
import {jaEvidence,supplementalKind} from './lib/ja-bgm-evidence.mjs';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const library=await read('public/data/music-library.json'),source=await read('data/sources/ost-bulk-source.json'),map=await read('public/data/kongying-map.json');
const before=JSON.stringify(library),tracks=new Map(library.tracks.map(t=>[t.id,t]));
for(const t of library.tracks){
 const e=jaEvidence.get(t.id),kind=supplementalKind(e);
 const info=t.sceneInfo;if(!info)continue;
 const original=originalOrigin(info);
 info.metadataNotes=info.metadataNotes.filter(n=>!n.startsWith('日文Wiki分类：')&&!n.startsWith('日文Wiki补充：')&&!n.startsWith('BWIKI原出处：'));
 info.metadataNotes.push('BWIKI原出处：'+original);
 if(e&&kind)info.metadataNotes.push('日文Wiki分类：'+kind,`日文Wiki补充：${e.placeJa}；中文翻译：${e.placeZh}；${e.sourceUrl}`);
 const useful=original.trim()&&!/^[\s/—-]+$/.test(original);
 info.originText=useful?original:e?.placeJa?.trim()?`日文Wiki补充（中文）：${e.placeZh}`:'缺少出处';
}
const candidates=generateAssociations(source,map,library),desired=new Map(candidates.map(c=>['netease:'+c.track.neteaseId,new Set(c.classification.points.map(p=>p.id))]));
const removed=[];
library.associations=library.associations.filter(a=>{
 const t=tracks.get(a.trackId),e=jaEvidence.get(a.trackId),kind=t?category({...t.sceneInfo,id:t.id}):supplementalKind(e);
 if(t&&!hasOrigin({...t.sceneInfo,id:t.id})&&map.anchors.find(p=>p.id===a.anchorId)?.kind!=='statue'){removed.push({id:a.id,trackId:a.trackId,anchorId:a.anchorId,oldNote:a.evidenceNote,newKind:'missing-source'});return false;}
 if(!e||!kind)return true;
 if(a.id.startsWith('coverage:')){
  const role=a.evidenceNote.startsWith('专辑分碟推定：常态。')?'scene':'battle-generic';
  const cityScene=/城|町|村|港|宮|宮殿|要塞|競技場/.test(e.placeJa);
  if(kind===role&&!(role==='scene'&&cityScene))return true;
 }else if(a.id.startsWith('ost:')){
  if(desired.get(a.trackId)?.has(a.anchorId))return true;
 }else return true;
 removed.push({id:a.id,trackId:a.trackId,anchorId:a.anchorId,oldNote:a.evidenceNote,newKind:kind,sourceUrl:e.sourceUrl});return false;
});
const edges=new Set(library.associations.map(a=>a.trackId+'|'+a.anchorId));let added=0;
for(const c of candidates){
 const id='netease:'+c.track.neteaseId,e=jaEvidence.get(id);if(hasOrigin(c.track)&&(!e||!supplementalKind(e)))continue;
 for(const p of c.classification.points){const key=id+'|'+p.id;if(edges.has(key))continue;
  edges.add(key);library.associations.push({id:`ost:${c.track.neteaseId}:${p.sourceId}`,trackId:id,anchorId:p.id,evidenceStatus:'pending',matchType:c.classification.method,evidenceNote:`BWIKI：${c.track.originText||'未提供'}。日文Wiki：${e?.placeJa??'缺少出处'}；词典对照：${e?.placeZh??'缺少出处'}。${c.classification.reason}`,sourceUrl:e?.sourceUrl??c.album.wikiUrl});added++;
 }
}
assert.equal(edges.size,library.associations.length);
if(before!==JSON.stringify(library))await fs.writeFile('public/data/music-library.json',JSON.stringify(library,null,2)+'\n');
const path='data/review/ja-bgm-import.json',previous=await read(path).catch(e=>{if(e.code!=='ENOENT')throw e;return {removed:[]};});
const report={date:'2026-10-08',matched:jaEvidence.size,removed:[...previous.removed,...removed],totalAssociations:library.associations.length};
await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({matched:jaEvidence.size,added,removed:removed.length,totalAssociations:library.associations.length}));
