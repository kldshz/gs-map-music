import fs from 'node:fs/promises';
import {chromium} from 'playwright';
await fs.mkdir('.local',{recursive:true});
async function cached(path,url){
 const previous=await fs.readFile(path,'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return null;});if(previous)return previous;
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error(response.status+' '+url);
 const text=await response.text();await fs.writeFile(path,text);return text;
}
const html=await cached('.local/bgm-ja.html','https://wikiwiki.jp/genshinwiki/BGM');
await cached('.local/genshin-words.json','https://dataset.genshin-dictionary.com/words.json');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent(html);
 const result=await page.evaluate(()=>{
  let section='',subsection='';const out=[];
  for(const e of document.querySelectorAll('h2,h3,h4,table')){
   if(e.tagName==='H2'){section=e.textContent.trim();subsection='';}
   else if(e.tagName!=='TABLE')subsection=e.textContent.trim();
   else{
    const rows=[],spans=[];
    for(const row of e.rows){const cells=[];for(let i=0;i<spans.length;i++)if(spans[i]?.left){cells[i]=spans[i].value;spans[i].left--;}
     let col=0;for(const cell of row.cells){while(cells[col]!==undefined)col++;const value={text:cell.innerText.trim(),links:[...cell.querySelectorAll('a')].map(a=>({text:a.textContent,url:a.getAttribute('href')}))};cells[col]=value;if(cell.rowSpan>1)spans[col]={left:cell.rowSpan-1,value};col++;}rows.push(cells);
    }
    out.push({section,subsection,rows});
   }
  }return out;
 });
 await fs.writeFile('.local/bgm-ja-tables.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({tables:result.length}));
}finally{await browser.close();}
