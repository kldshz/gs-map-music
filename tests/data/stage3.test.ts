import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary, validateSnapshot } from '../../src/domain/validation';
import { canonicalToSource, resolveMap, sourceToCanonical, tileUrl } from '../../src/adapters/kongying-config';
import { useExplorer } from '../../src/services/explorer';

const snapshot=validateSnapshot(JSON.parse(await readFile('public/data/kongying-map.json','utf8')));
const ids=new Set(snapshot.anchors.map(a=>a.id));
const library={schemaVersion:1,tracks:[{id:'test-fixture-1',title:'自动化测试条目（无真实音乐）',artists:[],composers:null,album:'测试专辑',releaseDate:null,durationSeconds:null,description:'仅校验元数据导入',neteaseId:null,sourceUrl:null}],
  associations:[{id:'test-edge-1',trackId:'test-fixture-1',anchorId:snapshot.anchors.find(a=>a.kind==='statue')!.id,evidenceStatus:'pending',evidenceNote:'仅测试，未核实',sourceUrl:null}]};
test('真实快照只有传送锚点/神像，空曲库仍可导入',async()=>{
  assert.equal(snapshot.anchors.length,877);assert.equal(snapshot.anchors.filter(a=>a.kind==='waypoint').length,822);assert.equal(snapshot.anchors.filter(a=>a.kind==='statue').length,55);
  const empty=validateLibrary({schemaVersion:1,tracks:[],associations:[]},ids);assert.equal(empty.tracks.length,0);assert.equal(empty.associations.length,0);
  const zd=snapshot.anchors.filter(a=>a.areaCode==='A:ZD:ZHIDONG1');assert.equal(zd.length,66);
  assert(snapshot.anchors.every(a=>a.position));
});
test('每个地区解析实际继承配置，3个独立控制坐标往返及负索引URL',()=>{
  for(const area of snapshot.areas.filter(a=>a.isFinal)){
    const map=resolveMap(snapshot,area.code);
    for(const point of [[0,0],[1372.25,-2956.5],[-9760,-11529]] as [number,number][]){
      const canonical=sourceToCanonical(point,map);assert.deepEqual(canonicalToSource(canonical,map),point);
    }
  }
  const zd=resolveMap(snapshot,'A:ZD:ZHIDONG1');assert.equal(zd.code,'twt672');assert.deepEqual(zd.tilesOffset,[-17408,-10240]);
  assert.equal(tileUrl('twt672',-2,-7,-5),'https://assets.yuanshen.site/tiles_twt672/11/-7_-5.png');
  assert.throws(()=>canonicalToSource({mapId:'different',x:0,y:0},zd),/另一地图/);
  const broken=structuredClone(snapshot);broken.tiles['loop']={extend:'loop'};assert.throws(()=>resolveMap(broken,'loop'),/循环/);
});
test('允许未知元数据及同名不同ID、多对多与神像关联；不臆造作曲',()=>{
  const copy=structuredClone(library);copy.tracks.push({...copy.tracks[0],id:'test-fixture-2'});
  copy.associations.push({...copy.associations[0],id:'test-edge-2',trackId:'test-fixture-2'});
  copy.associations.push({...copy.associations[0],id:'test-edge-3',anchorId:snapshot.anchors.find(a=>a.kind==='waypoint')!.id});
  const result=validateLibrary(copy,ids);assert.equal(result.tracks.length,2);assert.equal(result.associations.length,3);assert.equal(result.tracks[0].composers,null);
});
test('拒绝错误引用/重复ID/重复关系/伪证据/脚本URL',()=>{
  const broken=structuredClone(library);broken.associations[0].anchorId='missing';assert.throws(()=>validateLibrary(broken,ids),/引用不存在/);
  const duplicate=structuredClone(library);duplicate.tracks.push({...duplicate.tracks[0]});assert.throws(()=>validateLibrary(duplicate,ids),/重复/);
  const edge=structuredClone(library);edge.associations.push({...edge.associations[0],id:'new'});assert.throws(()=>validateLibrary(edge,ids),/重复曲目/);
  const evidence=structuredClone(library);evidence.associations[0].evidenceStatus='verified';assert.throws(()=>validateLibrary(evidence,ids),/证据/);
  const script=structuredClone(library) as any;script.tracks[0].sourceUrl='javascript:alert(1)';assert.throws(()=>validateLibrary(script,ids),/字段/);
  const point=structuredClone(snapshot);point.anchors[0].position=[NaN,0];assert.throws(()=>validateSnapshot(point),/点位字段/);
  const cycle=structuredClone(snapshot);cycle.areas[0].parentId=cycle.areas[0].id;assert.throws(()=>validateSnapshot(cycle),/循环/);
  const mismatch=structuredClone(snapshot);mismatch.anchors[0].areaCode='wrong';assert.throws(()=>validateSnapshot(mismatch),/点位字段/);
});
test('业务搜索/区域点选/类型分层及无坐标/空结果处理，导入失败不丢旧数据',async()=>{
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async(input)=>new Response(JSON.stringify(String(input).includes('kongying-map')?snapshot:{schemaVersion:1,tracks:[],associations:[]}),{status:200,headers:{'Content-Type':'application/json'}});
  try{
    const e=useExplorer();await e.load();assert.equal(e.error.value,'');assert.equal(e.visibleAnchors.value.length,27);
    e.typeFilter.value='statue';assert.equal(e.visibleAnchors.value.length,4);
    e.query.value='不存在的地点';assert.equal(e.visibleAnchors.value.length,0);e.query.value='';
    await e.importLibrary(new File([JSON.stringify(library)],'test.json'));assert.equal(e.tracks.value.length,1);
    e.query.value='测试专辑';assert.equal(e.searchTracks.value.length,1);e.query.value='校验元数据';assert.equal(e.searchTracks.value.length,1);
    e.selectTrack('test-fixture-1');e.locateTrack();assert.equal(e.highlightedIds.value.length,1);
    e.query.value='不存在的点位';assert.equal(e.visibleAnchors.value.length,0);e.query.value='';
    e.selectAnchor(library.associations[0].anchorId);assert.equal(e.selectedAnchor.value?.kind,'statue');assert.equal(e.anchorTracks.value.length,1);
    await e.importLibrary(new File(['invalid-json'],'bad.json'));assert.match(e.importMessage.value,/导入失败/);assert.equal(e.tracks.value.length,1);
    e.selectArea('A:NT:NATA2');assert(e.layerOptions.value.some(o=>o.value==='LEGEND_SKYSERPENT_SHIP'));
    e.layerFilter.value='surface';assert(e.visibleAnchors.value.every(a=>!a.underground));
  }finally{globalThis.fetch=oldFetch;}
});
test('地图数据HTTP失败有错误状态，可重试',async()=>{
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:503});
  try{const e=useExplorer();await e.load();assert.match(e.error.value,/503/);assert.equal(e.loading.value,false);}finally{globalThis.fetch=oldFetch;}
});
test('稍后返回的初始曲库不能覆盖用户先完成的本地导入，地理分类经校验保留',async()=>{
  const oldFetch=globalThis.fetch;let release!:(response:Response)=>void;
  const response=new Promise<Response>(resolve=>{release=resolve});
  globalThis.fetch=async(input)=>String(input).includes('kongying-map')?new Response(JSON.stringify(snapshot)):response;
  try{
    const e=useExplorer(),load=e.load();
    while(!e.anchors.value.length)await new Promise(resolve=>setTimeout(resolve,0));
    await e.importLibrary(new File([JSON.stringify(library)],'fixture.json'));
    release(new Response(JSON.stringify({schemaVersion:1,tracks:[],associations:[]})));await load;
    assert.equal(e.tracks.value[0].id,'test-fixture-1');
    const full=JSON.parse(await readFile('public/data/music-library.json','utf8'));
    const cleaned=validateLibrary(full,ids,snapshot);assert.deepEqual(cleaned.tracks[0].sceneInfo?.geographicScopes,full.tracks[0].sceneInfo.geographicScopes);
    full.tracks[0].sceneInfo.geographicScopes=[{country:'蒙德',primary:null,secondary:'虚构层级'}];assert.throws(()=>validateLibrary(full,ids,snapshot),/地理分类/);
    const broken=structuredClone(snapshot);broken.anchors[0].geography!.country='错误国家';assert.throws(()=>validateSnapshot(broken),/地理分类/);
  }finally{globalThis.fetch=oldFetch;}
});
test('带统一目录的实际曲库可导出再导入，超过16MB拒绝且保留原库',async()=>{
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify(snapshot));
  try{
    const e=useExplorer();await e.load();
    const text=await readFile('public/data/music-library.json','utf8');await e.importLibrary(new File([text],'library.json'));
    assert.equal(e.tracks.value.length,1663);assert(e.tracks.value[0].sceneInfo?.geographicScopes);
    await e.importLibrary(new File([' '.repeat(16*1024*1024+1)],'large.json'));assert.match(e.importMessage.value,/超过16MB/);assert.equal(e.tracks.value.length,1663);
  }finally{globalThis.fetch=oldFetch;}
});

