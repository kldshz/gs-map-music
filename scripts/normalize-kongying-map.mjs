import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const raw=JSON.parse(await fs.readFile('.local/map-region-extract/anchors-full.json','utf8'));
const areas=raw.areas.map(a=>({id:a.id,name:a.name,code:a.code,parentId:a.parentId,isFinal:a.isFinal,hiddenFlag:a.hiddenFlag,sortIndex:a.sortIndex}));
const itemMap=new Map(raw.items.map(i=>[i.id,i]));
const areaMap=new Map(areas.map(a=>[a.id,a]));
const iconMap=new Map(raw.icons.record.map(i=>[i.id,i.url]));
const anchors=raw.markers.map(p=>{
 const items=p.itemList.map(i=>itemMap.get(i.itemId)).filter(Boolean);
 if(items.length!==1)throw new Error('Ambiguous or missing marker item '+p.id);
 const item=items[0],area=areaMap.get(item.areaId),country=areaMap.get(area.parentId);
 const position=p.position?.split(',').map(Number);
 if(position?.length!==2||position.some(x=>!Number.isFinite(x)))throw new Error('Invalid point '+p.id);
 let extra=p.extra??{};if(typeof extra==='string')extra=JSON.parse(extra);
 return {id:'kongying:'+p.id,sourceId:p.id,name:p.markerTitle||item.name,kind:item.name==='七天神像'?'statue':'waypoint',
  areaId:area.id,areaCode:area.code,country:country?.name??'',areaName:area.name,content:p.content??'',position,
  underground:!!extra.underground?.is_underground,layerValues:extra.underground?.region_levels??[],iconUrl:iconMap.get(item.iconId)??null,
  sourceUrl:'https://v3.yuanshen.site/',itemId:item.id,
  version:p.version,hiddenFlag:p.hiddenFlag,sourceUpdateTime:p.updateTime};
});
if(new Set(anchors.map(a=>a.id)).size!==anchors.length)throw new Error('Duplicate point id');
const snapshot={schemaVersion:1,capturedOn:raw.capturedOn??'2026-10-07',upstreamCommit:'0e80dd090329cb4964360ef42d2ed6016cf7cc15',
 sources:{areas:'https://cloud.yuanshen.site/api/area/get/list',items:'https://cloud.yuanshen.site/api/item/get/list',markers:'https://cloud.yuanshen.site/api/marker/get/list_byid',config:'https://assets.yuanshen.site/webapp.json'},
 configSha256:crypto.createHash('sha256').update(JSON.stringify(raw.config)).digest('hex'),areas,anchors,tiles:raw.config.tiles,plugins:raw.config.plugins};
await fs.mkdir('public/data',{recursive:true});
await fs.writeFile('public/data/kongying-map.json',JSON.stringify(snapshot)+'\n');
// Do not overwrite user-supplied music when refreshing source map data.
try{await fs.access('public/data/music-library.json');}catch{await fs.writeFile('public/data/music-library.json',JSON.stringify({schemaVersion:1,tracks:[],associations:[]},null,2)+'\n');}
console.log('Validated snapshot',anchors.length,'waypoints',anchors.filter(a=>a.kind==='waypoint').length,'statues',anchors.filter(a=>a.kind==='statue').length,'bytes',JSON.stringify(snapshot).length);
