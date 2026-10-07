/** Offline sanitizer: only explicitly matched Wiki/official CLI cache fields enter Git. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const catalog=JSON.parse(await fs.readFile('data/sources/wiki-album-catalog.json','utf8'));
const norm=s=>s.normalize('NFKC').replace(/[‐‑‒–—−]/g,'-').replace(/[\s·・•.,，。:：'’"“”!?！？（）()《》「」]/g,'').toLowerCase();
const result={schemaVersion:1,capturedOn:'2026-10-07',caveat:'BWIKI出处为玩家整理，仅供参考；曲目匹配和地点候选不代表实际游戏音乐触发。',albums:[],conflicts:[]};
for(const entry of catalog.categories.flatMap(c=>c.albums.map(a=>({...a,category:c.category}))).filter(a=>a.title!=='风与牧歌之城')){
 const wiki=JSON.parse(await fs.readFile(`.local/bulk-wiki/${entry.title}.json`,'utf8'));
 const search=JSON.parse(await fs.readFile(`.local/bulk-netease/${entry.title}.json`,'utf8'));
 const versions=[];
 for(const a of search.data.records.filter(a=>a.name.startsWith('原神-'+entry.title+' '))){
  const get=JSON.parse(await fs.readFile(`.local/bulk-netease/${entry.title}-${a.originalId}-get.json`,'utf8'));
  const tracks=JSON.parse(await fs.readFile(`.local/bulk-netease/${entry.title}-${a.originalId}-tracks.json`,'utf8'));
  assert.equal(get.code,200);assert.equal(tracks.code,200);
  versions.push({album:get.data,tracks:tracks.data});
 }
 const matching=versions.filter(v=>v.tracks.length===entry.trackCount);assert.equal(matching.length,1,entry.title+' album version');
 const selected=matching[0];
 if(versions.length>1)result.conflicts.push({album:entry.title,type:'album-version',selected:String(selected.album.originalId),versions:versions.map(v=>({id:String(v.album.originalId),count:v.tracks.length})),resolution:'使用与Wiki完整曲数一致的版本；未导入单曲同名版本。'});
 const album={title:entry.title,category:entry.category,scope:entry.regionsOrContents,neteaseAlbumId:String(selected.album.originalId),neteaseTitle:selected.album.name,wikiUrl:entry.url,wikiRevision:wiki.revision,releaseDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(selected.album.publishTime)),expectedTracks:entry.trackCount,tracks:[]};
 const tables=wiki.tables.filter(t=>t.rows[0].some(c=>c.text==='曲目'));
 const used=new Set();
 for(const [discIndex,table] of tables.entries()){
  const printedDisc=table.caption.match(/^Disc\s*0?(\d+)/i)?.[1];
  if(printedDisc&&Number(printedDisc)!==discIndex+1)result.conflicts.push({album:entry.title,type:'disc-caption',tableIndex:discIndex+1,caption:table.caption,resolution:'分碟按网页曲目表顺序，保留原caption；来源碟号冲突待核实。'});
  const h=table.rows[0].map(c=>c.text);
  const field=(row,names)=>row[h.findIndex(s=>names.includes(s))]?.text??'';
  for(const row of table.rows.slice(1)){
   const title=field(row,['曲目']),english=field(row,['外文名']),origin=field(row,['主要地区','来源','出处','大致出处','出处/大致出处']);
   assert(title&&/^\d+$/.test(field(row,['序号'])),entry.title+' invalid track row '+title);
   const available=selected.tracks.filter(t=>!used.has(String(t.originalId)));
   let matches=available.filter(t=>norm(t.name)===norm(title+' '+english));
   if(!matches.length)matches=available.filter(t=>t.name.startsWith(title+' ')||t.name===title);
   if(matches.length!==1&&english)matches=available.filter(t=>norm(t.name).endsWith(norm(english)));
   if(matches.length!==1)matches=available.filter(t=>norm(t.name.split(/\s[A-Za-z]/)[0])===norm(title.replace('（中）','')));
   // These actual CLI titles carry parenthetical variants or differ from the Wiki translation.
   if(matches.length!==1)matches=available.filter(t=>norm(t.name.split(/\s[A-Za-z]/)[0].replace(/[(（][^()（）]*[)）]/g,''))===norm(title.replace(/[(（][^()（）]*[)）]/g,'')));
   if(matches.length===1&&norm(matches[0].name)!==norm(title+' '+english))result.conflicts.push({album:entry.title,type:'title-variant',wiki:title+' '+english,netease:matches[0].name,id:String(matches[0].originalId),resolution:'专辑内中文唯一匹配，保留双方原文供校对。'});
   if(matches.length!==1){result.conflicts.push({album:entry.title,type:'song-match',title,english,candidates:matches.map(t=>({id:String(t.originalId),title:t.name}))});continue;}
   const t=matches[0];used.add(String(t.originalId));
   album.tracks.push({wikiTitle:title,englishTitle:english,originText:origin,discNumber:discIndex+1,discTitle:table.caption,trackNumber:Number(field(row,['序号'])),composers:field(row,['作曲']).split(/[\n、/]/).filter(v=>v.trim()&&!['-','—'].includes(v.trim())),arrangers:field(row,['编曲']),originLinks:row[h.findIndex(s=>['主要地区','来源','出处','大致出处','出处/大致出处'].includes(s))]?.links??[],neteaseId:String(t.originalId),neteaseEncryptedId:t.id,title:t.name,artists:t.artists.map(a=>a.name),durationSeconds:Math.round(t.duration/1000),visible:t.visible??null,playFlag:t.playFlag??null});
  }
 }
 album.unmatchedNetease=selected.tracks.filter(t=>!used.has(String(t.originalId))).map(t=>({id:String(t.originalId),title:t.name}));
 result.albums.push(album);
 console.log(`${album.title}: ${album.tracks.length}/${entry.trackCount}`);
}
await fs.writeFile('data/sources/ost-bulk-source.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.conflicts,null,2));
