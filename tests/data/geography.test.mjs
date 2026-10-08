import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeCatalog,classifyAnchor,matchesScope} from '../../scripts/lib/geography.mjs';
import {generateAssociations,isCity,category} from '../../scripts/lib/ost-associations.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const map=read('public/data/kongying-map.json'),library=read('public/data/music-library.json'),review=read('data/review/geography-reclassification.json');
const byAnchor=new Map(map.anchors.map(a=>[a.id,a]));
test('官方呈现地标转换的三处控制点误差有界；仍标近似，不能用作边界',()=>{
 const source=read('data/sources/official-map-labels.json');assert.equal(source.transform.status,'approximate');
 assert.equal(source.labels.filter(l=>l.tier==='primary').length,63);assert.equal(source.labels.filter(l=>l.tier==='secondary').length,229);
 for(const c of source.transform.controls){const p=byAnchor.get(c.anchorId).position;const estimate=c.pixel.map((px,i)=>(c.center[i]+px-c.viewport[i]/2)*source.transform.scale+source.transform.offset[i]);assert(Math.hypot(p[0]-estimate[0],p[1]-estimate[1])<40);}
});
test('121680归巡猎者木屋，121678二级留空；远处/歧义/地下不强制地表最近邻',()=>{
 assert.equal(byAnchor.get('kongying:121680').geography.secondary,'巡猎者木屋');assert.equal(byAnchor.get('kongying:121678').geography.secondary,null);
 const catalog=makeCatalog(map),base=byAnchor.get('kongying:121680');
 assert(catalog.primary.every(l=>['蒙德','璃月','稻妻','须弥','枫丹','纳塔','挪德卡莱','至冬'].includes(l.country)));
 assert.equal(catalog.secondaries.find(l=>l.name==='清泉镇').country,'蒙德');
 for(const p of map.anchors.filter(a=>a.content.includes('【蒙德 清泉镇】')))assert.equal(p.geography.primary,'苍风高地');
 const fake={...base,id:'test-only',content:'【至冬 古兽冰原】',position:[-9000,-11000]};assert.equal(classifyAnchor(fake,catalog).secondary,null);
 const wood=catalog.secondaries.find(l=>l.name==='巡猎者木屋');
 const near={...fake,position:wood.position};assert.equal(classifyAnchor(near,catalog).secondary,'巡猎者木屋');
 assert.equal(classifyAnchor({...near,underground:true},catalog).secondary,null);
 const crowded={...catalog,secondaries:[...catalog.secondaries,{...wood,name:'测试同距离地标'}]};assert.equal(classifyAnchor(near,crowded).secondary,null);
 for(const a of map.anchors){assert.equal(a.geography.evidenceStatus,'pending');if(a.geography.distance!==null)assert(a.geography.distance<=350);}
});
test('柔灯港专曲只能落在柔灯港；逐浪野/虚海望的音乐不进入杜南纳',()=>{
 for(const name of ['柔灯港','逐浪野','虚海望']){
  const tracks=review.classifications.filter(t=>t.originText.includes(name)&&t.category==='scene');assert(tracks.length>0);
  for(const t of tracks)for(const id of t.anchorIds){const g=byAnchor.get(id).geography;if(name==='柔灯港'){assert.equal(g.secondary,'柔灯港');assert.equal(g.primary,'伊黎耶林区');}else assert.notEqual(g.primary,'杜南纳深坑');}
 }
});
test('所有精细地点关系都遵循统一目录；特殊地图/无出处不扩散，来源与评价保持',()=>{
 for(const c of review.classifications){
  if(c.category==='special-map')assert.equal(c.anchorIds.length,0);
  if(c.method==='region-archive')for(const id of c.anchorIds)assert.equal(byAnchor.get(id).kind,'statue');
  if(c.method==='place-match'&&c.scopes.some(s=>s.secondary))for(const id of c.anchorIds)assert(c.scopes.some(s=>matchesScope(byAnchor.get(id),s)));
 }
 const pairs=library.associations.map(a=>a.trackId+'|'+a.anchorId);assert.equal(new Set(pairs).size,pairs.length);assert(library.associations.every(a=>a.evidenceStatus==='pending'));
 assert.equal(library.tracks.length,1663);assert(library.tracks.every(t=>/^netease:\d+$/.test(t.id)));
});
test('常态/战斗独立优先级：精确场景不阻挡通用战斗，独占Boss阻挡对应类别',()=>{
 const tracks=[{neteaseId:'1',originText:'风龙废墟',discTitle:''},{neteaseId:'2',originText:'蒙德野外',discTitle:''},{neteaseId:'3',originText:'蒙德战斗',discTitle:''}];
 const make=tracks=>generateAssociations({albums:[{title:'测试仅验证规则',tracks}]},map,{tracks:[],associations:[]});
 let cs=make(tracks);const ruins=map.anchors.filter(a=>a.geography.secondary==='风龙废墟');assert(ruins.length>0);
 assert(cs[0].classification.points.length);assert(cs[1].classification.points.every(a=>!ruins.some(r=>r.id===a.id)));assert(cs[2].classification.points.some(a=>ruins.some(r=>r.id===a.id)));
 cs=make([...tracks,{neteaseId:'4',originText:'风魔龙战斗',discTitle:''}]);assert(cs[3].classification.points.length);assert(cs[2].classification.points.every(a=>!ruins.some(r=>r.id===a.id)));
 assert(cs[2].classification.points.every(a=>!isCity(a)));
});
test('风息山/沉玉谷补战斗；悠悠、旧日之海、空之神殿不借用国家战斗曲',()=>{
 const battle=new Set(library.associations.filter(a=>category({...library.tracks.find(t=>t.id===a.trackId).sceneInfo,id:a.trackId}).startsWith('battle-')).map(a=>a.anchorId));
 for(const code of ['A:MD:FENGXISHAN','A:LY:CHENYUGU'])for(const p of map.anchors.filter(p=>p.areaCode===code&&!isCity(p)&&p.hiddenFlag!==3))assert(battle.has(p.id));
 for(const code of ['A:NT:NATA5','A:FD:ANCIENT_SEA','A:MD:SHENDIAN'])for(const p of map.anchors.filter(p=>p.areaCode===code))assert(!battle.has(p.id));
});
