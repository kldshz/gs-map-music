import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary, validateSnapshot } from '../../src/domain/validation';
import { usePersonalNotes } from '../../src/services/personal-notes';

const snapshot=validateSnapshot(JSON.parse(await readFile('public/data/kongying-map.json','utf8')));
const ids=new Set(snapshot.anchors.map(a=>a.id));
const raw=JSON.parse(await readFile('public/data/music-library.json','utf8'));
const full=validateLibrary(raw,ids,snapshot);
const pilotIds=new Set(JSON.parse(await readFile('data/sources/city-winds-source.json','utf8')).tracks.map((t:any)=>'netease:'+t.neteaseId));
const library={...full,tracks:full.tracks.filter(t=>pilotIds.has(t.id)),associations:full.associations.filter(a=>pilotIds.has(a.trackId)),musicLocations:full.musicLocations?.filter(p=>p.id.startsWith('city-winds-place-'))};
const source=JSON.parse(await readFile('data/sources/city-winds-source.json','utf8'));
test('63曲一一对应Wiki曲序和网易ID，出处/未知项/个人评价独立',()=>{
  assert.equal(library.tracks.length,63);assert.equal(library.musicLocations?.length,40);assert(library.associations.length>0);
  assert.equal(new Set(library.tracks.map(t=>t.neteaseId)).size,63);
  assert.deepEqual([1,2,3].map(n=>library.tracks.filter(t=>t.sceneInfo?.discNumber===n).length),[25,26,12]);
  for(const t of library.tracks){const s=source.tracks.find((s:any)=>s.neteaseId===t.neteaseId);assert(s);assert.equal(t.title,s.neteaseTitle);assert.equal(t.neteaseEncryptedId,s.neteaseEncryptedId);assert.equal(t.sceneInfo?.originText,s.originText);assert.equal(t.durationSeconds,s.durationSeconds);assert.equal(t.personalNote,'');assert.equal(t.releaseDate,'2020-09-28');assert.deepEqual(t.composers,['陈致逸']);}
  assert(library.associations.every(a=>a.evidenceStatus==='pending'));
  assert(library.associations.filter(a=>a.matchType==='region-archive').every(a=>snapshot.anchors.find(p=>p.id===a.anchorId)?.kind==='statue'));
  assert(library.tracks.every(t=>library.associations.some(a=>a.trackId===t.id)));
  for(const name of ['冰封交响曲','冰风回荡']){
    const t=library.tracks.find(t=>t.sceneInfo?.wikiTitle===name)!;
    assert(library.associations.filter(a=>a.trackId===t.id).every(a=>a.matchType==='region-archive'&&snapshot.anchors.find(p=>p.id===a.anchorId)?.country==='蒙德'));
  } // Unmatched Boss tracks have statue storage, never national battle coverage.
});
test('秘境所属地区优先于专辑归属；不把全部曲目塞入蒙德',()=>{
  for(const [name,area] of [['芬德尼尔之顶','A:MD:XUESHAN'],['太山府','A:LY:LIYUE'],['震雷连山密宫','A:LY:LIYUE']]){
    const place=library.musicLocations!.find(p=>p.name===name)!;assert.equal(place.areaCode,area);
    const tracks=library.tracks.filter(t=>t.sceneInfo?.musicLocationIds.includes(place.id));assert.equal(tracks.length,1);
    assert(library.associations.filter(a=>a.trackId===tracks[0].id).every(a=>snapshot.anchors.find(p=>p.id===a.anchorId)?.areaCode===area));
  }
  const city=library.musicLocations!.find(p=>p.name==='蒙德城')!;
  const first=library.tracks.find(t=>t.sceneInfo?.musicLocationIds.includes(city.id))!;
  assert.deepEqual(library.associations.filter(a=>a.trackId===first.id).map(a=>a.anchorId).sort(),['kongying:6625','kongying:6626']);
});
test('扩展导入保留独立评价，拒绝伪造已核实归档/错地区/非神像归档',()=>{
  const personal=structuredClone(raw);personal.tracks[0].personalNote='用户手填';assert.equal(validateLibrary(personal,ids,snapshot).tracks[0].personalNote,'用户手填');assert.equal(personal.tracks[0].description,raw.tracks[0].description);
  for(const invalid of [()=>{const b=structuredClone(raw);b.associations.find((a:any)=>a.matchType==='region-archive').evidenceStatus='verified';return b;},()=>{const b=structuredClone(raw);b.musicLocations[0].areaCode='missing';return b;},()=>{const b=structuredClone(raw);b.associations.find((a:any)=>a.matchType==='region-archive').anchorId='kongying:6625';return b;}])assert.throws(()=>validateLibrary(invalid(),ids,snapshot));
});
test('个人评价保存/刷新/清空/恢复独立；失败和损坏存储不覆盖原值',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let stored:string|null=null,fail=false;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>stored,setItem:(_key:string,value:string)=>{if(fail)throw new Error('quota');stored=value;}}});
  try{
    let n=usePersonalNotes();assert.equal(n.personalNoteFor('a','导入值'),'导入值');assert(n.savePersonalNote('a','我的评价'));assert(n.savePersonalNote('b','另一首'));
    n=usePersonalNotes();assert.equal(n.personalNoteFor('a','导入值'),'我的评价');assert.equal(n.personalNoteFor('b'),'另一首');
    assert(n.savePersonalNote('a',''));assert.equal(n.personalNoteFor('a','导入值'),'');assert(n.clearPersonalNote('a'));assert.equal(n.personalNoteFor('a','导入值'),'导入值');
    const before=stored;fail=true;assert(!n.savePersonalNote('b','不可写'));assert.equal(stored,before);assert.equal(n.personalNoteFor('b'),'另一首');assert.match(n.noteMessage.value,/失败/);
    fail=false;stored='{broken';n=usePersonalNotes();assert(!n.savePersonalNote('a','新值'));assert.equal(stored,'{broken');assert.match(n.noteMessage.value,/保存被阻止/);
    assert(!n.savePersonalNote('a','x'.repeat(20001)));
  }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});
