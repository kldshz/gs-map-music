import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({javaScriptEnabled:false});
 await page.route('**/*',route=>route.abort());
 for(const file of ['albums','album']){
  await page.setContent(await fs.readFile(`.local/music-pilot/${file}.html`,'utf8'),{waitUntil:'domcontentloaded'});
  const data=await page.evaluate(()=>({title:document.title,revision:document.documentElement.innerHTML.match(/"wgRevisionId":(\d+)/)?.[1],
   sections:Array.from(document.querySelectorAll('.mw-parser-output h2,.mw-parser-output h3')).map(e=>e.textContent),
   tables:Array.from(document.querySelectorAll('.mw-parser-output table.wikitable')).map(t=>({caption:t.querySelector('caption')?.textContent?.trim()??'',
    section:Array.from(document.querySelectorAll('.mw-parser-output h2,.mw-parser-output h3')).filter(h=>h.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.textContent??'',
    rows:Array.from(t.querySelectorAll('tr')).map(tr=>Array.from(tr.querySelectorAll('td,th')).map(td=>({text:td.innerText.trim(),links:Array.from(td.querySelectorAll('a[href]')).map(a=>({text:a.textContent,href:a.getAttribute('href')}))})))
   }))}));
  await fs.writeFile(`.local/music-pilot/${file}-tables.json`,JSON.stringify(data,null,2));
  console.log(file,JSON.stringify({title:data.title,revision:data.revision,sections:data.sections,tables:data.tables.map(t=>({caption:t.caption,section:t.section,rows:t.rows.length}))}));
 }
}finally{await browser.close()}
