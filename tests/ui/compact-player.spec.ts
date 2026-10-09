import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const search='搜索点位、曲目、专辑、地区或细分目录';
const ids=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8')).tracks.slice(0,40).map((t:{id:string})=>t.id) as string[];

for(const width of [1440,1024,320,390])test(`紧凑播放器及图标导航 ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 const footer=page.locator('.app-footer'),rail=page.locator('.s4c-library-rail');
 await expect(footer.getByRole('button',{name:/个人库/})).toHaveCount(0);
 await expect(rail.getByRole('button')).toHaveCount(3);
 const railBoxes=await rail.getByRole('button').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y};}));
 expect(new Set(railBoxes.map(b=>b.x)).size).toBe(1);expect(railBoxes[1].y).toBeGreaterThan(railBoxes[0].y);
 await rail.getByRole('button',{name:'打开收藏'}).focus();await expect(page.getByRole('tooltip')).toContainText('打开收藏');
 const before=await page.locator('.map-container').boundingBox();await rail.getByRole('button',{name:'打开歌单'}).click();
 await expect(page.getByLabel('新建播放列表名称')).toBeVisible();
 if(width>768)await expect.poll(async()=>{const after=await page.locator('.map-container').boundingBox();return before!.width-after!.width;}).toBeGreaterThan(200);
 await page.keyboard.press('Escape');await expect(page.locator('#personal-library-content')).toHaveAttribute('inert','');
 expect(await page.locator('.panel-toggle').evaluate(el=>getComputedStyle(el,'::after').content)).toBe('none');
 await expect(rail.getByRole('button',{name:'展开个人库'})).toBeFocused();
 const center=page.locator('.s4c-player-center');const cb=await center.boundingBox(),fb=await footer.boundingBox();
 expect(fb!.height).toBeLessThanOrEqual(width>768?100:175);
 const buttons=center.getByRole('button');await expect(buttons).toHaveCount(5);
 const labels=await buttons.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));expect(labels).toEqual(['开启随机播放','上一首','播放','下一首','关闭循环']);
 const progress=await page.getByLabel('播放进度').boundingBox();expect(progress!.x).toBeGreaterThanOrEqual(cb!.x);expect(progress!.x+progress!.width).toBeLessThanOrEqual(cb!.x+cb!.width+1);
 if(width>768){expect(Math.abs(cb!.x+cb!.width/2-width/2)).toBeLessThan(2);expect(progress!.width).toBeLessThan(width*.55);}
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.local/browser-tests/compact-${width}.png`});
});

test('长队列独立滚动，当前曲突出，连续切换不改队列；手机图标抽屉互斥',async({page})=>{
 await page.addInitScript(ids=>localStorage.setItem('gs-map-music.player.v1',JSON.stringify({schemaVersion:1,currentId:ids[0],queueIds:ids,position:0,volume:.4,shuffle:false,repeat:'off'})),ids);
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'展开队列',exact:true}).click();
 await expect(page.locator('.playback-queue [aria-current="true"]')).toHaveCount(1);
 const scroller=page.locator('.s4c-queue-scroll');expect(await scroller.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await scroller.evaluate(el=>el.scrollTop=500);expect(await scroller.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'打开收藏',exact:true}).click();await expect(page.locator('.playback-queue')).toHaveCount(0);await expect(page.locator('.personal-library')).toBeVisible();await expect(page.locator('.side-panel')).toHaveClass(/collapsed/);
 await page.getByRole('button',{name:'展开队列',exact:true}).click();await expect(page.locator('#personal-library-content')).toHaveAttribute('inert','');
 await page.getByRole('button',{name:'收起队列',exact:true}).filter({visible:true}).first().click();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs-map-music.player.v1')!));expect(stored.queueIds).toEqual(ids);expect(stored.currentId).toBe(ids[0]);
});

