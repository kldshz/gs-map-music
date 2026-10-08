import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const map=JSON.parse(fs.readFileSync('public/data/kongying-map.json','utf8'));
const report=JSON.parse(fs.readFileSync('data/review/geography-reclassification.json','utf8'));
const review={tracks:report.classifications.map((t:any)=>({...t,id:t.trackId,countries:[...new Set(t.scopes.map((s:any)=>s.country))],areaCodes:[...new Set(t.anchorIds.map((id:string)=>map.anchors.find((a:any)=>a.id===id).areaCode))]}))};
test.setTimeout(60000);
async function open(page:any,id:string){
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();
 await page.getByRole('searchbox').fill(id.replace('netease:',''));
 await expect(page.locator('.track-list button')).toHaveCount(1);await page.locator('.track-list button').click();
 await page.getByText('完整元数据',{exact:true}).click();await page.locator('summary').filter({hasText:/^关联点位/}).click();
}
test('全批次检索/原出处/限定未挂与特殊地图零挂载，保留全部定位',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await expect(page.locator('.track-list button')).toHaveCount(library.tracks.length);
 const special=review.tracks.find((t:any)=>t.category==='special-map');await open(page,special.id);
 await expect(page.locator('.location-list button')).toHaveCount(0);await expect(page.locator('.detail-view')).toContainText(special.countries[0]);
 await expect(page.locator('.association-status')).toHaveCount(0);await expect(page.getByRole('button',{name:'在地图上定位全部'})).toHaveCount(0);
 const boss=review.tracks.find((t:any)=>t.title.startsWith('六轮一露狂诗曲'));await open(page,boss.id);
 await expect(page.locator('.location-list button')).toHaveCount(0);await expect(page.locator('.origin-text')).toContainText('正机之神');
 const unknown=review.tracks.find((t:any)=>!t.countries.length);await open(page,unknown.id);await expect(page.locator('.detail-view')).toContainText('未定位');
 const battle=review.tracks.find((t:any)=>t.title.startsWith('战斗的秘仪'));await open(page,battle.id);
 const count=library.associations.filter((a:any)=>a.trackId===battle.id).length;await expect(page.locator('.location-list button')).toHaveCount(count);await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(count);
 await expect(page.locator('.association-detail')).toHaveCount(0);await page.screenshot({path:'.local/browser-tests/ost-bulk-battle.png'});
});
test('悠悠度假村与霜月真实点位支持反向定位，手机长说明可读',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 for(const code of ['A:NT:NATA5','A:NDKL:SY']){
  const t=review.tracks.find((t:any)=>t.areaCodes.length===1&&t.areaCodes[0]===code&&t.anchorIds.length);
  await open(page,t.id);await page.getByRole('button',{name:'在地图上定位全部'}).click();
  const currentAnchors=library.associations.filter((a:any)=>a.trackId===t.id);
  await expect(page.getByLabel('选择地区')).toHaveValue(code);await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(currentAnchors.length);
 }
 await expect.poll(()=>page.locator('.leaflet-tile-loaded').count(),{timeout:20000}).toBeGreaterThan(0);
 await page.getByLabel('个人评价输入框').scrollIntoViewIfNeeded();await expect(page.getByLabel('个人评价输入框')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'.local/browser-tests/ost-bulk-mobile.png'});
});

test('日文补充以中文显示，缺少出处明确标注',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 for(const prefix of ['日文Wiki补充（中文）：','缺少出处']){
  const t=library.tracks.find((t:any)=>t.sceneInfo.originText.startsWith(prefix));
  await open(page,t.id);await expect(page.locator('.origin-text')).toContainText(t.sceneInfo.originText);
 }
});
