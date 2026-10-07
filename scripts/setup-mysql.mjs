import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Credentials stay in .local/mysql-client.ini; never command-line passwords.
const executable=process.env.MYSQL_BIN??'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe';
const defaults=path.resolve('.local/mysql-client.ini');
await fs.access(defaults);
const snapshot=JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8'));
const sqlString=value=>value===null?'NULL':`'${String(value).replaceAll('\\','\\\\').replaceAll("'","''").replaceAll('\u0000','')}'`;
const statements=[await fs.readFile('database/schema.sql','utf8'),'START TRANSACTION;'];
for(const area of [...snapshot.areas].sort((a,b)=>(a.parentId===-1?-1:1)-(b.parentId===-1?-1:1))){
  statements.push(`INSERT INTO area(id,name,code,parent_id,is_final,hidden_flag) VALUES (${area.id},${sqlString(area.name)},${sqlString(area.code)},${area.parentId===-1?'NULL':area.parentId},${area.isFinal?1:0},${area.hiddenFlag}) ON DUPLICATE KEY UPDATE name=VALUES(name),code=VALUES(code),parent_id=VALUES(parent_id),is_final=VALUES(is_final),hidden_flag=VALUES(hidden_flag);`);
}
for(const a of snapshot.anchors){
  statements.push(`INSERT INTO anchor(id,source_id,area_id,kind,name,content,source_lat,source_lng,underground,layer_values,source_version,source_url) VALUES (${sqlString(a.id)},${a.sourceId},${a.areaId},${sqlString(a.kind)},${sqlString(a.name)},${sqlString(a.content)},${a.position?.[0]??'NULL'},${a.position?.[1]??'NULL'},${a.underground?1:0},${sqlString(JSON.stringify(a.layerValues))},${a.version},${sqlString(a.sourceUrl)}) ON DUPLICATE KEY UPDATE area_id=VALUES(area_id),kind=VALUES(kind),name=VALUES(name),content=VALUES(content),source_lat=VALUES(source_lat),source_lng=VALUES(source_lng),underground=VALUES(underground),layer_values=VALUES(layer_values),source_version=VALUES(source_version),source_url=VALUES(source_url);`);
}
statements.push('COMMIT;','SELECT "areas",COUNT(*) FROM area UNION ALL SELECT "anchors",COUNT(*) FROM anchor UNION ALL SELECT "music_tracks",COUNT(*) FROM music_track UNION ALL SELECT "associations",COUNT(*) FROM track_anchor;');
const result=spawnSync(executable,[`--defaults-extra-file=${defaults}`,'--batch','--skip-column-names'],{input:statements.join('\n'),encoding:'utf8',windowsHide:true,maxBuffer:1024*1024});
if(result.status!==0){console.error('MySQL初始化失败；请核对本机配置、现有表结构和权限。');process.exitCode=1;}else console.log(result.stdout.trim());