test('队列替换完整右栏，恢复筛选详情及滚动/收拢；独立滚动和减弱动画',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByLabel(search).fill('1455706951');
 await page.locator('.track-list .track-item').click();await page.locator('.track-detail-head').getByRole('button',{name:'加入队列',exact:true}).click();
 await page.getByText(/^关联点位（/).click();
 const original=await page.locator('.s4c-explorer-view').evaluate(el=>{el.scrollTop=80;return el.scrollTop;});
 const toggle=page.locator('.player-bar').getByRole('button',{name:'展开队列',exact:true});await toggle.click();
 const queue=page.locator('.playback-queue');await expect(queue).toBeVisible();await expect(page.locator('.s4c-explorer-view')).toBeHidden();
 await expect(page.locator('.player-bar').getByRole('button',{name:'收起队列',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.s4c-queue-title')).toBeFocused();
 await expect.poll(()=>queue.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
 const qb=await queue.boundingBox(),pb=await page.locator('#side-panel-content').boundingBox(),fb=await page.locator('.app-footer').boundingBox();
 expect(Math.abs(qb!.y-pb!.y)).toBeLessThan(2);expect(Math.abs(qb!.height-pb!.height)).toBeLessThan(2);expect(qb!.y+qb!.height).toBeLessThanOrEqual(fb!.y+1);
 await queue.getByRole('button',{name:'收起队列',exact:true}).click();await expect(queue).toHaveCount(0);await expect(page.locator('.track-detail-view')).toBeVisible();
 await expect(page.locator('.track-locations-section')).toHaveAttribute('open','');
 expect(await page.locator('.s4c-explorer-view').evaluate(el=>el.scrollTop)).toBe(original);
 await expect(page.getByLabel(search)).toHaveValue('1455706951');
 await page.getByRole('button',{name:'收起面板',exact:true}).click();await toggle.click();await expect(queue).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.side-panel')).toHaveClass(/collapsed/);await expect(toggle).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();
 expect(await queue.evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(.02);
});

test('桌面同时打开个人库与队列，改为手机后只保留一个抽屉',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'展开队列',exact:true}).click();await page.getByRole('button',{name:'打开歌单',exact:true}).click();
 await expect(page.locator('.personal-library')).toBeVisible();await expect(page.locator('.playback-queue')).toBeVisible();
 await page.setViewportSize({width:320,height:844});await expect(page.locator('.playback-queue')).toHaveCount(0);await expect(page.locator('.side-panel')).toHaveClass(/collapsed/);
 await expect(page.getByLabel('新建播放列表名称')).toBeVisible();await expect(page.locator('#side-panel-content')).toHaveAttribute('inert','');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('右栏队列排序、移除及清空绑定到各自歌曲，当前曲目保留',async({page})=>{
 const sample=ids.slice(0,3);
 await page.addInitScript(ids=>localStorage.setItem('gs-map-music.player.v1',JSON.stringify({schemaVersion:1,currentId:ids[0],queueIds:ids,position:0,volume:.4,shuffle:false,repeat:'off'})),sample);
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开队列',exact:true}).click();
 const queue=page.locator('.playback-queue'),items=queue.locator('li');
 await expect(items.first().getByRole('button',{name:'上移',exact:true})).toBeDisabled();await expect(items.last().getByRole('button',{name:'下移',exact:true})).toBeDisabled();
 const title=await items.nth(1).locator('.s4c-queue-name').textContent();await items.nth(1).getByRole('button',{name:'上移',exact:true}).click();await expect(items.first()).toContainText(title!.trim());
 await items.first().getByRole('button',{name:'下移',exact:true}).click();await items.first().getByRole('button',{name:'移除',exact:true}).click();
 await expect(items).toHaveCount(2);await expect(queue.locator('div.s4c-queue-item.is-current')).toBeVisible();
 await queue.getByRole('button',{name:'清空队列',exact:true}).click();await expect(queue).toContainText('队列为空');await expect(queue.locator('div.s4c-queue-item.is-current')).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gs-map-music.player.v1')!));expect(stored.queueIds).toEqual([]);expect(stored.currentId).toBe(sample[0]);
});
