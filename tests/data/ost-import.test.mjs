import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateAssociations,category,isCity,bannedArea} from '../../scripts/lib/ost-associations.mjs';
const source=JSON.parse(fs.readFileSync('data/sources/ost-bulk-source.json'));
const map=JSON.parse(fs.readFileSync('public/data/kongying-map.json'));
const library=JSON.parse(fs.readFileSync('public/data/music-library.json'));
const candidates=generateAssociations(source,map,library);
test('24张专辑官方ID/标题一一匹配；作曲缺失留空，重复caption与标题差异保留',()=>{
 assert.equal(source.albums.length,24);assert(!source.conflicts.some(c=>c.type==='song-match'));
 const seen=new Set();for(const a of source.albums){assert.equal(a.tracks.length,a.expectedTracks);assert.equal(a.unmatchedNetease.length,0);for(const t of a.tracks){assert.match(t.neteaseId,/^\d+$/);assert.match(t.neteaseEncryptedId,/^[A-Fa-f0-9]{32}$/);assert(!seen.has(t.neteaseId));seen.add(t.neteaseId);assert(!t.composers.includes('/'));}}
 assert(source.conflicts.some(c=>c.type==='album-version'));assert(source.conflicts.some(c=>c.type==='disc-caption'));
});
test('通用战斗覆盖非城市专属点位；限定Boss不扩散；来源未知战斗不猜全图',()=>{
 const general=candidates.find(c=>c.track.wikiTitle==='战斗的秘仪').classification;
 assert.equal(general.points.length,25);assert(general.points.some(a=>a.content.includes('风龙废墟')));assert(general.points.every(a=>!isCity(a)));
 const forest=candidates.find(c=>c.track.wikiTitle==='洄映的漩流').classification;assert(forest.points.length);assert(forest.points.every(a=>a.areaCode==='A:XM:FOREST'&&!isCity(a)));
 const boss=candidates.find(c=>c.track.wikiTitle==='终天的闭幕曲').classification;assert.equal(boss.points.length,5);assert(boss.points.every(a=>a.content.includes('风龙废墟')));
 const limited=candidates.find(c=>c.track.wikiTitle==='六轮一露狂诗曲').classification;assert.equal(limited.points.length,0);assert.deepEqual(limited.countries,['须弥']);
 const unknown=candidates.find(c=>c.album.title==='珍珠之歌'&&c.track.wikiTitle==='游击骑士').classification;assert.equal(unknown.points.length,0);assert.equal(unknown.countries.length,0);
});
test('野外只补普通场景空白；任务与战斗不占用场景；城市说明只看地理标题',()=>{
 const outdoor=candidates.find(c=>c.album.title==='风与异乡人'&&c.track.originText.startsWith('蒙德野外')).classification;
 assert(outdoor.points.every(a=>!a.content.includes('【蒙德 风龙废墟】')&&!a.content.includes('【蒙德 蒙德城】')));
 const normal=map.anchors.find(a=>a.id==='kongying:6290');assert(outdoor.points.some(a=>a.id===normal.id));
 assert.equal(category({originText:'主线剧情',discTitle:''}),'task');assert.equal(category({originText:'蒙德战斗',discTitle:''}),'battle-generic');
 assert(!isCity({...normal,content:'【蒙德 望风山地】\n注：前往蒙德城完成任务后解锁'}));
 assert(!isCity({...normal,content:'【枫丹 枫丹廷区】'}));assert(isCity({...normal,content:'【枫丹 枫丹廷区 · 纳博内区】'}));
});
test('隐藏特殊地图全部零挂载，悠悠/霜月真实地图匹配；未知地区不制造引用',()=>{
 for(const c of candidates.filter(c=>c.classification.kind==='special-map')){assert.equal(c.classification.points.length,0);assert(c.classification.areaCodes.every(bannedArea));}
 assert(candidates.filter(c=>c.classification.kind==='special-map').length>60);
 assert(candidates.some(c=>c.classification.points.some(a=>a.areaCode==='A:NT:NATA5')));
 const resort=candidates.find(c=>c.album.title==='珍珠之歌5'&&c.track.originText==='悠悠度假村').classification;
 assert.equal(resort.method,'region-scope');assert(resort.points.length>2);assert(resort.points.every(a=>a.areaCode==='A:NT:NATA5'));
 assert(candidates.some(c=>c.classification.points.some(a=>a.areaCode==='A:NDKL:SY')));
 assert(candidates.filter(c=>!c.classification.countries.length).every(c=>!c.classification.points.length));
});
