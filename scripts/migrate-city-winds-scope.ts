import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateLibrary,validateSnapshot } from '../src/domain/validation';

const snapshot=validateSnapshot(JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8')));
const ids=new Set(snapshot.anchors.map(a=>a.id));
const before=validateLibrary(JSON.parse(await fs.readFile('outputs/city-winds-pilot-20261007/music-library.json','utf8')),ids,snapshot);
const after=validateLibrary(JSON.parse(await fs.readFile('public/data/music-library.json','utf8')),ids,snapshot);
const q=(v:string)=>`CONVERT(X'${Buffer.from(v,'utf8').toString('hex')}' USING utf8mb4)`;
const sql=['USE gs_map_music; START TRANSACTION;'];let candidates=0;
for(const old of before.associations){
  const next=after.associations.find(a=>a.id===old.id);if(old.matchType!=='region-archive'||next?.matchType!=='region-scope')continue;
  candidates++;
  // Only upgrade the exact prior machine row. Manual DB revisions remain intact.
  sql.push(`UPDATE track_anchor SET match_type='region-scope',evidence_note=${q(next.evidenceNote)} WHERE id=${q(old.id)} AND track_id=${q(old.trackId)} AND anchor_id=${q(old.anchorId)} AND match_type='region-archive' AND evidence_status='pending' AND BINARY evidence_note=BINARY ${q(old.evidenceNote)};`);
}
sql.push('COMMIT;',"SELECT match_type,COUNT(*) FROM track_anchor GROUP BY match_type;");
const defaults=path.resolve('.local/mysql-client.ini');await fs.access(defaults);
const result=spawnSync(process.env.MYSQL_BIN??'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe',[`--defaults-extra-file=${defaults}`,'--default-character-set=utf8mb4','--batch','--skip-column-names'],{input:sql.join('\n'),encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error('地区候选迁移未成功，请检查本机表结构。');
console.log(`${candidates} prior source rows considered; edited rows preserved.`);console.log(result.stdout.trim());
