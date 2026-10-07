import type { MapSnapshot, MusicLibrary, MusicTrack, TrackAnchor } from './contracts';
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
export function validateLibrary(value:unknown,anchorIds:Set<string>):MusicLibrary {
  if(!record(value)||value.schemaVersion!==1||!Array.isArray(value.tracks)||!Array.isArray(value.associations))throw new Error('曲库应为 schemaVersion:1、tracks 和 associations 数组');
  if(value.tracks.length>10000||value.associations.length>50000)throw new Error('曲库超过导入上限');
  unique(value.tracks,'曲目');unique(value.associations,'关联');const ids=new Set<string>();
  for(const t of value.tracks){
    if(!record(t)||!text(t.title)||!t.title.trim()||!texts(t.artists)||!(t.composers===null||texts(t.composers))||!nullable(t.album)||!nullable(t.releaseDate)||!(t.durationSeconds===null||(typeof t.durationSeconds==='number'&&Number.isFinite(t.durationSeconds)&&t.durationSeconds>0))||!text(t.description)||!(t.neteaseId===null||(text(t.neteaseId)&&/^\d+$/.test(t.neteaseId)))||!url(t.sourceUrl))throw new Error(`曲目字段缺失或无效：${t?.id??'未知ID'}`);
    ids.add(t.id as string);
  }
  const edges=new Set<string>();
  for(const a of value.associations){
    if(!record(a)||!ids.has(String(a.trackId))||!anchorIds.has(String(a.anchorId))||!['pending','verified'].includes(String(a.evidenceStatus))||!text(a.evidenceNote)||!url(a.sourceUrl))throw new Error(`关联无效或引用不存在：${a?.id??'未知ID'}`);
    if(a.evidenceStatus==='verified'&&(!a.evidenceNote.trim()||!a.sourceUrl))throw new Error('已核实关联必须有证据说明和来源URL');
    const edge=JSON.stringify([a.trackId,a.anchorId]);if(edges.has(edge))throw new Error('重复曲目—点位关联');edges.add(edge);
  }
  return {schemaVersion:1,tracks:value.tracks.map(t=>({id:t.id,title:t.title,artists:t.artists,composers:t.composers,album:t.album,releaseDate:t.releaseDate,durationSeconds:t.durationSeconds,description:t.description,neteaseId:t.neteaseId,sourceUrl:t.sourceUrl} as MusicTrack)),
    associations:value.associations.map(a=>({id:a.id,trackId:a.trackId,anchorId:a.anchorId,evidenceStatus:a.evidenceStatus,evidenceNote:a.evidenceNote,sourceUrl:a.sourceUrl} as TrackAnchor))};
}
