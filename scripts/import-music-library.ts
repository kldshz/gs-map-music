import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateLibrary, validateSnapshot } from '../src/domain/validation';

const snapshot=validateSnapshot(JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8')));
const library=validateLibrary(JSON.parse(await fs.readFile('public/data/music-library.json','utf8')),new Set(snapshot.anchors.map(a=>a.id)),snapshot);
const executable=process.env.MYSQL_BIN??'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe';
const defaults=path.resolve('.local/mysql-client.ini');
await fs.access(defaults);
function mysql(sql:string){
  const result=spawnSync(executable,[`--defaults-extra-file=${defaults}`,'--default-character-set=utf8mb4','--batch','--skip-column-names'],{input:sql,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
  if(result.status!==0)throw new Error('MySQL导入失败，请检查本机配置/表结构；本事务未提交。');
  return result.stdout.trim();
}
// DDL is idempotent but MySQL implicitly commits DDL; data uses its own transaction.
mysql(await fs.readFile('database/schema.sql','utf8'));
const existing=new Set(mysql("SELECT CONCAT(TABLE_NAME,'.',COLUMN_NAME) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='gs_map_music';").split(/\r?\n/));
const columns=[['music_track','personal_note','LONGTEXT NULL'],['music_track','netease_encrypted_id','CHAR(32) NULL'],['music_track','scene_info','JSON NULL'],['track_anchor','match_type',"ENUM('place-match','parent-place-match','region-archive','region-scope','manual') NULL"]];
for(const [table,column,type] of columns)if(!existing.has(`${table}.${column}`))mysql(`USE gs_map_music; ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
if(!mysql("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='gs_map_music' AND TABLE_NAME='track_anchor' AND COLUMN_NAME='match_type';").includes("'region-scope'"))mysql("USE gs_map_music; ALTER TABLE track_anchor MODIFY COLUMN match_type ENUM('place-match','parent-place-match','region-archive','region-scope','manual') NULL;");
// Hex UTF-8 literals do not depend on backslash/quote SQL modes.
const q=(v:unknown)=>v===null||v===undefined?'NULL':`CONVERT(X'${Buffer.from(String(v),'utf8').toString('hex')}' USING utf8mb4)`;
const json=(v:unknown)=>v===null?'NULL':q(JSON.stringify(v));
const statements=['USE gs_map_music; START TRANSACTION;'];
for(const p of library.musicLocations??[])statements.push(`INSERT INTO music_location(id,name,country,area_id,area_code,kind,source_url,notes) VALUES (${q(p.id)},${q(p.name)},${q(p.country)},${p.areaId},${q(p.areaCode)},${q(p.kind)},${q(p.sourceUrl)},${q(p.notes)}) ON DUPLICATE KEY UPDATE id=id;`);
for(const t of library.tracks){
  statements.push(`INSERT INTO music_track(id,title,artists,composers,album,release_date,duration_seconds,description,netease_id,source_url,personal_note,netease_encrypted_id,scene_info) VALUES (${q(t.id)},${q(t.title)},${json(t.artists)},${json(t.composers)},${q(t.album)},${q(t.releaseDate)},${t.durationSeconds??'NULL'},${q(t.description)},${q(t.neteaseId)},${q(t.sourceUrl)},${q(t.personalNote??'')},${q(t.neteaseEncryptedId)},${t.sceneInfo?json(t.sceneInfo):'NULL'}) ON DUPLICATE KEY UPDATE id=id;`);
  for(const id of t.sceneInfo?.musicLocationIds??[])statements.push(`INSERT IGNORE INTO track_music_location(track_id,location_id) VALUES (${q(t.id)},${q(id)});`);
}
for(const a of library.associations)statements.push(`INSERT INTO track_anchor(id,track_id,anchor_id,evidence_status,evidence_note,source_url,match_type) VALUES (${q(a.id)},${q(a.trackId)},${q(a.anchorId)},${q(a.evidenceStatus)},${q(a.evidenceNote)},${q(a.sourceUrl)},${q(a.matchType)}) ON DUPLICATE KEY UPDATE id=id;`);
statements.push('COMMIT;',"SELECT 'tracks',COUNT(*) FROM music_track UNION ALL SELECT 'associations',COUNT(*) FROM track_anchor UNION ALL SELECT 'music_locations',COUNT(*) FROM music_location UNION ALL SELECT 'track_locations',COUNT(*) FROM track_music_location;",
  "SELECT 'notes_blank',COUNT(*) FROM music_track WHERE personal_note=''; SELECT 'region_archive_non_statue',COUNT(*) FROM track_anchor r JOIN anchor a ON a.id=r.anchor_id WHERE r.match_type='region-archive' AND a.kind<>'statue';");
console.log(mysql(statements.join('\n')));
console.log('现有行及个人评价保持原值；网页编辑仅此浏览器，与数据库不自动同步。');
