// Adapted from Kongying Tavern map_front_v3/src/api/map.js, commit 0e80dd0.
// MulanPSL-2.0: license retained at public/licenses/KONGYING-MulanPSL-2.0.txt.
import type { MapPoint, MapSnapshot, ResolvedMap, TileConfig } from '../domain/contracts';

export function resolveMap(snapshot:MapSnapshot, areaCode:string):ResolvedMap {
  const seen=new Set<string>();
  function inherit(key:string):TileConfig {
    if(seen.has(key)) throw new Error(`地图配置继承循环：${key}`);
    seen.add(key);
    const own=snapshot.tiles[key];
    if(!own) throw new Error(`地图配置缺失：${key}`);
    const parent=own.extend?inherit(own.extend):{};
    return {...parent,...own,settings:{...parent.settings,...own.settings}};
  }
  const value=inherit(areaCode);
  if(!value.code) throw new Error('地图瓦片代码缺失');
  return {areaCode,code:value.code,center:value.center??[3568,6286],size:value.size??[12288,15360],tilesOffset:value.tilesOffset??[0,0],extension:value.extension??'png',
    settings:{center:[2576,1742],zoom:-4,minZoom:-4,maxZoom:2,...value.settings},plugin:snapshot.plugins[areaCode]??{}};
}
export function sourceToCanonical(position:[number,number], config:ResolvedMap):MapPoint {
  return {mapId:config.code,x:position[0]+config.center[0]-config.tilesOffset[0],y:position[1]+config.center[1]-config.tilesOffset[1]};
}
export function canonicalToSource(point:MapPoint, config:ResolvedMap):[number,number] {
  if(point.mapId!==config.code) throw new Error('坐标属于另一地图');
  return [point.x-config.center[0]+config.tilesOffset[0],point.y-config.center[1]+config.tilesOffset[1]];
}
export function tileUrl(code:string,z:number,x:number,y:number,extension='png') {
  if(!/^[a-zA-Z0-9_-]+$/.test(code)||!/^(png|jpg|webp)$/.test(extension))throw new Error('瓦片代码或格式无效');
  return `https://assets.yuanshen.site/tiles_${code}/${z+13}/${x}_${y}.${extension}`;
}
