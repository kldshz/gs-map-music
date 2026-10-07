import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const library=JSON.parse(await fs.readFile('public/data/music-library.json','utf8'));
const map=JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8'));
const out='outputs/city-winds-region-20261007';
const tracks=library.tracks.filter(t=>t.sceneInfo?.wikiRevisionId==='687233');
const links=library.associations.filter(a=>tracks.some(t=>t.id===a.trackId));
const labels=t=>library.musicLocations.filter(p=>t.sceneInfo.musicLocationIds.includes(p.id)).map(p=>`${p.country} / ${map.areas.find(a=>a.id===p.areaId).name} / ${p.name}`).join('；');
const matchLabels={'place-match':'地点匹配','parent-place-match':'父级地点匹配','region-archive':'地区神像归档（非实际播放点）','region-scope':'地区范围候选（待核实）','manual':'用户手动挂载（待核实）'};
const headers=['曲目Key','中文名','英文名（Wiki）','主要地区','音乐细分目录','个人评价（填写）','出处原文（Wiki）','专辑（网易）','分碟','碟内曲序','艺人（网易）','作曲','时长（秒）','发行日期（北京时间）','网易数字ID','网易加密ID','挂载方式','Wiki出处来源','网易歌曲来源','元数据备注'];
const rows=tracks.map(t=>[t.id,t.sceneInfo.wikiTitle,t.sceneInfo.englishTitle,t.sceneInfo.mainRegions.join('；'),labels(t),t.personalNote??'',t.sceneInfo.originText,t.album,t.sceneInfo.discTitle,t.sceneInfo.trackNumber,t.artists.join(' / '),t.composers.join(' / '),t.durationSeconds,
  Date.parse(t.releaseDate+'T00:00:00Z')/86400000+25569,t.neteaseId,t.neteaseEncryptedId,[...new Set(links.filter(a=>a.trackId===t.id).map(a=>matchLabels[a.matchType]))].join('；'),t.sceneInfo.wikiSourceUrl,t.sourceUrl,t.sceneInfo.metadataNotes.join('；')]);
