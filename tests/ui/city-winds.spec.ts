import fs from 'node:fs';
const builtin=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const countAt=(id:string)=>builtin.associations.filter((a:any)=>a.anchorId===id).length;
import { test, expect } from '@playwright/test';

test.setTimeout(60000);
async function ready(page:any){await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开面板',exact:true}).click();}
async function track(page:any,query:string){await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill(query);await expect(page.locator('.track-list .track-item')).toHaveCount(1);await page.locator('.track-list .track-item').click();await page.locator('summary').filter({hasText:/^关联点位/}).click();}

test('专辑63首、蒙德城曲库和神像归档提示、所有关联反向定位',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'曲目检索',exact:true}).click();await expect(page.locator('.track-list .track-item')).toHaveCount(builtin.tracks.length);
  await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.locator('.anchor-list button').filter({hasText:'#kongying:6625'}).click();
  await expect(page.locator('.detail-view')).toContainText(`关联音乐（${countAt('kongying:6625')}）`);await expect(page.locator('.detail-view')).toContainText('西风大教堂');
  await page.locator('.detail-view .track-item').filter({hasText:'风所爱之城'}).click();await page.getByText('关联点位（2）',{exact:true}).click();
  await expect(page.locator('.detail-view')).toContainText('2020-09-28');await expect(page.locator('.location-list')).toContainText('【蒙德 蒙德城】');await expect(page.locator('.association-detail')).toHaveCount(0);await expect(page.locator('.detail-view')).toContainText('蒙德城-白天');
  await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(2);
  await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill('');await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.locator('.anchor-list button').filter({hasText:'#kongying:6557'}).click();
  await expect(page.locator('.detail-view .track-origin').first()).toBeVisible();
});

test('撤下评价及独立来源界面，历史评价保留且不再参与检索',async({page})=>{
  const old=JSON.stringify({schemaVersion:1,notes:{'netease:1455706951':'历史评价专用检索词XYZ'}});
  await page.addInitScript(value=>{if(!sessionStorage.getItem('notes-seeded')){localStorage.setItem('gs-map-music.personal-notes.v1',value);sessionStorage.setItem('notes-seeded','1');}},old);
  await ready(page);await track(page,'风所爱之城');await expect(page.getByLabel('个人评价输入框')).toHaveCount(0);
  await expect(page.locator('.track-detail-view > details')).toHaveCount(2);await expect(page.getByText('完整元数据',{exact:true})).toHaveCount(0);
  await expect(page.getByText('歌曲元数据来源',{exact:true})).toHaveCount(0);await expect(page.getByText('曲目说明',{exact:true})).toHaveCount(0);
  const origin=await page.locator('.origin-text').innerText();await page.reload();await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开面板',exact:true}).click();await track(page,'风所爱之城');expect(await page.locator('.origin-text').innerText()).toBe(origin);
  expect(await page.evaluate(()=>localStorage.getItem('gs-map-music.personal-notes.v1'))).toBe(old);
  await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByLabel('搜索点位、曲目、专辑、地区或细分目录').fill('历史评价专用检索词XYZ');await expect(page.locator('.track-list .track-item')).toHaveCount(0);
});

test('来源只到璃月的秘境按五个神像归档，雪山按源地区单神像；无可播放音源',async({page})=>{
  await ready(page);await track(page,'太山府');await expect(page.locator('.location-list button')).toHaveCount(5);await expect(page.locator('.detail-view')).toContainText('统一分类路径');await expect(page.locator('.geo-scope-list')).toContainText('璃月');await expect(page.locator('.origin-text')).toContainText('太山府');
  await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.getByLabel('选择地区')).toHaveValue('A:LY:LIYUE');await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(5);
  await track(page,'芬德尼尔之顶');await expect(page.locator('.location-list button')).toHaveCount(1);await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.getByLabel('选择地区')).toHaveValue('A:MD:XUESHAN');await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'播放',exact:true})).toBeDisabled();await expect(page.locator('audio')).toHaveCount(0);
});

test('实际查看桌面和手机专辑详情，长内容可滚动到关联点位，Escape回检索、地图自由操作且无弹窗',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page);await track(page,'风所爱之城');
  await page.screenshot({path:'.local/browser-tests/city-winds-desktop.png'});
  await page.getByRole('button',{name:'在地图上定位全部'}).scrollIntoViewIfNeeded();await page.screenshot({path:'.local/browser-tests/city-winds-note.png'});
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'曲目检索',exact:true})).toBeFocused();
  await page.setViewportSize({width:390,height:844});await track(page,'芬德尼尔之顶');
  const box=await page.locator('.detail-view').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.width).toBeLessThanOrEqual(390);
  await page.getByRole('button',{name:'在地图上定位全部'}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'在地图上定位全部'})).toBeInViewport();await page.screenshot({path:'.local/browser-tests/city-winds-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
