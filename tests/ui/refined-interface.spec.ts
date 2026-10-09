import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const id='netease:1455706951';
const label='搜索点位、曲目、专辑、地区或细分目录';

test('同卡操作明确曲目，收藏星标与文字专辑地区交集索引',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByLabel(label).fill('1455706951');
 const card=page.locator(`.track-card[data-track-id="${id}"]`);
 await card.getByRole('button',{name:'收藏',exact:true}).click();await expect(card.getByRole('img',{name:'已收藏',exact:true})).toBeVisible();
 await page.getByRole('switch',{name:'仅收藏',exact:true}).check();
 await page.getByLabel('筛选专辑').selectOption(library.tracks.find((t:any)=>t.id===id).album);await page.getByLabel('筛选音乐地区').selectOption('蒙德');await expect(page.locator('.track-list > li')).toHaveCount(1);
 await card.getByRole('button',{name:'加入队列',exact:true}).click();
 const stored=JSON.parse((await page.evaluate(()=>localStorage.getItem('gs-map-music.player.v1')))!);expect(stored.queueIds).toEqual([id]);
 await page.getByLabel('筛选音乐地区').selectOption('枫丹');await expect(page.locator('.track-list > li')).toHaveCount(0);
 await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.getByLabel(label).fill('');await page.locator('.anchor-list button').filter({hasText:'#kongying:6285'}).click();
 await expect(page.locator(`.tracks-list [data-track-id="${id}"]`).getByRole('img',{name:'已收藏',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'移除关联',exact:true})).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'开发关联编辑'})).toHaveCount(0);
});

test('简化单曲信息、定位按钮留白、来源不进入播放器，键盘图标提示',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByLabel(label).fill('1455706951');await page.locator('.track-list .track-item').click();
 await expect(page.locator('.track-detail-view > details')).toHaveCount(2);await expect(page.locator('.track-basic-section')).toHaveAttribute('open','');await expect(page.locator('.origin-text')).toContainText('晨曦酒庄');
 await expect(page.getByLabel('个人评价输入框')).toHaveCount(0);await expect(page.locator('input[type=file]')).toHaveCount(0);await expect(page.getByRole('button',{name:'导出当前曲库'})).toHaveCount(0);
 await page.getByText(/^关联点位（/).click();
 const margins=await page.locator('.locate-btn').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('details')!.getBoundingClientRect();return {left:a.left-b.left,right:b.right-a.right,top:a.top-b.top};});expect(margins.left).toBeGreaterThanOrEqual(12);expect(margins.right).toBeGreaterThanOrEqual(12);expect(margins.top).toBeGreaterThanOrEqual(12);
 await expect(page.locator('.player-bar')).not.toContainText(/网易|音频来源|公开外链/);
 const button=page.locator('.track-detail-head').getByRole('button',{name:'加入队列',exact:true});await button.focus();await expect(page.getByRole('tooltip')).toContainText('加入队列');
 const tooltip=await page.getByRole('tooltip').boundingBox();expect(tooltip!.x).toBeGreaterThanOrEqual(0);expect(tooltip!.y).toBeGreaterThanOrEqual(0);
});

for(const width of [1280,320])test(`返修布局${width}px：播放器居中、侧栏边界、收起可重新打开`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 const controls=await page.locator('.s4c-player-center').boundingBox();expect(Math.abs(controls!.x+controls!.width/2-width/2)).toBeLessThan(25);
 await page.getByRole('button',{name:'收起面板',exact:true}).click();await expect(page.getByRole('button',{name:'点位目录',exact:true})).not.toBeVisible();
 await expect(page.locator('#side-panel-content')).toHaveAttribute('inert','');await page.getByRole('button',{name:'展开面板',exact:true}).click();await expect(page.getByRole('button',{name:'点位目录',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'展开个人库',exact:true}).click();await expect(page.locator('.personal-library')).toBeVisible();
 if(width===320)await expect(page.getByRole('button',{name:'展开面板',exact:true})).toBeVisible();
 await expect.poll(async()=>page.evaluate(()=>{const header=document.querySelector('header')!.getBoundingClientRect(),footer=document.querySelector('footer')!.getBoundingClientRect(),left=document.querySelector('.s4r-library-sidebar')!.getBoundingClientRect();return left.top>=header.bottom-1&&left.bottom<=footer.top+1;})).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#personal-library-content')).toHaveAttribute('inert','');await expect(page.getByRole('button',{name:'展开个人库',exact:true})).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const map=await page.locator('.map-container').boundingBox();expect(map!.height).toBeGreaterThanOrEqual(240);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.side-panel').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(.02);
});
