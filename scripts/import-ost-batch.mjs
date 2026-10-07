import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {generateAssociations,bannedArea} from './lib/ost-associations.mjs';
const batches=[['early',0,3],['inazuma-sumeru',3,8],['fontaine',8,12],['natlan',12,15],['northern',15,18],['retrospective',18,24]];
const through=process.argv[2]??'retrospective',batch=batches.find(b=>b[0]===through);assert(batch,'unknown batch');
const source=JSON.parse(await fs.readFile('data/sources/ost-bulk-source.json','utf8'));
const map=JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8'));
const originalLibraryText=await fs.readFile('public/data/music-library.json','utf8');
const library=JSON.parse(originalLibraryText);
const edits=JSON.parse(await fs.readFile('data/association-edits.json','utf8'));
const candidates=generateAssociations(source,map,library);
const byTrack=new Map(library.tracks.map(t=>[t.id,t])),edges=new Set(library.associations.map(a=>a.trackId+'|'+a.anchorId)),locations=new Set((library.musicLocations??=[]).map(p=>p.id));
let addedTracks=0,addedLinks=0;
for(const c of candidates.filter(c=>source.albums.indexOf(c.album)<batch[2])){
 const {album,track:t,classification:r}=c,id='netease:'+t.neteaseId,placeIds=[];
 for(const code of r.areaCodes.length?r.areaCodes:[null]){
  const area=map.areas.find(a=>a.code===code),root=area?map.areas.find(a=>a.id===area.parentId):null;
  const pid=`ost-place:${album.neteaseAlbumId}:${t.neteaseId}:${area?.id??'unknown'}`;placeIds.push(pid);
  if(!locations.has(pid)){
   locations.add(pid);library.musicLocations.push({id:pid,name:r.terms.length?r.terms.join('、'):(t.originText.replaceAll('\n','；').trim().replace(/^\/$/,'')||album.title+' · 出处待补').slice(0,220),country:root?.name??'',areaId:area?.id??null,areaCode:code,kind:r.kind==='scene'?'place':'scene',sourceUrl:album.wikiUrl,notes:r.reason});
  }
 }
 if(!byTrack.has(id)){
  const track={id,title:t.title,artists:t.artists,composers:t.composers.length?t.composers:null,album:album.neteaseTitle,releaseDate:album.releaseDate,durationSeconds:t.durationSeconds,description:'网易官方专辑元数据与BWIKI出处。地点均为待校对候选，神像归档不代表实际播放。',personalNote:'',neteaseId:t.neteaseId,neteaseEncryptedId:t.neteaseEncryptedId,sourceUrl:'https://music.163.com/song?id='+t.neteaseId,
   sceneInfo:{wikiTitle:t.wikiTitle,englishTitle:t.englishTitle,discNumber:t.discNumber,discTitle:t.discTitle,trackNumber:t.trackNumber,originText:t.originText,mainRegions:r.countries,musicLocationIds:placeIds,wikiSourceUrl:album.wikiUrl,wikiRevisionId:String(album.wikiRevision),metadataNotes:[source.caveat,r.reason,...(!t.composers.length?['逐曲作曲证据缺失，保留空值，不从艺人推定。']:[]),...(source.conflicts.some(x=>x.id===t.neteaseId)?['Wiki与网易标题存在差异，双原文保留，见批量来源冲突记录。']:[])]}};
  library.tracks.push(track);byTrack.set(id,track);addedTracks++;
 }
 for(const p of r.points){
  assert(!bannedArea(p.areaCode));const key=id+'|'+p.id;
  // Manual edits remain an independent overlay; keeping baseline evidence makes Restore possible.
  if(edges.has(key))continue;
  edges.add(key);library.associations.push({id:`ost:${t.neteaseId}:${p.sourceId}`,trackId:id,anchorId:p.id,evidenceStatus:'pending',matchType:r.method,evidenceNote:`出处：${t.originText||'未提供'}。${r.reason}`,sourceUrl:album.wikiUrl});addedLinks++;
 }
}
assert.equal(new Set(library.tracks.map(t=>t.id)).size,library.tracks.length);
assert.equal(new Set(library.associations.map(a=>a.trackId+'|'+a.anchorId)).size,library.associations.length);
const all=candidates.filter(c=>byTrack.has('netease:'+c.track.neteaseId)).map(c=>({album:c.album.title,id:'netease:'+c.track.neteaseId,title:c.track.title,originText:c.track.originText,category:c.classification.kind,countries:c.classification.countries,areaCodes:c.classification.areaCodes,matchedTerms:c.classification.terms,matchType:c.classification.method??null,
 anchorIds:c.classification.points.filter(p=>!edits.edits.some(e=>e.trackId==='netease:'+c.track.neteaseId&&e.anchorId===p.id&&e.action==='remove')).map(p=>p.id),reason:c.classification.reason}));
const review={schemaVersion:1,capturedOn:source.capturedOn,batches:batches.filter(b=>b[2]<=batch[2]).map(b=>({name:b[0],albums:source.albums.slice(b[1],b[2]).map(a=>a.title),tracks:source.albums.slice(b[1],b[2]).reduce((n,a)=>n+a.tracks.length,0)})),summary:{totalTracks:library.tracks.length,totalAssociations:library.associations.length,newTracks:all.length,newAssociations:library.associations.filter(a=>a.id.startsWith('ost:')).length,unlocated:all.filter(x=>!x.countries.length).length,withoutPoint:all.filter(x=>!x.anchorIds.length).length,specialMaps:all.filter(x=>x.category==='special-map').length,missingOrigin:all.filter(x=>!x.originText.trim()||/^[\s/—-]+$/.test(x.originText)).length,limitedBattleWithoutPoint:all.filter(x=>x.category==='battle-limited'&&!x.anchorIds.length).length,sourceConflicts:source.conflicts.length},tracks:all};
async function saveAtomic(path,content,expected){
 const previous=await fs.readFile(path,'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(expected!==undefined)assert.equal(previous,expected,'导入期间曲库被修改，拒绝覆盖');
 if(previous===content)return;
 const temp=path+`.import-${process.pid}.tmp`;
 try{await fs.writeFile(temp,content,{flag:'wx'});await fs.rename(temp,path);}finally{await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
await saveAtomic('public/data/music-library.json',JSON.stringify(library,null,2)+'\n',originalLibraryText);
await fs.mkdir('data/review',{recursive:true});await saveAtomic('data/review/ost-association-review.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({batch:through,addedTracks,addedLinks,...review.summary,libraryBytes:Buffer.byteLength(JSON.stringify(library,null,2))},null,2));
