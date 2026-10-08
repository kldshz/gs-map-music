import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const library=JSON.parse(fs.readFileSync('public/data/music-library.json','utf8'));
const samples=['1455706951','1455706952'].map(id=>library.tracks.find((t:any)=>t.neteaseId===id));

test('实际原神音频：外链播放暂停/拖动/上下曲/随机循环/面板连续及刷新恢复',async({page,request})=>{
 test.setTimeout(120000);
 const [first,second]=samples;
 const resource=await (await request.get(`/api/playback/resolve?trackId=${encodeURIComponent(first.id)}`)).json();
 expect(resource.status,JSON.stringify(resource)).toBe('ready');expect(['netease-outer','local']).toContain(resource.provider);
 await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);
 await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill(first.neteaseId);await page.locator('.track-list .track-item').click();await page.getByRole('button',{name:'播放此曲',exact:true}).click();
 const audio=page.locator('audio[data-player-audio]');
 async function playing(title:string){
  await expect(page.locator('.player-title')).toContainText(title);await expect(audio).toHaveCount(1);
  await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>!el.paused&&el.currentTime>.2&&el.readyState>=3&&el.error===null),{timeout:20000}).toBe(true);
 }
 await playing(first.sceneInfo.wikiTitle);
 const duration=await audio.evaluate((el:HTMLAudioElement)=>el.duration);expect(Math.abs(duration-first.durationSeconds)).toBeLessThan(2);
 const start=await audio.evaluate((el:HTMLAudioElement)=>el.currentTime);await page.getByLabel('选择地区').selectOption('A:FD:FENGDAN');await page.getByRole('button',{name:'点位目录',exact:true}).click();await page.getByRole('button',{name:'收起面板'}).click();await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(start);await expect(page.locator('.player-title')).toContainText(first.sceneInfo.wikiTitle);
 await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();await expect(audio).toHaveJSProperty('paused',true);
 await page.getByLabel('播放进度').fill('15');await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(14.8);await page.getByLabel('音量').fill('25');await expect(audio).toHaveJSProperty('volume',.25);
 await page.getByRole('button',{name:'展开面板'}).click();await page.getByRole('button',{name:'曲目检索',exact:true}).click();await page.getByRole('searchbox',{name:'搜索点位、曲目、专辑、地区或细分目录',exact:true}).fill(second.neteaseId);await page.locator('.track-list .track-item').click();await page.getByRole('button',{name:'加入队列',exact:true}).click();await page.locator('.player-bar').getByRole('button',{name:'下一首',exact:true}).click();await playing(second.sceneInfo.wikiTitle);
 expect(Math.abs(await audio.evaluate((el:HTMLAudioElement)=>el.duration)-second.durationSeconds)).toBeLessThan(2);
 await page.getByLabel('播放进度').fill('0');await page.locator('.player-bar').getByRole('button',{name:'上一首',exact:true}).click();await playing(first.sceneInfo.wikiTitle);
 await page.getByRole('button',{name:'开启随机播放'}).click();await page.locator('.player-bar').getByRole('button',{name:'下一首',exact:true}).click();await playing(second.sceneInfo.wikiTitle);
 await page.getByLabel('播放进度').fill('0');await page.locator('.player-bar').getByRole('button',{name:'上一首',exact:true}).click();await playing(first.sceneInfo.wikiTitle);await page.getByRole('button',{name:'关闭随机播放'}).click();
 // Seek through the UI to trigger a real ended event, not a synthetic dispatch.
 await page.getByRole('button',{name:'关闭循环',exact:true}).click(); // list repeat
 await page.getByRole('button',{name:'列表循环',exact:true}).click(); // single repeat
 let resolveCount=0;page.on('request',r=>{if(r.url().includes('/api/playback/resolve?'))resolveCount++;});
 await page.getByLabel('播放进度').fill(String(Math.floor(duration)));await expect.poll(()=>resolveCount,{timeout:15000}).toBeGreaterThan(0);await playing(first.sceneInfo.wikiTitle);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeLessThan(5);
 await page.getByRole('button',{name:'单曲循环',exact:true}).click(); // off
 await page.locator('.player-bar').getByRole('button',{name:'下一首',exact:true}).click();await playing(second.sceneInfo.wikiTitle);
 const secondDuration=await audio.evaluate((el:HTMLAudioElement)=>el.duration);await page.getByRole('button',{name:'关闭循环',exact:true}).click(); // list repeat wraps at tail
 await page.getByLabel('播放进度').fill(String(Math.floor(secondDuration)));await playing(first.sceneInfo.wikiTitle);
 await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();await page.getByLabel('播放进度').fill('10');await page.reload();
 await expect(page.locator('.player-title')).toContainText(first.sceneInfo.wikiTitle);await expect(page.locator('audio')).toHaveCount(0);await expect(page.getByLabel('音量')).toHaveValue('25');await expect(page.locator('.player-status')).toContainText('已恢复');await page.locator('.player-bar').getByRole('button',{name:'播放',exact:true}).click();await playing(first.sceneInfo.wikiTitle);await expect.poll(()=>audio.evaluate((el:HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(9.8);
 await page.screenshot({path:'.local/browser-tests/stage4-real-audio.png'});await page.locator('.player-bar').getByRole('button',{name:'暂停',exact:true}).click();
 // Network decode evidence stays in test memory; no audio file is saved or committed.
 const file=await request.get(resource.url);expect(file.ok()).toBe(true);expect(file.headers()['content-type']).toMatch(/^audio\//);
 const energy=await page.evaluate(async bytes=>{const ctx=new OfflineAudioContext(1,1,44100),buffer=await ctx.decodeAudioData(Uint8Array.from(bytes).buffer);const data=buffer.getChannelData(0);let sum=0;for(let i=0;i<data.length;i+=64)sum+=data[i]*data[i];return {duration:buffer.duration,energy:sum};},[...await file.body()]);
 expect(Math.abs(energy.duration-first.durationSeconds)).toBeLessThan(2);expect(energy.energy).toBeGreaterThan(0);
 fs.writeFileSync('.local/browser-tests/stage4-real-audio-result.json',JSON.stringify({provider:resource.provider,samples:[{id:first.id,duration},{id:second.id,duration:secondDuration}],decode:energy,controls:['play','pause','seek','volume','previous','next','shuffle','repeat-one','repeat-all','map-panel-continuity','refresh-resume']},null,2));
});
