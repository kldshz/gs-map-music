import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('public/data/kongying-map.json','utf8'));
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));

test('所有国家神像可从目录/地图进入，新月神像可查看归档曲并刷新保留',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'神像',exact:true}).click();
 for(const code of ['A:MD:MENGDE','A:LY:LIYUE','A:DQ:1','A:XM:FOREST','A:FD:FENGDAN','A:NT:NATA','A:NDKL:NDKL','A:ZD:ZHIDONG1']){
  await page.getByLabel('选择地区').selectOption(code);
  const count=map.anchors.filter((a:any)=>a.areaCode===code&&a.kind==='statue').length;
  await expect(page.locator('.anchor-list button')).toHaveCount(count);await expect(page.locator('.music-anchor')).toHaveCount(count);
 }
 await page.getByLabel('选择地区').selectOption('A:NDKL:NDKL');
 await page.getByRole('searchbox').fill('105784');await page.locator('.anchor-list button').click();
 await expect(page.locator('.sidebar-detail-title')).toContainText('新月神像');
 await expect(page.locator('.detail-view')).toContainText(`关联音乐（${library.associations.filter((a:any)=>a.anchorId==='kongying:105784').length}）`);
 await expect(page.locator('.detail-view')).not.toContainText('暂无关联音乐');
 await page.screenshot({path:'.local/browser-tests/music-new-moon-statue.png'});
 await page.reload();await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByLabel('选择地区').selectOption('A:NDKL:NDKL');await page.getByRole('button',{name:'神像',exact:true}).click();
 await expect(page.locator('.anchor-list button')).toHaveCount(3);
});

test('空之神殿目录去重，专曲与父级回退显示在右栏；角色与Boss具有神像存储',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByLabel('选择地区').selectOption('A:MD:SHENDIAN');
 await page.getByRole('searchbox').fill('116365');await page.locator('.anchor-list button').click();
 await expect(page.locator('.anchor-info').first()).toContainText('麓阳书院');
 // The original source description still contains the full header; test the dedicated geographic field.
 await expect(page.locator('.anchor-info').first().locator('dd').nth(4)).toHaveText('麓阳书院');
 await expect(page.locator('.tracks-list')).toContainText('一画开天');await expect(page.locator('.tracks-list')).not.toContainText('岁时何处');
 await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.getByRole('searchbox').fill('116354');await page.locator('.anchor-list button').click();
 await expect(page.locator('.anchor-info').first().locator('dd').nth(4)).toHaveText('未细分');
 await expect(page.locator('.tracks-list')).toContainText('岁时何处');await expect(page.locator('.tracks-list')).toContainText('生年不满百');
 await expect(page.locator('.tracks-list')).not.toContainText('一画开天');
 await page.screenshot({path:'.local/browser-tests/music-temple-fallback.png'});
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();
 const track=library.tracks.find((t:any)=>t.sceneInfo.wikiTitle==='冰封交响曲');await page.getByRole('searchbox').fill(track.neteaseId);await page.locator('.track-list button').click();
 await page.locator('summary').filter({hasText:/^关联点位/}).click();
 const links=page.locator('.location-list button');await expect(links).toHaveCount(library.associations.filter((a:any)=>a.trackId===track.id).length);
 for(const text of await links.allTextContents())expect(text).toContain('神像');
 await expect(page.locator('dialog[open]')).toHaveCount(0);
});
