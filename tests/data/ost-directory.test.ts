import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLibrary,validateSnapshot} from '../../src/domain/validation';
import {applyAssociationEdits} from '../../src/domain/association-edits';
const map=validateSnapshot(JSON.parse(await readFile('public/data/kongying-map.json','utf8')));
const raw=JSON.parse(await readFile('public/data/music-library.json','utf8'));
const ids=new Set(map.anchors.map(a=>a.id));
test('未定位目录成对null且不引用虚构地区，保留来源与多对多校验',()=>{
 const sample=structuredClone(raw);sample.musicLocations[0].areaId=null;sample.musicLocations[0].areaCode=null;sample.musicLocations[0].country='';
 assert.equal(validateLibrary(sample,ids,map).musicLocations![0].areaId,null);
 sample.musicLocations[0].areaCode='A:MD:MENGDE';assert.throws(()=>validateLibrary(sample,ids,map));
});
test('扩库后人工remove覆盖基线，重复应用不恢复或复制；新增pending与个人评价保持',()=>{
 const base=validateLibrary(raw,ids,map),a=base.associations.find(a=>a.id.startsWith('geo:'))!;
 const edits={schemaVersion:1,edits:[{trackId:a.trackId,anchorId:a.anchorId,action:'remove',updatedAt:'2026-10-07T12:00:00Z'}]};
 const effective=applyAssociationEdits(base,map,edits);
 assert(!effective.associations.some(x=>x.trackId===a.trackId&&x.anchorId===a.anchorId));
 assert.deepEqual(applyAssociationEdits(effective,map,edits),effective);assert.deepEqual(effective.tracks,base.tracks);
 assert(base.associations.filter(a=>a.id.startsWith('geo:')).every(a=>a.evidenceStatus==='pending'));
});
