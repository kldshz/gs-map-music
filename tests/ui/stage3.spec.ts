import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import type { MapSnapshot } from '../../src/domain/contracts';
import { resolveMap } from '../../src/adapters/kongying-config';
const snapshot=JSON.parse(readFileSync('public/data/kongying-map.json','utf8')) as MapSnapshot;
const mondstadt=snapshot.anchors.filter(a=>a.areaCode==='A:MD:MENGDE');
const statue=mondstadt.find(a=>a.kind==='statue')!;
const waypoint=mondstadt.find(a=>a.kind==='waypoint')!;
const fixture={schemaVersion:1,tracks:[{id:'ui-fixture',title:'自动化验证条目（不是音乐数据）',artists:[],composers:null,album:'测试元数据专辑',releaseDate:null,durationSeconds:null,description:'仅测试导入与关联',neteaseId:null,sourceUrl:null}],
  associations:[statue,waypoint].map((p,i)=>({id:'ui-edge-'+i,trackId:'ui-fixture',anchorId:p.id,evidenceStatus:'pending',evidenceNote:'仅自动化测试',sourceUrl:null}))};
test.setTimeout(60000);
async function ready(page:any){await page.goto('/');await expect(page.locator('.anchor-list button')).toHaveCount(27);}

test('真实地图瓦片、27个蒙德点位、地图点击和键盘神像入口；无昼夜/假音频',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await expect.poll(()=>page.locator('.leaflet-tile-loaded').count(),{timeout:30000}).toBeGreaterThan(0);
  await expect(page.locator('.music-anchor')).toHaveCount(27);
  await page.locator(`[data-anchor-id="${waypoint.id}"]`).click({force:true});
  await expect(page.locator('.detail-view')).toBeVisible();await expect(page.locator('.detail-view')).toContainText('关联音乐（16）');
  await page.keyboard.press('Escape');await expect(page.locator('.detail-view')).not.toBeVisible();
  await page.getByRole('button',{name:'神像',exact:true}).click();await expect(page.locator('.anchor-list button')).toHaveCount(4);
  await page.locator('.anchor-list button').first().focus();await page.keyboard.press('Enter');await expect(page.locator('.detail-view')).toBeVisible();
  await expect(page.locator('.detail-view')).toContainText('神像');await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'播放',exact:true})).toBeDisabled();expect(await page.locator('audio').count()).toBe(0);
  await expect(page.locator('body')).not.toContainText('白天');await expect(page.locator('body')).not.toContainText('Carefree');expect(errors).toEqual([]);
});

test('切换至冬与纳塔实际点位/分层、缩放、文字空结果',async({page})=>{
  await ready(page);await page.getByLabel('选择地区').selectOption('A:ZD:ZHIDONG1');await expect(page.locator('.anchor-list button')).toHaveCount(66);
  await expect.poll(()=>page.locator('.leaflet-tile-loaded').count(),{timeout:30000}).toBeGreaterThan(0);
  await page.getByLabel('选择地区').selectOption('A:NT:NATA2');await expect(page.locator('.anchor-list button')).toHaveCount(39);
  await page.getByLabel('地图分层').selectOption('LEGEND_SKYSERPENT_SHIP');await expect(page.locator('.leaflet-image-layer')).toHaveCount(1);
  await page.getByLabel('地图分层').selectOption('surface');await page.getByLabel('搜索点位、曲目、专辑、地区、细分目录或个人评价').fill('不存在的点位');
  await expect(page.getByText('当前筛选无点位')).toBeVisible();await page.getByLabel('搜索点位、曲目、专辑、地区、细分目录或个人评价').fill('');
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
});

