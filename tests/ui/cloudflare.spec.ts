import { test,expect } from '@playwright/test';
test('云端API实际路由、D1就绪、未知ID/跨站/写入失败均为JSON',async({request})=>{
  const health=await request.get('/api/health');expect(health.ok()).toBe(true);expect(health.headers()['content-type']).toContain('application/json');
  expect(await health.json()).toMatchObject({status:'ready',database:'ready',tracks:1663});
  const unknown=await request.get('/api/does-not-exist');expect(unknown.status()).toBe(404);expect(unknown.headers()['content-type']).toContain('application/json');
  const missing=await request.get('/api/playback/resolve?trackId=netease%3A1');expect(await missing.json()).toMatchObject({status:'unavailable',reason:'missing'});
  expect((await request.get('/api/playback/resolve?trackId=../file')).status()).toBe(400);
  expect((await request.post('/api/playback/resolve?trackId=netease%3A1455706951')).status()).toBe(405);
  expect((await request.get('/api/playback/resolve?trackId=netease%3A1455706951',{headers:{Origin:'https://unrelated.example'}})).status()).toBe(403);
});
test('两首云端资源为HTTPS媒体或明确未验证公开入口，签名不写浏览器播放存储',async({request,page})=>{
  for(const id of ['1455706951','1455706952']){
    const response=await request.get(`/api/playback/resolve?trackId=netease%3A${id}`);const result=await response.json();
    expect(['ready','candidate'],JSON.stringify({status:result.status,reason:result.reason,message:result.message})).toContain(result.status);
    const url=new URL(result.url);expect(url.protocol).toBe('https:');
    if(result.status==='ready')expect(url.hostname).toMatch(/\.music\.126\.net$/);
    else {expect(url.hostname).toBe('music.163.com');expect(result.url).toBe(`https://music.163.com/song/media/outer/url?id=${id}.mp3`);}
    const audio=await request.head(result.url);expect(audio.ok()).toBe(true);expect(audio.headers()['content-type']).toMatch(/^audio\//);
  }
  await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);await page.getByRole('button',{name:'展开面板',exact:true}).click();
  const values=await page.evaluate(()=>Object.values(localStorage).join('\n'));expect(values).not.toContain('music.126.net');
});
