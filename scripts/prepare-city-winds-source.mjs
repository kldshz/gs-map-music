import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const wiki=await read('.local/music-pilot/album-tables.json');
const index=await read('.local/music-pilot/albums-tables.json');
const album=(await read('.local/music-pilot/netease-album.json')).data;
const response=await read('.local/music-pilot/netease-tracks.json');
assert.equal(response.code,200);assert.equal(response.data.length,63);assert.equal(album.originalId,95790219);
const sourceUrl='https://wiki.biligame.com/ys/'+encodeURIComponent('风与牧歌之城');
const tables=wiki.tables.filter(t=>t.caption.startsWith('Disc'));
const rows=[];
for(const [discIndex,table] of tables.entries())for(const cells of table.rows.slice(1)){
 const title=cells[1].text;
 const matches=response.data.filter(t=>t.name.startsWith(title+' '));
 assert.equal(matches.length,1,'Title match '+title);
 const song=matches[0];assert.equal(song.album.originalId,95790219);
 rows.push({wikiTitle:title,englishTitle:cells[2].text,discNumber:discIndex+1,discTitle:table.caption,trackNumber:Number(cells[0].text),
  originText:cells.at(-1).text,originLinks:cells.at(-1).links.filter(a=>!a.href?.includes('redlink=1')).map(a=>({...a,href:new URL(a.href,'https://wiki.biligame.com').href})),
  neteaseId:String(song.originalId),neteaseEncryptedId:song.id,neteaseTitle:song.name,durationSeconds:song.duration/1000,artists:song.artists.map(a=>a.name),
  providerVisible:song.visible,providerPlayFlag:song.playFlag});
}
assert.equal(rows.length,63);assert.equal(new Set(rows.map(r=>r.neteaseId)).size,63);
const catalog=index.tables.filter(t=>['场景OST（场景BGM）','回顾主题OST'].includes(t.section)).map(t=>({category:t.section,albums:t.rows.slice(1).map(r=>({title:r[0].text,trackCount:Number(r[1].text),regionsOrContents:r[2].text,url:new URL(r[0].links[0].href,'https://wiki.biligame.com').href}))}));
await fs.mkdir('data/sources',{recursive:true});
await fs.writeFile('data/sources/city-winds-source.json',JSON.stringify({capturedOn:'2026-10-07',wikiSourceUrl:sourceUrl,wikiRevisionId:wiki.revision,
 wikiCaveat:'出处仅供参考，部分内容待完善，请求帮助，谢谢！',
 album:{neteaseId:String(album.originalId),neteaseEncryptedId:album.id,title:album.name,releaseDate:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(album.publishTime),publishTime:album.publishTime,dateTimeZone:'Asia/Shanghai',company:album.company,artists:album.artists.map(a=>a.name),
  composer:'陈致逸',composerEvidence:'Wiki制作团队明确列出作曲：陈致逸；网易专辑介绍明确63首由陈致逸@HOYO-MiX创作。不是从艺人字段推断。',sourceUrl:'https://music.163.com/album?id=95790219'},
 placeReferences:[{place:'太山府',region:'璃月'},{place:'震雷连山密宫',region:'璃月'},{place:'芬德尼尔之顶',region:'龙脊雪山'},{place:'塞西莉亚苗圃',region:'蒙德'}].map(p=>({...p,url:'https://wiki.biligame.com/ys/'+encodeURIComponent(p.place)})),
 tracks:rows},null,2)+'\n');
await fs.writeFile('data/sources/wiki-album-catalog.json',JSON.stringify({capturedOn:'2026-10-07',sourceUrl:'https://wiki.biligame.com/ys/'+encodeURIComponent('专辑'),revisionId:index.revision,categories:catalog},null,2)+'\n');
console.log('Sanitized 63 source rows, no account/liked/playback URL fields; scenario/review directory recorded');
