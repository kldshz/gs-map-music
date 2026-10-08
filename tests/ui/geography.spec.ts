import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
test('统一目录可检索，木屋/远点留空正确，柔灯港歌曲仅定位港口',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByLabel('选择地区').selectOption('A:ZD:ZHIDONG1');
 await page.getByRole('searchbox').fill('121680');await page.locator('.anchor-list button').click();
 await expect(page.locator('.anchor-info').first()).toContainText('巡猎者木屋');await expect(page.locator('.anchor-info').first()).toContainText('古兽冰原');
 await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.getByRole('searchbox').fill('121678');await page.locator('.anchor-list button').click();
 await expect(page.locator('.anchor-info').first()).toContainText('未细分');await expect(page.locator('.anchor-info').first()).not.toContainText('巡猎者木屋');
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();
 const track=library.tracks.find((t:any)=>t.sceneInfo.wikiTitle==='煦风染细浪');
 await page.getByRole('searchbox').fill(track.neteaseId);await page.locator('.track-list button').click();
 await page.getByText('完整元数据',{exact:true}).click();await expect(page.locator('.geo-scope-list')).toContainText('枫丹 / 伊黎耶林区 / 柔灯港');
 await page.locator('summary').filter({hasText:/^关联点位/}).click();await expect(page.locator('.location-list button')).toHaveCount(1);
 await page.getByRole('button',{name:'在地图上定位全部'}).click();await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(1);
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.screenshot({path:'.local/browser-tests/geography-softlight.png'});
});
