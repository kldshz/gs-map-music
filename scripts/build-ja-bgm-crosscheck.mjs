import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const albums=await read('.local/ja-bgm-albums.json'),main=await read('.local/bgm-ja-tables.json'),words=await read('.local/genshin-words.json');
const library=await read('public/data/music-library.json');
const norm=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const terms=[];
for(const w of words)if(w.ja&&w.zhCN&&w.tags?.some(t=>['location','facility','domain','enemy-boss','event','quest-world','quest-archon'].includes(t)))for(const ja of [w.ja,...(w.variants?.ja??[])].flatMap(s=>s.split(/\s+\/\s+/)))if(ja.length>1)terms.push({ja,zh:w.zhCN,url:'https://genshin-dictionary.com/zh-CN/'+w.id});
terms.sort((a,b)=>b.ja.length-a.ja.length);
const used=new Map();
function translate(text){
 let out='',i=0;while(i<text.length){const term=terms.find(t=>text.startsWith(t.ja,i));if(term){out+=term.zh;used.set(term.ja,term);i+=term.ja.length;}else out+=text[i++];}
 return out.replaceAll('戦闘','战斗').replaceAll('ボス','Boss').replaceAll('フィールド','野外').replaceAll('魔神任務','魔神任务').replaceAll('伝説任務','传说任务').replaceAll('世界任務','世界任务').replaceAll('イベント','活动').replaceAll('ムービー','过场').replaceAll('(昼)','(白天)').replaceAll('(夜)','(夜晚)').replaceAll('海中','水下').replaceAll('・','·');
}
const evidence=[],unmatched=[],failed=albums.filter(a=>a.error);
for(const album of albums.filter(a=>a.tables)){
 const albumTracks=library.tracks.filter(t=>t.sceneInfo);
 const expected=albumTracks.filter(t=>t.album.startsWith('原神-'+album.album+' '));
 const matched=new Map();
 for(const table of album.tables){const header=table[0],placeColumn=header.findIndex(s=>/再生場所|再生エリア/.test(s));
  for(const row of placeColumn<0?table:table.slice(1)){
   const lines=(row[0]??'').split('\n'),english=lines.filter(s=>/[A-Za-z]{2}/.test(s)).join(' ').replace(/\*\d+/g,'');
   if(!english)continue;
   const found=expected.filter(t=>norm(t.sceneInfo.englishTitle)===norm(english));
   if(found.length!==1){if(found.length)unmatched.push({album:album.album,titleJa:lines[0],english,reason:'ambiguous'});continue;}
   const t=found[0],mainRows=main.filter(table=>['エリア','テーマ曲','任務'].includes(table.section)).flatMap(table=>table.rows.slice(1).filter(row=>row[0]?.text===lines[0]&&row.some(cell=>cell?.text?.split('\n').some(s=>s.trim()===album.albumJa))).map(row=>({section:table.section,subsection:table.subsection,placeJa:row[1]?.text??''})));
   const placeJa=row[placeColumn]??mainRows.find(r=>r.section==='エリア')?.placeJa??mainRows[0]?.placeJa??'';const allPlaces=[...new Set([placeJa,...mainRows.map(r=>r.placeJa)].filter(Boolean))];
   let role=mainRows.some(r=>r.subsection==='ボス戦')?'battle-limited':allPlaces.some(s=>/戦闘/.test(s))?'battle':mainRows.some(r=>r.section==='エリア')?'scene':allPlaces.some(s=>/任務|ムービー|イベント|ログイン|PV/.test(s))?'task':'scene';
   const original=t.sceneInfo.originText;
   const conflict=!role.startsWith('battle')&&!/非战斗|战斗状态仍然使用/.test(original)&&/战斗|BOSS|Boss|周本|深海龙蜥|魔王武装/.test(original)?'BWIKI明确战斗；日文仅列地点/任务，不能据此降为常态，保留限定战斗待校对。':null;
   if(conflict)role='battle-limited';
   const item={trackId:t.id,title:t.title,englishTitle:t.sceneInfo.englishTitle,titleJa:lines[0],album:album.album,albumJa:album.albumJa,sourceUrl:album.url,mainSourceUrl:'https://wikiwiki.jp/genshinwiki/BGM',placeJa,placeZh:translate(placeJa),role,...(conflict?{conflict}:{}),contexts:mainRows.map(r=>({...r,placeZh:translate(r.placeJa)}))};
   if(!matched.has(t.id))matched.set(t.id,item);else if(matched.get(t.id).placeJa!==placeJa)unmatched.push({trackId:t.id,reason:'conflicting-album-row',places:[matched.get(t.id).placeJa,placeJa]});
  }
 }
 evidence.push(...matched.values());
 for(const t of expected)if(!matched.has(t.id))unmatched.push({trackId:t.id,title:t.title,album:album.album,reason:'no-unique-bilingual-row'});
}
const result={capturedOn:'2026-10-08',sources:['https://wikiwiki.jp/genshinwiki/BGM','https://genshin-dictionary.com/zh-CN/opendata','https://dataset.genshin-dictionary.com/words.json'],matching:'专辑范围内唯一英文曲名；日文曲名再与主表交叉验证。非唯一不自动写入。地名采用用户指定词典，未收录词保留日文。',tracks:evidence,translationTerms:[...used.values()],unmatched,failedAlbums:failed};
await fs.writeFile('data/sources/ja-bgm-crosscheck.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({matched:evidence.length,battles:evidence.filter(e=>e.role.startsWith('battle')).length,unmatched:unmatched.length,failedAlbums:failed.length,translationTerms:used.size}));