test('全部定位覆盖同瓦片集的不同地区，并提示独立地图的逐点入口',async()=>{
  const md=snapshot.anchors.find(a=>a.areaCode==='A:MD:MENGDE')!;
  const code=resolveMap(snapshot,md.areaCode).code;
  const same=snapshot.anchors.find(a=>a.areaCode!==md.areaCode&&resolveMap(snapshot,a.areaCode).code===code)!;
  const other=snapshot.anchors.find(a=>resolveMap(snapshot,a.areaCode).code!==code)!;
  const expanded={...structuredClone(library),associations:[md,same,other].map((a,i)=>({...library.associations[0],id:'cross-'+i,anchorId:a.id}))};
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async(input)=>new Response(JSON.stringify(String(input).includes('kongying-map')?snapshot:expanded),{status:200});
  try{
    const e=useExplorer();await e.load();e.selectTrack('test-fixture-1');e.locateTrack();
    assert.equal(e.highlightedIds.value.length,3);
    const visible=new Set(e.visibleAnchors.value.map(a=>a.id));assert(visible.has(md.id)&&visible.has(same.id));assert(!visible.has(other.id));
    assert.match(e.mapStatus.value,/另有1处位于独立地图/);
    e.selectAnchor(other.id);assert.equal(e.areaCode.value,other.areaCode);
  }finally{globalThis.fetch=oldFetch;}
});
