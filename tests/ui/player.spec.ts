import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const track=library.tracks.find((t:any)=>t.neteaseId==='1455706951');
const ids=library.tracks.slice(0,3).map((t:any)=>t.id);
async function selectTrack(page:any,id=track.neteaseId){
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill(id);await page.locator('.track-list .track-item').click();
}
test('专辑/地区与文字交集筛选，地图地区不被检索筛选改变',async({page})=>{
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByLabel('筛选专辑').selectOption(track.album);await page.getByLabel('筛选音乐地区').selectOption('蒙德');
 const expected=library.tracks.filter((t:any)=>t.album===track.album&&t.sceneInfo.geographicScopes.some((s:any)=>s.country==='蒙德')).length;await expect(page.locator('.track-list > li')).toHaveCount(expected);
 await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill('1455706951');await expect(page.locator('.track-list > li')).toHaveCount(1);
 await page.getByLabel('筛选音乐地区').selectOption('枫丹');await expect(page.locator('.empty-state')).toContainText('没有匹配');await expect(page.getByLabel('选择地区')).toHaveValue('A:MD:MENGDE');
});
test('无音源不产生audio或增长进度；队列/模式/音量刷新恢复等待点击',async({page})=>{
 await page.route('**/api/playback/resolve?*',route=>route.fulfill({json:{status:'unavailable',reason:'permission',message:'测试：无播放权限'}}));
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await selectTrack(page);
 await page.getByRole('button',{name:'播放此曲',exact:true}).click();await expect(page.locator('.player-status')).toHaveText('测试：无播放权限');await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByLabel('播放进度')).toBeDisabled();
 await page.getByLabel('音量').fill('30');await page.getByRole('button',{name:'开启随机播放'}).click();await page.getByRole('button',{name:'关闭循环',exact:true}).click();await page.reload();await expect(page.locator('.player-title')).toContainText('晨曦酒庄');await expect(page.locator('.s4c-player-feedback')).toContainText('已恢复');await expect(page.getByLabel('音量')).toHaveValue('30');await expect(page.getByRole('button',{name:'关闭随机播放'})).toHaveAttribute('aria-pressed','true');await expect(page.locator('audio')).toHaveCount(0);
});
test('左侧歌单创建即添加待选曲、索引排序/重命名/移除刷新保存',async({page})=>{
 page.on('dialog',()=>{throw Error('禁止中心弹窗');});
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await selectTrack(page);
 await page.locator('.track-detail-head').getByRole('button',{name:'收藏',exact:true}).click();
 await page.locator('.track-detail-head').getByRole('button',{name:'添加到播放列表',exact:true}).click();await page.getByRole('menuitem',{name:'创建播放列表',exact:true}).click();
 const left=page.locator('.s4r-library-sidebar');await expect(left).toContainText('晨曦酒庄');
 await left.getByLabel('新建播放列表名称').fill('阶段4校验');await left.getByRole('button',{name:'创建播放列表',exact:true}).click();
 await expect(left.locator('.playlist-summary')).toContainText('阶段4校验');await expect(left.locator('.playlist-tracks')).toContainText('晨曦酒庄');await expect(left.locator('.s4r-pending-track')).toHaveCount(0);
 await selectTrack(page,'1455706952');await page.locator('.track-detail-head').getByRole('button',{name:'添加到播放列表',exact:true}).click();await page.getByRole('menuitem',{name:'阶段4校验',exact:true}).click();
 await expect(left.locator('.playlist-tracks > .s4r-track-item')).toHaveCount(2);
 await left.locator('.playlist-tracks > .s4r-track-item').nth(1).getByRole('button',{name:'上移',exact:true}).click();await expect(left.locator('.playlist-tracks > .s4r-track-item').first()).toContainText('孤独的旅居');
 await left.getByLabel('搜索歌单').fill('晨曦');await expect(left.locator('.playlist-tracks > .s4r-track-item')).toHaveCount(1);await left.getByLabel('搜索歌单').fill('');
 await left.getByRole('button',{name:'重命名',exact:true}).click();await left.getByLabel('播放列表新名称').fill('校验已改名');await left.getByRole('button',{name:'保存名称',exact:true}).click();await expect(left.locator('.playlist-summary')).toContainText('校验已改名');
 await page.reload();await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开个人库',exact:true}).click();await expect(left).toContainText('晨曦酒庄');await left.getByRole('button',{name:/^播放列表 /}).click();
 await left.getByRole('button',{name:'查看播放列表 校验已改名',exact:true}).click();await expect(left.locator('.playlist-tracks')).toContainText('孤独的旅居');
 await left.locator('.playlist-tracks > .s4r-track-item').first().getByRole('button',{name:'从列表移除',exact:true}).click();await left.locator('.playlist-tracks > .s4r-track-item').first().getByRole('button',{name:'从列表移除',exact:true}).click();await expect(left.locator('.playlist-empty')).toContainText('为空');
 await left.getByRole('button',{name:'删除',exact:true}).click();await expect(left.locator('.playlist-summary')).toHaveCount(0);
});

test('恢复失效曲目仍可从队列移除；手机队列/个人库与错误信息可访问',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('gs-map-music.player.v1',JSON.stringify({schemaVersion:1,currentId:'netease:deleted',queueIds:['netease:deleted'],position:18,volume:.5,shuffle:false,repeat:'off'})));
 await page.setViewportSize({width:320,height:740});await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开队列'}).click();await expect(page.locator('.playback-queue')).toContainText('曲库中已不可用');await page.locator('.playback-queue').getByRole('button',{name:'移除',exact:true}).click();await expect(page.locator('.playback-queue')).toContainText('队列为空');await page.locator('.playback-queue').getByRole('button',{name:'收起队列'}).click();await page.getByRole('button',{name:'展开个人库'}).click();await expect(page.locator('.personal-library')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'.local/browser-tests/stage4-mobile.png'});
});
test('播放资源请求可暂停取消，迟到响应不创建媒体',async({page})=>{
 let release!:()=>void;const delay=new Promise<void>(r=>release=r);
 await page.route('**/api/playback/resolve?*',async route=>{await delay;await route.fulfill({json:{status:'unavailable',reason:'permission',message:'测试迟到响应'}});});
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await selectTrack(page);await page.getByRole('button',{name:'播放此曲',exact:true}).click();await expect(page.locator('.s4c-player-feedback')).toContainText('获取');await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();release();await expect(page.locator('.player-bar').getByRole('button',{name:'播放',exact:true})).toBeEnabled();await expect(page.locator('audio')).toHaveCount(0);
});
test('真实MySQL读取数字ID解析网易外链，不回退到外站同名曲或泄露配置',async({request})=>{
 const r=await request.get('/api/playback/resolve?trackId=netease%3A1455706951');expect(r.status()).toBe(200);const result=await r.json();expect(['ready','unavailable']).toContain(result.status);if(result.status==='unavailable')expect(result.message).toContain('网易');
 expect(JSON.stringify(result)).not.toMatch(/privateKey|accessToken|AUTH_TOKEN/);
 if(result.status==='ready')expect(result.url).toMatch(/^(https:\/\/music\.163\.com\/song\/media\/outer\/url\?id=1455706951\.mp3|\/api\/playback\/audio\?trackId=netease%3A1455706951)$/);
 const denied=await request.get('/api/playback/resolve?trackId=netease%3A1455706951',{headers:{Origin:'https://example.com'}});expect(denied.status()).toBe(403);
 const missing=await request.get('/api/playback/resolve?trackId=netease%3A000');expect((await missing.json()).status).toBe('unavailable');
});
