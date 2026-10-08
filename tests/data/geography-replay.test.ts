import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {applyAssociationEdits,updateAssociationEdit} from '../../src/domain/association-edits';
import {validateLibrary,validateSnapshot} from '../../src/domain/validation';
test('隔离重建保留人工增删/恢复、verified及评价；重复执行字节一致',()=>{
 const root=fs.mkdtempSync(path.join(process.cwd(),'.local/geography-replay-'));
 const paths=['scripts/reclassify-geography.mjs','scripts/audit-anchor-music.mjs','scripts/lib/geography.mjs','scripts/lib/ost-associations.mjs','scripts/lib/ja-bgm-evidence.mjs','data/sources/official-map-labels.json','data/sources/ja-bgm-crosscheck.json','data/sources/ost-bulk-source.json','public/data/kongying-map.json','public/data/music-library.json'];
 for(const p of paths){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));}
 fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.mkdirSync(path.join(root,'data/review'),{recursive:true});
 const read=(p:string)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const before=read('public/data/music-library.json');const source=before.associations.find((a:any)=>a.matchType==='region-scope');
 const protectedLink=before.associations.find((a:any)=>a.matchType==='place-match');protectedLink.evidenceStatus='verified';
 before.tracks[0].personalNote='隔离测试：保留用户评价';
 const edits={schemaVersion:1,edits:[{trackId:source.trackId,anchorId:source.anchorId,action:'remove',updatedAt:'2026-10-08T00:00:00Z'},{trackId:before.tracks[0].id,anchorId:'kongying:6290',action:'add',updatedAt:'2026-10-08T00:00:00Z'}]};
 fs.writeFileSync(path.join(root,'public/data/music-library.json'),JSON.stringify(before));fs.writeFileSync(path.join(root,'data/association-edits.json'),JSON.stringify(edits));
 const invoke=()=>execFileSync(process.execPath,[path.join(root,'scripts/reclassify-geography.mjs')],{cwd:root,encoding:'utf8',maxBuffer:1024*1024});invoke();
 const map=validateSnapshot(read('public/data/kongying-map.json')),rebuilt=validateLibrary(read('public/data/music-library.json'),new Set(map.anchors.map(a=>a.id)),map);
 assert.equal(rebuilt.tracks[0].personalNote,'隔离测试：保留用户评价');assert.deepEqual(read('data/association-edits.json'),edits);
 assert.deepEqual(rebuilt.associations.find(a=>a.id===protectedLink.id),protectedLink);
 const effective=applyAssociationEdits(rebuilt,map,edits);assert(!effective.associations.some(a=>a.trackId===source.trackId&&a.anchorId===source.anchorId));
 assert(effective.associations.some(a=>a.trackId===before.tracks[0].id&&a.anchorId==='kongying:6290'&&a.matchType==='manual'));
 const restored=updateAssociationEdit(edits,rebuilt,map,'restore',source.trackId,source.anchorId);assert(applyAssociationEdits(rebuilt,map,restored).associations.some(a=>a.trackId===source.trackId&&a.anchorId===source.anchorId));
 const stable=['public/data/music-library.json','public/data/kongying-map.json','data/association-edits.json','data/review/geography-reclassification.json'].map(p=>fs.readFileSync(path.join(root,p)));invoke();
 stable.forEach((bytes,i)=>assert(bytes.equals(fs.readFileSync(path.join(root,['public/data/music-library.json','public/data/kongying-map.json','data/association-edits.json','data/review/geography-reclassification.json'][i])))));
});
