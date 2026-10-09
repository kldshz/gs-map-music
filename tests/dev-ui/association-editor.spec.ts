import fs from 'node:fs';
const builtin=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const countAt=(id:string)=>builtin.associations.filter((a:any)=>a.anchorId===id).length;
import { test, expect } from '@playwright/test';

test.setTimeout(60000);
test('开发环境普通浏览默认不显示关联编辑，主动启用才出现',async({page})=>{
  await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开面板',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'开发关联编辑',exact:true})).not.toBeChecked();
  await page.locator('.anchor-list button').first().click();
  await expect(page.getByRole('button',{name:'移除关联',exact:true})).toHaveCount(0);
  await expect(page.getByPlaceholder('搜索全部曲目')).toHaveCount(0);
  await page.getByRole('checkbox',{name:'开发关联编辑',exact:true}).check();
  await expect(page.getByRole('button',{name:'移除关联',exact:true}).first()).toBeVisible();
  await page.getByRole('checkbox',{name:'开发关联编辑',exact:true}).uncheck();
  await expect(page.getByRole('button',{name:'移除关联',exact:true})).toHaveCount(0);
});
async function ready(page:any){await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开面板',exact:true}).click();await page.getByRole('checkbox',{name:'开发关联编辑',exact:true}).check();}

test('开发模式点位方向增删、恢复和刷新保存',async({page})=>{
  await ready(page);
  await page.locator('.anchor-list button').filter({hasText:'#kongying:6290'}).click();
  await expect(page.locator('.detail-view')).toContainText(`关联音乐（${countAt('kongying:6290')}）`);
  await page.getByPlaceholder('搜索全部曲目').fill('风所爱之城');
  await page.getByRole('button',{name:'添加到此点位',exact:true}).click();
  await expect(page.locator('.tracks-list .track-detail').filter({hasText:'风所爱之城'})).toHaveCount(1);
  await page.reload();await ready(page);await page.locator('.anchor-list button').filter({hasText:'#kongying:6290'}).click();
  await expect(page.locator('.tracks-list .track-detail').filter({hasText:'风所爱之城'})).toHaveCount(1);
  const manual=page.locator('.tracks-list .track-detail').filter({hasText:'风所爱之城'});
  await manual.getByRole('button',{name:'移除关联',exact:true}).click();
  await expect(page.locator('.edit-message')).toContainText('已移除关联');
  await expect(manual).toHaveCount(0);
  await expect(page.locator('.detail-view')).toContainText(`关联音乐（${countAt('kongying:6290')}）`);
  await page.reload();await ready(page);await page.locator('.anchor-list button').filter({hasText:'#kongying:6290'}).click();
  const afterRemove=page.locator('.tracks-list .track-detail').filter({hasText:'风所爱之城'});
  await expect(afterRemove).toHaveCount(0);
  const source=page.locator('.tracks-list .track-detail').filter({hasText:'饰金的夜色'});
  await source.getByRole('button',{name:'移除关联',exact:true}).click();
  await expect(source).toHaveCount(0);
  await expect(page.locator('.detail-view')).toContainText(`关联音乐（${countAt('kongying:6290')-1}）`);
  await page.reload();await ready(page);await page.locator('.anchor-list button').filter({hasText:'#kongying:6290'}).click();
  await page.getByPlaceholder('搜索全部曲目').fill('饰金的夜色');
  await expect(page.getByRole('button',{name:'恢复来源关联',exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'恢复来源关联',exact:true}).first().click();
  await expect(page.locator('.tracks-list .track-detail').filter({hasText:'饰金的夜色'})).toHaveCount(1);
  await expect(page.locator('.detail-view')).toContainText(`关联音乐（${countAt('kongying:6290')}）`);
  await page.screenshot({path:'.local/dev-browser-tests/editor-anchor.png',fullPage:true});
});

test('开发模式歌曲方向按地区筛选点位，无导出入口',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill('风所爱之城');await page.locator('.track-list .track-item').click();
  await page.locator('summary').filter({hasText:/关联点位/}).click();
  await page.getByLabel('按地区筛选候选点位').selectOption('A:MD:MENGDE');await page.getByRole('searchbox',{name:'搜索候选点位',exact:true}).fill('星落湖');
  await expect(page.getByRole('button',{name:/添加到所选点位/}).first()).toBeVisible();await page.getByRole('button',{name:/添加到所选点位/}).first().click();
  await expect(page.locator('.location-list')).toContainText('星落湖');
  await page.screenshot({path:'.local/dev-browser-tests/editor-track.png',fullPage:true});
  await expect(page.getByRole('button',{name:'导出当前曲库'})).toHaveCount(0);
});