const linkHeaders=['关联Key','曲目Key','中文名','点位Key','类型','国家','源地区','点位原说明','原始坐标1','原始坐标2','音乐细分目录','匹配方式','证据状态','挂载证据与限制','出处来源'];
const linkRows=links.map(a=>{const p=map.anchors.find(p=>p.id===a.anchorId),t=tracks.find(t=>t.id===a.trackId);return [a.id,a.trackId,t.sceneInfo.wikiTitle,a.anchorId,p.kind==='statue'?'七天神像':'传送锚点',p.country,p.areaName,p.content,p.position?.[0]??null,p.position?.[1]??null,labels(t),a.matchType,a.evidenceStatus,a.evidenceNote,a.sourceUrl];});
assert.equal(rows.length,63);assert.equal(linkRows.length,library.associations.length);assert(rows.every(r=>r[5]===''));
await fs.mkdir(out,{recursive:true});
const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
// CSV uses ISO dates for interoperability; XLSX stores numeric sortable dates.
for(const [name,h,r] of [['曲目',headers,rows.map(r=>r.map((v,i)=>i===13?new Date((v-25569)*86400000).toISOString().slice(0,10):v))],['挂载',linkHeaders,linkRows]])await fs.writeFile(`${out}/${name}.csv`,'\ufeff'+[h,...r].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n');
const wb=Workbook.create();
const col=i=>String.fromCharCode(65+i);
function sheet(name,title,context,h,r,widths,tableName){
  const s=wb.worksheets.add(name),end=r.length+6,last=col(h.length-1);
  s.showGridLines=false;s.tabColor='#344A5E';
  s.getRange(`A1:${last}${end}`).format={font:{name:'Arial',size:11,color:'#263142'},verticalAlignment:'center',rowHeight:30};
  s.getRange('A2').values=[[title]];s.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:'#344A5E'};
  s.getRange('A3').values=[[context]];s.getRange('A4').values=[['保留Key与来源。黄色列可填写或修订，回传后核验导入；神像归档不代表该点实际播放。']];
  s.getRangeByIndexes(5,0,r.length+1,h.length).values=[h,...r];
  widths.forEach((w,i)=>s.getRange(`${col(i)}1:${col(i)}${end}`).format.columnWidth=w);
  const table=s.tables.add(`A6:${last}${end}`,true,tableName);table.style='TableStyleMedium2';table.showFilterButton=true;
  s.getRange(`A6:${last}6`).format={fill:'#344A5E',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:48};
  s.getRange(`A7:${last}${end}`).format.wrapText=true;
  const units=v=>[...String(v??'')].reduce((n,c)=>n+(c.charCodeAt(0)>255?2:1),0);
  r.forEach((row,i)=>{const lines=Math.max(...row.map((v,j)=>String(v??'').split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(units(line)/(widths[j]*0.80))),0)));s.getRangeByIndexes(i+6,0,1,h.length).format.rowHeight=Math.max(36,lines*19+8);});
  s.freezePanes.freezeRows(6);s.freezePanes.freezeColumns(2);
  assert.deepEqual(s.getRangeByIndexes(6,0,r.length,h.length).values,r);
  return s;
}
const s=sheet('曲目','风与牧歌之城曲目表','63首，3分碟。出处保留Wiki原文，个人评价默认空。采集：2026-10-07。',headers,rows,[27,26,48,43,55,65,75,55,53,12,27,16,14,20,20,44,55,65,55,85],'CityWindsTracks');
s.getRange('F7:F69').format.fill='#FFF2CC';s.getRange('M7:M69').setNumberFormat('0.000');s.getRange('N7:N69').setNumberFormat('yyyy-mm-dd');s.getRange('O7:P69').setNumberFormat('@');
const typeCounts=Object.fromEntries(Object.keys(matchLabels).map(k=>[k,links.filter(a=>a.matchType===k).length]));
const a=sheet('挂载','风与牧歌之城点位挂载表',`${linkRows.length}条候选关系，${new Set(links.map(a=>a.anchorId)).size}个点位。地点${typeCounts['place-match']}、父级${typeCounts['parent-place-match']}、地区范围${typeCounts['region-scope']}、神像归档${typeCounts['region-archive']}、手动${typeCounts.manual}；当前全部待核实。`,linkHeaders,linkRows,[40,27,26,25,18,16,30,80,18,18,55,30,18,115,65],'CityWindsAssociations');
const linkEnd=6+linkRows.length;
for(const c of ['D','L','M','N'])a.getRange(`${c}7:${c}${linkEnd}`).format.fill='#FFF2CC';
a.getRange(`I7:J${linkEnd}`).setNumberFormat('0.########');
a.getRange(`L7:L${linkEnd}`).dataValidation={rule:{type:'list',values:Object.keys(matchLabels)}};
a.getRange(`M7:M${linkEnd}`).dataValidation={rule:{type:'list',values:['pending','verified']}};
wb.recalculate();
console.log((await wb.inspect({kind:'region',sheetId:s.name,range:'A6:F10',maxChars:1600,tableMaxCols:6,tableMaxRows:5})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!',options:{useRegex:true,maxResults:5},maxChars:500})).ndjson);
for(const [name,range,file] of [['曲目','A1:D10','album-table'],['曲目','E6:G11','album-editable'],['挂载','C6:H10','album-links']]){
  const preview=await wb.render({sheetName:name,range,scale:1.2,format:'png'});await fs.writeFile(`.local/region-sheet/${file}.png`,new Uint8Array(await preview.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(wb);await xlsx.save(out+'/风与牧歌之城曲目与挂载表.xlsx');
await fs.writeFile(`${out}/music-library.json`,JSON.stringify(library,null,2)+'\n');
console.log(`EXPORTED ${rows.length} tracks, ${linkRows.length} associations, independent blank personalNote`);
