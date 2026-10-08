import fs from 'node:fs/promises';
import {category,isCity,bannedArea,pointHeader} from './lib/ost-associations.mjs';

export function associationCategory(track,association){
 const known=category({...track?.sceneInfo,id:track?.id});
 if(known.startsWith('battle-')||known==='task')return known;
 if(association.evidenceNote?.startsWith('专辑分碟推定：常态。'))return 'scene';
 if(association.evidenceNote?.startsWith('专辑分碟推定：战斗。'))return 'battle-generic';
 return known;
}

export function auditCoverage(map,library,edits){
 const tracks=new Map(library.tracks.map(t=>[t.id,t]));
 const links=new Map(library.associations.map(a=>[a.trackId+'|'+a.anchorId,a]));
 for(const e of edits.edits){const key=e.trackId+'|'+e.anchorId;if(e.action==='remove')links.delete(key);else if(!links.has(key))links.set(key,{trackId:e.trackId,anchorId:e.anchorId,matchType:'manual'});}
 const byAnchor=new Map();
 for(const a of links.values()){if(a.matchType==='region-archive')continue;const t=tracks.get(a.trackId);if(!t)continue;const list=byAnchor.get(a.anchorId)??[];list.push({trackId:t.id,category:associationCategory(t,a)});byAnchor.set(a.anchorId,list);}
 const anchors=map.anchors.filter(p=>p.kind==='waypoint'&&p.hiddenFlag!==3&&!bannedArea(p.areaCode)&&!isCity(p)).map(p=>{
  const list=byAnchor.get(p.id)??[];
  return {id:p.id,areaCode:p.areaCode,place:pointHeader(p),sceneTrackIds:list.filter(t=>t.category==='scene').map(t=>t.trackId),battleTrackIds:list.filter(t=>t.category.startsWith('battle-')).map(t=>t.trackId)};
 });
 const missingScene=anchors.filter(p=>!p.sceneTrackIds.length),missingBattle=anchors.filter(p=>!p.battleTrackIds.length);
 return {summary:{nonCityWaypoints:anchors.length,withBoth:anchors.filter(p=>p.sceneTrackIds.length&&p.battleTrackIds.length).length,battleOnly:anchors.filter(p=>!p.sceneTrackIds.length&&p.battleTrackIds.length).length,missingScene:missingScene.length,missingBattle:missingBattle.length},missingScene,missingBattle};
}

if(process.argv[1]?.endsWith('audit-anchor-music.mjs')){
 const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
 const result=auditCoverage(await read('public/data/kongying-map.json'),await read('public/data/music-library.json'),await read('data/association-edits.json'));
 await fs.writeFile('data/review/anchor-music-coverage.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result.summary,null,2));
}
