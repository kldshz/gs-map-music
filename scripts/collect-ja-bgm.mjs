import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const catalog=(await read('.local/bgm-ja-tables.json'))[0],source=await read('data/sources/ost-bulk-source.json');
const aliases={'竟夜有辉之燎':'夜を照らす焔','幽暮衬映之月':'夕暮れを照らす月'};
const albums=[...source.albums,{title:'风与牧歌之城',releaseDate:'2020-09-28'}];
await fs.mkdir('.local/ja-bgm',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
try{
 for(let offset=0;offset<albums.length;offset+=1){
  const batch=await Promise.allSettled(albums.slice(offset,offset+1).map(async album=>{
   const rows=catalog.rows.filter(r=>aliases[album.title]?r[0]?.text===aliases[album.title]:r[1]?.text.replaceAll('/','-')===album.releaseDate);
   if(rows.length!==1)throw new Error('album catalogue ambiguity '+album.title);
   const row=rows[0],url=new URL(row[0].links[0].url,'https://wikiwiki.jp').href.split('#')[0];
   const path='.local/ja-bgm/'+encodeURIComponent(decodeURIComponent(url.split('/').at(-1)))+'.html';
   let html=await fs.readFile(path,'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
   if(!html){await new Promise(resolve=>setTimeout(resolve,2500));const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(response.status+' '+url);html=await response.text();await fs.writeFile(path,html);}
   const page=await browser.newPage();
   try{
    await page.route('**/*',r=>r.abort());await page.setContent(html);
    const tables=await page.evaluate(()=>[...document.querySelectorAll('table')].map(table=>{
     const grid=[],spans=[];
     for(const row of table.rows){const cells=[];for(let i=0;i<spans.length;i++)if(spans[i]?.left){cells[i]=spans[i].value;spans[i].left--;}
      let col=0;for(const cell of row.cells){while(cells[col]!==undefined)col++;const value=cell.innerText.trim();cells[col]=value;if(cell.rowSpan>1)spans[col]={left:cell.rowSpan-1,value};col++;}grid.push(cells);
     }return grid;
    }).filter(t=>t[0]?.includes('曲名')||/[A-Za-z]{2}/.test(t[0]?.[0]??'')));
    return {album:album.title,albumJa:row[0].text,url,catalogDate:row[1].text,tables};
   }finally{await page.close();}
  }));
  for(let i=0;i<batch.length;i++){const r=batch[i];if(r.status==='fulfilled'){results.push(r.value);console.log(r.value.album,r.value.tables.reduce((n,t)=>n+t.length-1,0));}else {results.push({album:albums[offset+i].title,error:String(r.reason)});console.log(String(r.reason));}}
  if(batch.some(r=>r.status==='rejected'&&String(r.reason).includes('429')))break;
 }
}finally{await browser.close();}
await fs.writeFile('.local/ja-bgm-albums.json',JSON.stringify(results,null,2)+'\n');
