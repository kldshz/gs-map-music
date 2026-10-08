import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary,validateSnapshot } from '../../src/domain/validation';
import { applyAssociationEdits,updateAssociationEdit,validateEdits } from '../../src/domain/association-edits';
const snapshot=validateSnapshot(JSON.parse(await readFile('public/data/kongying-map.json','utf8')));
const base=validateLibrary(JSON.parse(await readFile('public/data/music-library.json','utf8')),new Set(snapshot.anchors.map(a=>a.id)),snapshot);
const empty={schemaVersion:1 as const,edits:[]};

test('原专辑野外不覆盖精确场景，加载界面仅按蒙德神像归档',()=>{
  const pilot=new Set(base.tracks.filter(t=>t.album?.startsWith('原神-风与牧歌之城 ')).map(t=>t.id));
  const scopes=base.associations.filter(a=>a.matchType==='region-scope'&&pilot.has(a.trackId));assert(scopes.length>0);
  for(const a of scopes){const p=snapshot.anchors.find(p=>p.id===a.anchorId)!;assert.equal(p.country,'蒙德');assert(!p.content.includes('【蒙德 蒙德城】'));assert(!p.content.includes('风龙废墟'));assert.equal(a.evidenceStatus,'pending');}
  const loading=base.tracks.find(t=>t.sceneInfo?.wikiTitle==='宁静的黄昏')!,links=base.associations.filter(a=>a.trackId===loading.id);assert(links.length>0);for(const link of links){assert.equal(link.matchType,'region-archive');const point=snapshot.anchors.find(p=>p.id===link.anchorId)!;assert.equal(point.kind,'statue');assert.equal(point.country,'蒙德');}
});
test('增删恢复关系不改曲目/来源，重复添加不损证据，多方向共享结果',()=>{
  const track=base.tracks[0].id,anchor='kongying:6290';
  const added=updateAssociationEdit(empty,base,snapshot,'add',track,anchor);
  const changed=applyAssociationEdits(base,snapshot,added);assert.equal(changed.associations.length,base.associations.length+1);assert.deepEqual(changed.tracks,base.tracks);
  const link=changed.associations.find(a=>a.trackId===track&&a.anchorId===anchor)!;assert.equal(link.matchType,'manual');assert.equal(link.evidenceStatus,'pending');
  const removed=updateAssociationEdit(added,base,snapshot,'remove',track,anchor);assert.equal(applyAssociationEdits(base,snapshot,removed).associations.length,base.associations.length);
  const original=base.associations[0];const duplicate=updateAssociationEdit(empty,base,snapshot,'add',original.trackId,original.anchorId);
  assert.deepEqual(applyAssociationEdits(base,snapshot,duplicate).associations,base.associations);
  const suppressed=updateAssociationEdit(empty,base,snapshot,'remove',original.trackId,original.anchorId);
  assert.equal(applyAssociationEdits(base,snapshot,suppressed).associations.length,base.associations.length-1);
  const restored=updateAssociationEdit(suppressed,base,snapshot,'restore',original.trackId,original.anchorId);assert.deepEqual(restored,empty);
  assert.deepEqual(applyAssociationEdits(base,snapshot,restored),base);
});
test('拒绝无效手改记录/引用/重复，范围与手工挂载不能伪装verified',()=>{
  assert.throws(()=>validateEdits({schemaVersion:1,edits:[{trackId:'missing',anchorId:'kongying:6290',action:'add',updatedAt:new Date().toISOString()}]},base,snapshot));
  const e=updateAssociationEdit(empty,base,snapshot,'add',base.tracks[0].id,'kongying:6290');assert.throws(()=>validateEdits({...e,edits:[...e.edits,...e.edits]},base,snapshot));
  assert.throws(()=>updateAssociationEdit(empty,base,snapshot,'add',base.tracks[0].id,'missing'));
  const invalid=structuredClone(base);invalid.associations.find(a=>a.matchType==='region-scope')!.evidenceStatus='verified';assert.throws(()=>validateLibrary(invalid,new Set(snapshot.anchors.map(a=>a.id)),snapshot),/待核实/);
});
