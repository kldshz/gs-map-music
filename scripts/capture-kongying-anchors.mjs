import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const out='.local/map-region-extract';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();
let auth='';
page.on('request',r=>{if(r.url().includes('cloud.yuanshen.site/api/item/get/list'))auth=r.headers()['authorization']??'';});
await page.goto('https://v3.yuanshen.site/',{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForResponse(r=>r.url().includes('/api/item/get/list')&&r.status()===200,{timeout:40000});
async function request(endpoint,data){
 const result=await page.evaluate(async({endpoint,data,auth})=>{
  const r=await fetch('https://cloud.yuanshen.site/api'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify(data)});
  const body=await r.json();return {status:r.status,body};
 },{endpoint,data,auth});
 if(result.status!==200||result.body.errorStatus!==200)throw new Error(endpoint+' failed '+result.status+' '+result.body.errorStatus);
 console.log(endpoint,'records',result.body.data?.record?.length??result.body.data?.length,'total',result.body.data?.total);
 return result.body.data;
}
try{
 const areas=await request('/area/get/list',{isTraverse:true,parentId:-1});
 const items=[];
 for(const area of areas.filter(a=>a.isFinal)){
  const data=await request('/item/get/list',{typeIdList:[],areaIdList:[area.id],current:0,size:9999,sort:['sortIndex-']});
  items.push(...data.record.filter(x=>['传送锚点','七天神像'].includes(x.name)));
 }
 console.log('anchor items',items.length,'names', [...new Set(items.map(x=>x.name))]);
 await fs.writeFile(out+'/anchor-items.json',JSON.stringify({areas,items},null,2));
 // Next requests follow the same payload as the source layer loader.
 const info=await request('/marker/get/list_byinfo',{typeIdList:[],areaIdList:[],itemIdList:items.map(x=>x.id),getBeta:0});
 await fs.writeFile(out+'/anchor-info.json',JSON.stringify(info,null,2));
 if(!Array.isArray(info))throw new Error('Unexpected marker response');
 const ids=info.map(x=>x.id);
 const markers=[];
 for(let i=0;i<ids.length;i+=200){
  const batch=await request('/marker/get/list_byid',{markerIdList:ids.slice(i,i+200)});
  markers.push(...batch);
 }
 const icons=await request('/icon/get/list',{iconIdList:[...new Set(items.map(x=>x.iconId))],typeIdList:[],current:0,size:9999});
 const config=await page.evaluate(async()=>await(await fetch('https://assets.yuanshen.site/webapp.json')).json());
 if(new Set(ids).size!==ids.length||new Set(markers.map(m=>m.id)).size!==markers.length||markers.length!==ids.length||markers.some(m=>!ids.includes(m.id)))throw new Error('Marker completeness mismatch');
 await fs.writeFile(out+'/anchors-full.json',JSON.stringify({capturedOn:new Date().toISOString().slice(0,10),areas,items,markers,icons,config},null,2));
 console.log('Captured',markers.length,'markers; raw data remains in ignored .local only. No authorization saved.');
}finally{await browser.close();}