test('空曲库/校验失败及多对多反向定位；缺值未知、pending显式',async({page})=>{
  await page.route('**/data/music-library.json',r=>r.fulfill({json:{schemaVersion:1,tracks:[],associations:[]}}));
  await ready(page);await page.getByRole('button',{name:'曲目检索',exact:true}).click();await expect(page.getByText('曲库尚未导入')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({name:'metadata.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await expect(page.locator('.import-message').first()).toContainText('已导入1首曲目');
  await page.getByLabel('搜索点位、曲目、专辑、地区、细分目录或个人评价').fill('测试元数据专辑');await expect(page.locator('.track-list button')).toHaveCount(1);
  await page.locator('.track-list button').focus();await page.keyboard.press('Space');await expect(page.locator('.detail-view')).toBeVisible();
  await expect(page.locator('.detail-view')).toContainText('未知');await expect(page.locator('.association-status')).toHaveCount(0);
  await page.getByText('关联点位（2）',{exact:true}).click();await expect(page.locator('.location-list button')).toHaveCount(2);await page.getByRole('button',{name:'在地图上定位全部'}).click();
  await expect(page.locator('.detail-view')).toBeVisible();await expect(page.locator('dialog')).toHaveCount(0);await expect(page.locator('.music-anchor.is-highlighted')).toHaveCount(2);
  await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await expect(page.locator('.import-message').first()).toContainText('导入失败');await page.getByRole('button',{name:'曲目检索',exact:true}).click();await expect(page.locator('.track-list button')).toHaveCount(1);
  await page.getByLabel('搜索点位、曲目、专辑、地区、细分目录或个人评价').fill('没有这首曲目');await expect(page.getByText('没有与"没有这首曲目"匹配的曲目')).toBeVisible();
});

test('实际触发地图数据与瓦片加载失败并重试',async({page})=>{
  await page.route('**/data/kongying-map.json',r=>r.fulfill({status:503,body:''}));await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('503');await page.unroute('**/data/kongying-map.json');
  await page.route('https://assets.yuanshen.site/tiles_**',r=>r.abort());await page.getByRole('button',{name:'重试加载'}).click();
  await expect(page.locator('.anchor-list button')).toHaveCount(27);await expect(page.locator('.map-status')).toContainText('加载失败',{timeout:30000});
});

for(const width of [390,320])test(`手机${width}px布局/面板/键盘可用`,async({page})=>{
  await page.setViewportSize({width,height:844});await ready(page);
  await expect(page.locator('.leaflet-music-map')).toBeVisible();await expect(page.getByText('音源尚未接入')).toBeVisible();
  const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,map:document.querySelector('.map-container')!.getBoundingClientRect().height,footer:document.querySelector('footer')!.getBoundingClientRect().bottom}));
  expect(bounds.scroll).toBeLessThanOrEqual(width);expect(bounds.map).toBeGreaterThanOrEqual(240);expect(bounds.footer).toBeLessThanOrEqual(845);
  await page.getByRole('button',{name:'收起面板'}).click();await page.getByRole('button',{name:'展开面板'}).click();
  await page.locator('.anchor-list button').first().click();await expect(page.locator('.detail-view')).toBeVisible();
  const dialog=await page.locator('.detail-view').boundingBox();expect(dialog!.x).toBeGreaterThanOrEqual(0);expect(dialog!.width).toBeLessThanOrEqual(width);
  await page.keyboard.press('Escape');await expect(page.locator('.detail-view')).not.toBeVisible();
  await expect(page.locator('.map-status')).toContainText('真实地图已加载',{timeout:30000});
  await page.screenshot({path:`.local/browser-tests/stage3-mobile-${width}.png`});
});

test('三个不共线源点在原V3投影及半级缩放后贴合',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page);
  const controls=[6290,6557,6554].map(id=>mondstadt.find(a=>a.sourceId===id)!);
  const zoom=resolveMap(snapshot,'A:MD:MENGDE').settings.zoom;
  async function positions(){return Promise.all(controls.map(async p=>{
    const box=await page.locator(`[data-anchor-id="${p.id}"]`).boundingBox();
    return {x:box!.x+box!.width/2,y:box!.y+box!.height/2};
  }));}
  function error(points:{x:number,y:number}[],scale:number){return Math.max(...points.slice(1).flatMap((p,i)=>[
    Math.abs((p.x-points[0].x)-(controls[i+1].position![0]-controls[0].position![0])*scale),
    Math.abs((p.y-points[0].y)-(controls[i+1].position![1]-controls[0].position![1])*scale),
  ]));}
  const before=await positions();expect(error(before,2**zoom)).toBeLessThan(2);
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect.poll(async()=>error(await positions(),2**(zoom+0.5))).toBeLessThan(2);
  writeFileSync('.local/browser-tests/stage3-control-points.json',JSON.stringify({ids:controls.map(p=>p.id),beforeErrorPx:error(before,2**zoom),afterErrorPx:error(await positions(),2**(zoom+0.5))},null,2));
});

test('无坐标关联显示待核实，全部定位不虚构位置',async({page})=>{
  const missing=structuredClone(snapshot);missing.anchors.find(a=>a.id===waypoint.id)!.position=null;
  await page.route('**/data/kongying-map.json',r=>r.fulfill({json:missing}));await ready(page);
  await page.getByRole('button',{name:'曲目检索',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'missing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...fixture,associations:[fixture.associations[1]]}))});
  await page.locator('.track-list button').click();await page.getByText('关联点位（1）',{exact:true}).click();await expect(page.locator('.location-list')).toContainText('坐标待核实');
  await page.getByRole('button',{name:'在地图上定位全部'}).click();
  await expect(page.locator('.map-status')).toContainText('没有可用坐标');
  await expect(page.locator(`[data-anchor-id="${waypoint.id}"]`)).toHaveCount(0);
  await page.getByLabel('搜索点位、曲目、专辑、地区、细分目录或个人评价').fill('完全不存在的点');
  await page.getByRole('button',{name:'点位目录',exact:true}).click();await expect(page.getByText('当前筛选无点位')).toBeVisible();
});

test('桌面生产页面可查看并保存真实专辑截图',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await ready(page);
  await expect(page.locator('.map-status')).toContainText('真实地图已加载',{timeout:30000});
  await page.screenshot({path:'.local/browser-tests/stage3-desktop.png'});
  await page.getByRole('button',{name:'收起面板'}).click();await expect(page.getByRole('button',{name:'展开面板'})).toBeVisible();
  await page.getByRole('button',{name:'展开面板'}).click();await page.locator('.anchor-list button').first().click();
  await expect(page.locator('.map-status')).toContainText('真实地图已加载',{timeout:30000});
  await page.screenshot({path:'.local/browser-tests/stage3-anchor-library.png'});
});
