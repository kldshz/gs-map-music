import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateAssociations,classifyOne,category} from '../../scripts/lib/ost-associations.mjs';
import {matchesScope} from '../../scripts/lib/geography.mjs';
import {auditCoverage} from '../../scripts/audit-anchor-music.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const map=read('public/data/kongying-map.json'),library=read('public/data/music-library.json'),review=read('data/review/geography-reclassification.json');
const empty={tracks:[],associations:[]};
const sceneAt=id=>library.associations.filter(a=>a.anchorId===id&&a.matchType!=='region-archive'&&category({...library.tracks.find(t=>t.id===a.trackId).sceneInfo,id:a.trackId})==='scene');

test('二级有专曲优先专曲，无专曲回退一级；战斗曲不会抢占常态覆盖',()=>{
 const tracks=[{neteaseId:'1',originText:'麓阳书院（解放后）'},{neteaseId:'2',originText:'空之神殿1'},{neteaseId:'3',originText:'蒙德战斗'}];
 const cs=generateAssociations({albums:[{title:'风与牧歌之城',tracks}]},map,empty);
 const temple=map.anchors.filter(a=>a.areaCode==='A:MD:SHENDIAN'),special=temple.filter(a=>a.geography.secondary==='麓阳书院');
 assert(special.length>0);assert.deepEqual(cs[0].classification.points.map(a=>a.id).sort(),special.map(a=>a.id).sort());
 for(const a of temple)assert.equal(cs[1].classification.points.some(p=>p.id===a.id),!special.some(p=>p.id===a.id));
 assert(cs[1].classification.points.some(a=>a.geography.secondary));assert(cs[2].classification.points.every(a=>a.areaCode!=='A:MD:SHENDIAN'));
});

test('空之神殿父目录不重复，20点有常态；旧日之海与沉玉谷父范围覆盖全部细分',()=>{
 const temple=map.anchors.filter(a=>a.areaCode==='A:MD:SHENDIAN');assert.equal(temple.length,20);
 for(const a of temple){assert.equal(a.geography.primary,'空之神殿');assert(!a.geography.secondary?.startsWith('空之神殿'));assert(sceneAt(a.id).length);}
 assert.equal(map.anchors.find(a=>a.id==='kongying:116354').geography.secondary,null);
 assert.equal(map.anchors.find(a=>a.id==='kongying:116365').geography.secondary,'麓阳书院');
 for(const code of ['A:FD:ANCIENT_SEA','A:LY:CHENYUGU'])for(const a of map.anchors.filter(a=>a.areaCode===code))assert(sceneAt(a.id).length);
 assert(matchesScope(map.anchors.find(a=>a.id==='kongying:67195'),{country:'璃月',primary:'沉玉谷',secondary:null}));
});

test('野外回退只在对应地图/介质内；翘枝崖的第二行出处不丢失',()=>{
 for(const id of ['kongying:60457','kongying:48774','kongying:84655','kongying:115468'])assert(sceneAt(id).length);
 const land=classifyOne({title:'白露澈明之泉'},{neteaseId:'test-land',originText:'枫丹地域(白天)'},map);
 const water=classifyOne({title:'白露澈明之泉'},{neteaseId:'test-water',originText:'枫丹(水中)'},map);
 assert(land.points.length);assert(water.points.length);
 assert(land.points.every(p=>p.country==='枫丹'&&!/水下/.test(p.content)&&p.areaCode!=='A:FD:ANCIENT_SEA'));
 assert(water.points.every(p=>p.country==='枫丹'&&/水下/.test(p.content)&&p.areaCode!=='A:FD:ANCIENT_SEA'));
});

test('55原神像全部保留，新月7点来自实际来源；除特殊地图，每首曲都有点位存储',()=>{
 const added=read('data/sources/new-moon-statues.json');assert.equal(added.anchors.length,7);
 assert.equal(map.anchors.filter(a=>a.kind==='statue').length,62);
 for(const a of added.anchors){const current=map.anchors.find(p=>p.id===a.id);assert.deepEqual(current.position,a.position);assert.equal(current.content,a.content);assert.equal(current.kind,'statue');}
 for(const country of ['蒙德','璃月','稻妻','须弥','枫丹','纳塔','挪德卡莱','至冬']){
  const ids=new Set(map.anchors.filter(a=>a.kind==='statue'&&a.country===country).map(a=>a.id));assert(ids.size);
  assert(library.associations.some(a=>a.matchType==='region-archive'&&ids.has(a.anchorId)));
 }
 for(const c of review.classifications){if(c.category==='special-map')assert.equal(c.anchorIds.length,0);else assert(c.anchorIds.length,c.title);}
 assert.equal(review.summary.withoutPoint,85);
});

test('未匹配Boss/角色及混合回顾专辑只归档神像，不算播放覆盖，不伪称已核实',()=>{
 for(const name of ['冰封交响曲','六轮一露狂诗曲','游击骑士']){
  const c=review.classifications.find(c=>c.title===name);assert.equal(c.method,'region-archive');
  for(const id of c.anchorIds){assert.equal(map.anchors.find(p=>p.id===id).kind,'statue');assert(library.associations.some(a=>a.trackId===c.trackId&&a.anchorId===id&&a.matchType==='region-archive'&&a.evidenceStatus==='pending'));}
 }
 const c=review.classifications.find(c=>c.title==='游击骑士');assert(c.archiveBasis);assert.deepEqual(c.scopes.map(s=>s.country),['蒙德','璃月']);
 const coverage=auditCoverage(map,library,read('data/association-edits.json'));
 for(const p of coverage.missingScene)assert(!sceneAt(p.id).length);
});

test('人工删除专曲后一级回退可生效，同时保留原关系供恢复',()=>{
 const point=map.anchors.find(a=>a.geography.secondary==='麓阳书院');
 const tracks=[{id:'netease:1',neteaseId:'1',originText:'麓阳书院'},{id:'netease:2',neteaseId:'2',originText:'空之神殿1'}];
 const cs=generateAssociations({albums:[{title:'风与牧歌之城',tracks}]},map,empty,{removedPairs:new Set(['netease:1|'+point.id])});
 assert(cs[0].classification.points.some(a=>a.id===point.id));assert(cs[1].classification.points.some(a=>a.id===point.id));
 const other=map.anchors.find(a=>a.geography.secondary==='麓阳书院'&&a.id!==point.id);assert(!cs[1].classification.points.some(a=>a.id===other.id));
});
