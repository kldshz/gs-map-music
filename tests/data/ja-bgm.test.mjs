import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateAssociations,isCity,originalOrigin,hasOrigin,category} from '../../scripts/lib/ost-associations.mjs';
import {jaEvidence,supplementalKind} from '../../scripts/lib/ja-bgm-evidence.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/ost-bulk-source.json'),map=read('public/data/kongying-map.json'),library=read('public/data/music-library.json');
const candidates=generateAssociations(source,map,library);
test('日文同曲匹配不跨专辑，原BWIKI出处与人工评价保持',()=>{
 assert.equal(jaEvidence.size,read('data/sources/ja-bgm-crosscheck.json').tracks.length);
 for(const e of jaEvidence.values()){const t=library.tracks.find(t=>t.id===e.trackId);assert(t.album.startsWith('原神-'+e.album+' '));}
 for(const album of source.albums)for(const original of album.tracks){const t=library.tracks.find(t=>t.id==='netease:'+original.neteaseId);assert.equal(originalOrigin(t.sceneInfo),original.originText);assert(t.sceneInfo.originText.trim());}
});
test('枫丹缺出处战斗被识别；冰风组曲保持限定，不散布全域',()=>{
 const general=candidates.find(c=>c.track.englishTitle==='Rondeau des fleurs et des rapieres').classification;
 assert.equal(general.kind,'battle-generic');assert(general.points.length>50);assert(general.points.every(p=>p.country==='枫丹'&&!isCity(p)));
 const boss=candidates.find(c=>c.track.englishTitle==='Aubade of Coppelia').classification;
 assert.equal(boss.kind,'battle-limited');assert.notEqual(boss.method,'region-scope');
});
test('层岩通用曲与限定曲分开，渊下宫战斗不扩散到地表岛屿',()=>{
 const general=candidates.find(c=>c.track.englishTitle==='Tremor of Menace').classification;
 assert.equal(general.kind,'battle-generic');assert(general.points.every(p=>['A:LY:CENGYAN','A:LY:CENGYAN_UG'].includes(p.areaCode)));
 const limited=candidates.find(c=>c.track.englishTitle==='Irresistible Force').classification;assert.equal(limited.kind,'battle-limited');assert.notEqual(limited.method,'region-scope');
 const abyss=candidates.find(c=>c.track.englishTitle==='Combat Beneath the Waves').classification;
 assert.equal(abyss.kind,'battle-generic');assert(abyss.points.length);assert(abyss.points.every(p=>p.areaCode==='A:DQ:YUANXIAGONG'));
});
test('Boss与试炼不能仅凭战斗分碟推定通用，至冬/圣山范围正确',()=>{
 const night=[...jaEvidence.values()].find(e=>e.englishTitle==='Grim Is the Night');assert.equal(supplementalKind(night),'battle-limited');
 const winter=[...jaEvidence.values()].find(e=>e.englishTitle==='Triumph on the Ice');assert.equal(supplementalKind(winter),'battle-generic');
});
test('日文仅列任务/地点不抹掉BWIKI明确战斗属性，冲突留供校对',()=>{
 const e=[...jaEvidence.values()].find(e=>e.englishTitle==='No Turning Back');assert(e.conflict);assert.equal(supplementalKind(e),'battle-limited');
 const c=candidates.find(c=>c.track.englishTitle==='No Turning Back');assert.equal(c.classification.kind,'battle-limited');assert.notEqual(c.classification.method,'region-scope');
});

test('补充出处中文可见，无出处仅神像归档；璃月纳塔战斗扩展到指定地区',()=>{
 for(const t of library.tracks){
  const e=jaEvidence.get(t.id),raw=originalOrigin(t.sceneInfo);
  if((!raw.trim()||/^[\s/—-]+$/.test(raw))&&e?.placeJa.trim()){assert(t.sceneInfo.originText.startsWith('日文Wiki补充（中文）：'));assert(!/[ぁ-んァ-ヶ]/.test(t.sceneInfo.originText));}
  if(!hasOrigin({...t.sceneInfo,id:t.id})){assert.equal(t.sceneInfo.originText,'缺少出处');assert(library.associations.filter(a=>a.trackId===t.id).every(a=>map.anchors.find(p=>p.id===a.anchorId).kind==='statue'));}
 }
 for(const code of ['A:LY:CHENYUGU','A:NT:NATA5'])for(const p of map.anchors.filter(p=>p.areaCode===code&&!isCity(p)&&p.hiddenFlag!==3)){assert(library.associations.some(a=>a.anchorId===p.id&&category({...library.tracks.find(t=>t.id===a.trackId).sceneInfo,id:a.trackId})==='battle-generic'));}
 const e=[...jaEvidence.values()].find(e=>e.role==='battle');assert.equal(category({id:e.trackId,originText:'非战斗场景',discTitle:''}),'scene');
});
