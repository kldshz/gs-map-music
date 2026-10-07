import type { MapSnapshot, MusicLibrary, MusicTrack, TrackAnchor, MusicLocation } from './contracts';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string';
const nullable=(v:unknown)=>v===null||text(v);
const texts=(v:unknown)=>Array.isArray(v)&&v.every(text);
const pair=(v:unknown)=>Array.isArray(v)&&v.length===2&&v.every(n=>typeof n==='number'&&Number.isFinite(n));
const url=(v:unknown)=>{if(v===null)return true;if(!text(v))return false;try{return ['http:','https:'].includes(new URL(v).protocol)}catch{return false}};
function unique(rows:unknown[],label:string){const keys=new Set();for(const row of rows){if(!record(row)||!text(row.id)||!row.id.trim())throw new Error(`${label}ID无效`);if(keys.has(row.id))throw new Error(`${label}ID重复：${row.id}`);keys.add(row.id)}}
export function validateSnapshot(value:unknown):MapSnapshot {
  if(!record(value)||value.schemaVersion!==1||!Array.isArray(value.areas)||!Array.isArray(value.anchors)||!record(value.tiles)||!record(value.plugins)||!text(value.capturedOn))throw new Error('地图资源包格式错误');
  const areaIds=new Set<number>(),codes=new Set<string>();
  for(const a of value.areas){
    if(!record(a)||!Number.isInteger(a.id)||!text(a.name)||!text(a.code)||!Number.isInteger(a.parentId)||typeof a.isFinal!=='boolean'||typeof a.hiddenFlag!=='number')throw new Error('地区字段无效');
    if(areaIds.has(a.id as number)||codes.has(a.code))throw new Error('重复地区ID或代码');areaIds.add(a.id as number);codes.add(a.code);
  }
  const parentIds = new Map(value.areas.map(a => [a.id, a.parentId]));
  for(const a of value.areas){
    const seen = new Set<number>();
    let current = a.id;
    while(current !== -1){
      if(seen.has(current))throw new Error('地区父链循环');
      if(!parentIds.has(current))throw new Error('地区父ID不存在');
      seen.add(current);current = parentIds.get(current)!;
    }
  }
  unique(value.anchors,'点位');
  for(const a of value.anchors){
    if(!record(a)||!text(a.name)||!Number.isInteger(a.sourceId)||!text(a.country)||!text(a.areaName)||!['waypoint','statue'].includes(String(a.kind))||!value.areas.some(area=>area.id===a.areaId&&area.code===a.areaCode)||!(a.position===null||pair(a.position))||!texts(a.layerValues)||typeof a.underground!=='boolean'||!text(a.content)||!text(a.sourceUrl)||!url(a.sourceUrl)||!url(a.iconUrl))throw new Error(`点位字段无效：${a?.id}`);
  }
  for(const [key,t] of Object.entries(value.tiles)){
    if(!record(t)||(t.extend!==undefined&&!text(t.extend)))throw new Error(`地图配置无效：${key}`);
    for(const field of ['center','size','tilesOffset'])if(t[field]!==undefined&&!pair(t[field]))throw new Error(`地图坐标配置无效：${key}`);
  }
  return value as unknown as MapSnapshot;
}
export function validateLibrary(value:unknown,anchorIds:Set<string>,snapshot?:MapSnapshot):MusicLibrary {
  if(!record(value)||value.schemaVersion!==1||!Array.isArray(value.tracks)||!Array.isArray(value.associations))throw new Error('曲库应为 schemaVersion:1、tracks 和 associations 数组');
  if(value.tracks.length>10000||value.associations.length>50000)throw new Error('曲库超过导入上限');
  unique(value.tracks,'曲目');unique(value.associations,'关联');const ids=new Set<string>();
  const locations = value.musicLocations??[];
  if(!Array.isArray(locations)||locations.length>10000)throw new Error('音乐地点目录无效');
  unique(locations,'音乐地点');
  for(const p of locations){
    if(!record(p)||!text(p.name)||!text(p.country)||!Number.isInteger(p.areaId)||!text(p.areaCode)||!['place','scene'].includes(String(p.kind))||!text(p.sourceUrl)||!url(p.sourceUrl)||!text(p.notes))throw new Error('音乐地点字段无效');
    if(snapshot&&!snapshot.areas.some(a=>a.id===p.areaId&&a.code===p.areaCode))throw new Error('音乐地点引用不存在的地区');
  }
  const locationIds=new Set(locations.map(p=>p.id));
  for(const t of value.tracks){
    if(!record(t)||!text(t.title)||!t.title.trim()||!texts(t.artists)||!(t.composers===null||texts(t.composers))||!nullable(t.album)||!nullable(t.releaseDate)||!(t.durationSeconds===null||(typeof t.durationSeconds==='number'&&Number.isFinite(t.durationSeconds)&&t.durationSeconds>0))||!text(t.description)||!(t.neteaseId===null||(text(t.neteaseId)&&/^\d+$/.test(t.neteaseId)))||!url(t.sourceUrl))throw new Error(`曲目字段缺失或无效：${t?.id??'未知ID'}`);
    ids.add(t.id as string);
    if(t.personalNote!==undefined&&(!text(t.personalNote)||t.personalNote.length>20000))throw new Error('个人评价格式无效或超过20000字');
    if(t.neteaseEncryptedId!==undefined&&t.neteaseEncryptedId!==null&&(!text(t.neteaseEncryptedId)||!/^[A-Fa-f0-9]{32}$/.test(t.neteaseEncryptedId)))throw new Error('网易加密ID格式无效');
    if(t.sceneInfo!==undefined){
      const s=t.sceneInfo;
      if(!record(s)||!text(s.wikiTitle)||!text(s.englishTitle)||!Number.isInteger(s.discNumber)||Number(s.discNumber)<1||!text(s.discTitle)||!Number.isInteger(s.trackNumber)||Number(s.trackNumber)<1||!text(s.originText)||!texts(s.mainRegions)||!texts(s.musicLocationIds)||!(s.musicLocationIds as string[]).every(id=>locationIds.has(id))||!text(s.wikiSourceUrl)||!url(s.wikiSourceUrl)||!text(s.wikiRevisionId)||!texts(s.metadataNotes))throw new Error('Wiki出处字段或地点引用无效');
    }
  }
  const edges=new Set<string>();
  for(const a of value.associations){
    if(!record(a)||!ids.has(String(a.trackId))||!anchorIds.has(String(a.anchorId))||!['pending','verified'].includes(String(a.evidenceStatus))||!text(a.evidenceNote)||!url(a.sourceUrl))throw new Error(`关联无效或引用不存在：${a?.id??'未知ID'}`);
    if(a.evidenceStatus==='verified'&&(!a.evidenceNote.trim()||!a.sourceUrl))throw new Error('已核实关联必须有证据说明和来源URL');
    if(a.matchType!==undefined&&!['place-match','parent-place-match','region-archive'].includes(String(a.matchType)))throw new Error('关联方式无效');
    if(a.matchType==='region-archive'&&a.evidenceStatus!=='pending')throw new Error('地区归档不能伪装成已核实播放地点');
    if(a.matchType==='region-archive'&&snapshot?.anchors.find(p=>p.id===a.anchorId)?.kind!=='statue'&&snapshot)throw new Error('地区归档必须挂载到神像');
    const edge=JSON.stringify([a.trackId,a.anchorId]);if(edges.has(edge))throw new Error('重复曲目—点位关联');edges.add(edge);
  }
  return {schemaVersion:1,tracks:value.tracks.map(t=>({id:t.id,title:t.title,artists:t.artists,composers:t.composers,album:t.album,releaseDate:t.releaseDate,durationSeconds:t.durationSeconds,description:t.description,neteaseId:t.neteaseId,sourceUrl:t.sourceUrl,
    ...(t.personalNote!==undefined?{personalNote:t.personalNote}:{}),...(t.neteaseEncryptedId!==undefined?{neteaseEncryptedId:t.neteaseEncryptedId}:{}),...(t.sceneInfo?{sceneInfo:{wikiTitle:t.sceneInfo.wikiTitle,englishTitle:t.sceneInfo.englishTitle,discNumber:t.sceneInfo.discNumber,discTitle:t.sceneInfo.discTitle,trackNumber:t.sceneInfo.trackNumber,originText:t.sceneInfo.originText,mainRegions:t.sceneInfo.mainRegions,musicLocationIds:t.sceneInfo.musicLocationIds,wikiSourceUrl:t.sceneInfo.wikiSourceUrl,wikiRevisionId:t.sceneInfo.wikiRevisionId,metadataNotes:t.sceneInfo.metadataNotes}}:{})} as MusicTrack)),
    associations:value.associations.map(a=>({id:a.id,trackId:a.trackId,anchorId:a.anchorId,evidenceStatus:a.evidenceStatus,evidenceNote:a.evidenceNote,sourceUrl:a.sourceUrl,...(a.matchType?{matchType:a.matchType}:{})} as TrackAnchor)),
    ...(locations.length?{musicLocations:locations.map(p=>({id:p.id,name:p.name,country:p.country,areaId:p.areaId,areaCode:p.areaCode,kind:p.kind,sourceUrl:p.sourceUrl,notes:p.notes} as MusicLocation))}:{})};
}
