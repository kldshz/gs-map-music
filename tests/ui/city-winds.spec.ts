import { test, expect } from '@playwright/test';

test.setTimeout(60000);
async function ready(page:any){await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);}
async function track(page:any,query:string){await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox').fill(query);await expect(page.locator('.track-list button')).toHaveCount(1);await page.locator('.track-list button').click();await page.getByText('完整元数据',{exact:true}).click();await page.locator('summary').filter({hasText:/^关联点位/}).click();}

test('专辑63首、蒙德城曲库和神像归档提示、所有关联反向定位',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'曲目检索',exact:true}).click();await expect(page.locator('.track-list button')).toHaveCount(63);
  await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.locator('.anchor-list button').filter({hasText:'#kongying:6625'}).click();
  await expect(page.locator('.detail-view')).toContainText('关联音乐（11）');await expect(page.locator('.detail-view')).toContainText('西风大教堂');
  await page.locator('.detail-view .track-item').filter({hasText:'风所爱之城'}).click();await page.getByText('完整元数据',{exact:true}).click();await page.getByText('关联点位（2）',{exact:true}).click();
  await expect(page.locator('.detail-view')).toContainText('2020-09-28');await expect(page.locator('.location-list')).toContainText('【蒙德 蒙德城】');await expect(page.locator('.association-detail')).toHaveCount(0);await expect(page.locator('.detail-view')).toContainText('蒙德城-白天');
  await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(2);
  await page.getByRole('searchbox').fill('');await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.locator('.anchor-list button').filter({hasText:'#kongying:6557'}).click();
  await expect(page.locator('.detail-view .track-origin').first()).toBeVisible();
});

test('个人评价保存后刷新可见、检索、跨曲不串、清空和恢复；来源原文保持',async({page})=>{
  await ready(page);await track(page,'风所爱之城');const origin=await page.locator('.origin-text').innerText();
  await page.getByLabel('个人评价输入框').fill('测试评价：城中午后很温暖');await page.getByRole('button',{name:'保存评价',exact:true}).click();await expect(page.locator('.note-message')).toContainText('已保存');
  await page.reload();await expect(page.locator('.anchor-list button')).toHaveCount(27);await track(page,'城中午后很温暖');await expect(page.getByLabel('个人评价输入框')).toHaveValue('测试评价：城中午后很温暖');expect(await page.locator('.origin-text').innerText()).toBe(origin);
  await page.keyboard.press('Escape');await track(page,'蒙德城繁忙的午后');await expect(page.getByLabel('个人评价输入框')).toHaveValue('');
  await page.keyboard.press('Escape');await track(page,'风所爱之城');await page.getByLabel('个人评价输入框').fill('');await page.getByRole('button',{name:'保存评价',exact:true}).click();await page.getByRole('button',{name:'恢复导入值',exact:true}).click();await expect(page.getByLabel('个人评价输入框')).toHaveValue('');
  expect(await page.locator('.origin-text').innerText()).toBe(origin);
});

test('来源只到璃月的秘境按五个神像归档，雪山按源地区单神像；无可播放音源',async({page})=>{
  await ready(page);await track(page,'太山府');await expect(page.locator('.location-list button')).toHaveCount(5);await expect(page.locator('.detail-view')).toContainText('璃月 / 璃月 / 太山府');
  await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.getByLabel('选择地区')).toHaveValue('A:LY:LIYUE');await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(5);
  await track(page,'芬德尼尔之顶');await expect(page.locator('.location-list button')).toHaveCount(1);await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.getByLabel('选择地区')).toHaveValue('A:MD:XUESHAN');await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'播放',exact:true})).toBeDisabled();await expect(page.locator('audio')).toHaveCount(0);
});

test('实际查看桌面和手机专辑详情，长内容可滚动到评价，Escape回检索、地图自由操作且无弹窗',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page);await track(page,'风所爱之城');
  await page.screenshot({path:'.local/browser-tests/city-winds-desktop.png'});
  await page.getByLabel('个人评价输入框').scrollIntoViewIfNeeded();await page.screenshot({path:'.local/browser-tests/city-winds-note.png'});
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'曲目检索',exact:true})).toBeFocused();
  await page.setViewportSize({width:390,height:844});await track(page,'芬德尼尔之顶');
  const box=await page.locator('.detail-view').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.width).toBeLessThanOrEqual(390);
  await page.getByLabel('个人评价输入框').scrollIntoViewIfNeeded();await expect(page.getByLabel('个人评价输入框')).toBeInViewport();await page.screenshot({path:'.local/browser-tests/city-winds-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
