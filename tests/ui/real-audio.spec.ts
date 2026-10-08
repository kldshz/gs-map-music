import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const directory='resources/local/audio/genshin';
const localIds=fs.existsSync(directory)?new Set(fs.readdirSync(directory).filter(p=>/^\d+\.(mp3|flac|wav|ogg|m4a)$/.test(p)).map(p=>p.split('.')[0])):new Set();
const samples=library.tracks.filter((t:any)=>localIds.has(t.neteaseId)).slice(0,2);

test('实际用户原神音频：播放/暂停/拖动/切歌/面板连续及刷新恢复',async({page,request})=>{
 test.skip(samples.length<2,'缺少至少两首用户普通原神音频；不得把模拟媒体测试当真实发声验收');
 const [first,second]=samples;
 const resource=await (await request.get(`/api/playback/resolve?trackId=${encodeURIComponent(first.id)}`)).json();expect(resource.status).toBe('ready');expect(resource.provider).toBe('local');
 const range=await request.get(resource.url,{headers:{Range:'bytes=0-63'}});expect(range.status()).toBe(206);expect((await range.body()).length).toBe(64);
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox').fill(first.neteaseId);await page.locator('.track-list button').click();await page.getByRole('button',{name:'播放此曲',exact:true}).click();
 const audio=page.locator('audio[data-player-audio]');await expect(audio).toHaveCount(1);await expect(page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true})).toBeVisible();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(.2);
 const start=await audio.evaluate((el:HTMLAudioElement)=>el.currentTime);await page.getByLabel('选择地区').selectOption('A:FD:FENGDAN');await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.getByRole('button',{name:'收起面板'}).click();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(start);await expect(page.locator('.player-title')).toContainText(first.sceneInfo.wikiTitle);
 await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();const paused=await audio.evaluate((el:HTMLAudioElement)=>el.currentTime);await expect(audio).toHaveJSProperty('paused',true);await page.getByLabel('播放进度').fill('15');await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(14.8);await page.getByLabel('音量').fill('25');await expect(audio).toHaveJSProperty('volume',.25);
 await page.getByRole('button',{name:'展开面板'}).click();await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox').fill(second.neteaseId);await page.locator('.track-list button').click();await page.getByRole('button',{name:'加入队列',exact:true}).click();await page.locator('.player-bar').getByRole('button',{name:'下一首',exact:true}).click();await expect(page.locator('.player-title')).toContainText(second.sceneInfo.wikiTitle);await expect(audio).toHaveCount(1);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(.2);
 await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();await page.getByLabel('播放进度').fill('10');await page.getByRole('button',{name:'开启随机播放'}).click();await page.getByRole('button',{name:'关闭循环',exact:true}).click();await page.reload();await expect(page.locator('.player-title')).toContainText(second.sceneInfo.wikiTitle);await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByLabel('音量')).toHaveValue('25');await expect(page.locator('.player-status')).toContainText('已恢复');await page.locator('.player-bar').getByRole('button',{name:'播放',exact:true}).click();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(9.8);
 // Decode the actual resource as additional evidence that the file contains audio, not a fake status.
 const energy=await page.evaluate(async url=>{const response=await fetch(url),ctx=new OfflineAudioContext(1,1,44100),buffer=await ctx.decodeAudioData(await response.arrayBuffer());const data=buffer.getChannelData(0);let sum=0;for(let i=0;i<data.length;i+=64)sum+=data[i]*data[i];return {duration:buffer.duration,energy:sum};},resource.url);expect(energy.duration).toBeGreaterThan(15);expect(energy.energy).toBeGreaterThan(0);
 await page.screenshot({path:'.local/browser-tests/stage4-real-audio.png'});await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();
});
