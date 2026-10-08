import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {category,isCity,bannedArea} from './lib/ost-associations.mjs';
import {associationCategory,auditCoverage} from './audit-anchor-music.mjs';
import {jaEvidence,supplementalKind} from './lib/ja-bgm-evidence.mjs';

const read=async path=>JSON.parse(await fs.readFile(path,'utf8'));
const map=await read('public/data/kongying-map.json'),source=await read('data/sources/ost-bulk-source.json');
const library=await read('public/data/music-library.json'),edits=await read('data/association-edits.json');
// Explicit per-map pools avoid extending a national album into independent maps.
const scopes=[
 ['A:MD:MENGDE','风与异乡人',1,/蒙德野外/,'风与异乡人',1,/^蒙德战斗/],
 ['A:MD:XUESHAN','漩涡、落星与冰山',1,/龙脊雪山/,'珍珠之歌',4,/龙脊雪山.*战斗/],
 ['A:LY:LIYUE','皎月云间之梦',null,/^碧水原/,'皎月云间之梦',3,/璃月野外战斗/],
 ['A:DQ:1','寂远无妄之国',1,/^鸣神岛/,'寂远无妄之国',3,/稻妻野外/],
 ['A:DQ:2','佚落迁忘之岛',1,/^海祇岛(?:\s|$)/,'寂远无妄之国',3,/稻妻野外/],
 ['A:DQ:HEGUAN','佚落迁忘之岛',1,/^鹤观/,'寂远无妄之国',3,/稻妻野外/],
 ['A:DQ:YUANXIAGONG','佚落迁忘之岛',2,/^渊下宫/],
 ['A:XM:FOREST','智妙明论之林',null,/^道成林/,'智妙明论之林',4,/须弥雨林野外战斗/],
 ...['A:XM:DESERT','A:XM:DESERT2','A:XM:DESERT3'].map(code=>[code,'啁哳流变之砂',1,null,'啁哳流变之砂',3,/须弥沙漠野外战斗/]),
 ['A:LY:CENGYAN','千岩旷望',1,null,'千岩旷望',3,null],
 ['A:LY:CENGYAN_UG','千岩旷望',2,null,'千岩旷望',3,null],
 ['A:LY:CHENYUGU','沉玉沐芳',2,null],
 ['A:FD:FENGDAN','白露澈明之泉',2,null,'白露澈明之泉',4,null],
 ...['A:FD:FENGDAN2','A:FD:FENGDAN3'].map(code=>[code,'万流始源之海',1,null,'白露澈明之泉',4,null]),
 ['A:FD:FENGDAN4','金律永谐',1,null,'白露澈明之泉',4,null],
 ['A:FD:ANCIENT_SEA','金律永谐',2,null],
 ['A:NT:NATA','炽炎交逐之原',2,null,'炽炎交逐之原',3,null],
 ['A:NT:NATA2','遥古喁望之阳',1,null,'炽炎交逐之原',3,null],
 ['A:NT:NATA3','竟夜有辉之燎',1,/^安饶之野/,'炽炎交逐之原',3,null],
 ['A:NT:NATA4','竟夜有辉之燎',1,/^远古圣山/,'竟夜有辉之燎',3,/^远古圣山战斗/],
 ['A:NT:NATA5','珍珠之歌5',1,/^悠悠度假村(?:$|（)/],
 ['A:NDKL:NDKL','幽暮衬映之月',2,/大世界野外/,'幽暮衬映之月',3,/大世界战斗/],
 ...['A:NDKL:NDKL2','A:NDKL:NDKL3'].map(code=>[code,'朔望凝待之庭',1,/逐浪野.*野外/,'幽暮衬映之月',3,/大世界战斗/]),
 ['A:ZD:ZHIDONG1','悯宥慈怜之垠',3,/^野外/,'悯宥慈怜之垠',4,/^战斗曲[123]$/],
 ['A:NDKL:SY','珍珠之歌6',1,/^乌吉恩圈 月表$/,'珍珠之歌6',4,/^霜月战斗曲$/],
 ['A:MD:FENGXISHAN','珍珠之歌6',2,/^遗世之路$/],
 ['A:MD:SHENDIAN','珍珠之歌6',2,/^空之神殿[12]$/],
];

const tracks=new Map(library.tracks.map(t=>[t.id,t])),removed=new Set(edits.edits.filter(e=>e.action==='remove').map(e=>e.trackId+'|'+e.anchorId));
const edges=new Set(library.associations.map(a=>a.trackId+'|'+a.anchorId));
const effective=new Map();
for(const a of library.associations){if(a.matchType==='region-archive'||removed.has(a.trackId+'|'+a.anchorId))continue;const roles=effective.get(a.anchorId)??new Set();roles.add(associationCategory(tracks.get(a.trackId),a));effective.set(a.anchorId,roles);}
for(const e of edits.edits.filter(e=>e.action==='add')){const roles=effective.get(e.anchorId)??new Set();roles.add(category(tracks.get(e.trackId).sceneInfo??{originText:'',discTitle:''}));effective.set(e.anchorId,roles);}
const additions=[];
function fill(code,albumName,disc,pattern,role){
 if(!albumName)return;
 const album=source.albums.find(a=>a.title===albumName);assert(album);
 const pool=album.tracks.filter(t=>{
  const extra=jaEvidence.get('netease:'+t.neteaseId),known=supplementalKind(extra);
  if(known&&((role==='scene'&&known!=='scene')||(role!=='scene'&&known!=='battle-generic')))return false;
  if(role==='scene'&&extra&&/城|町|村|港|宮|宮殿|要塞|竞技场|競技場/.test(extra.placeJa))return false;
  return (disc===null||t.discNumber===disc)&&(pattern?pattern.test(t.originText):['missing-source'].includes(category(t))||known==='scene'&&role==='scene'||known==='battle-generic'&&role!=='scene')&&!/主题|剧情|过场|BOSS|Boss|周本|任务|界面|改编|秘境/.test(t.originText);
 });
 for(const p of map.anchors.filter(p=>p.kind==='waypoint'&&p.areaCode===code&&p.hiddenFlag!==3&&!bannedArea(code)&&!isCity(p))){
  const roles=effective.get(p.id)??new Set();
  if(role==='scene'?roles.has('scene'):[...roles].some(r=>r.startsWith('battle-')))continue;
  const t=pool.find(t=>!removed.has('netease:'+t.neteaseId+'|'+p.id));if(!t)continue;
  const trackId='netease:'+t.neteaseId,key=trackId+'|'+p.id;if(edges.has(key))continue;
  const evidenceNote=`专辑分碟推定：${role==='scene'?'常态':'战斗'}。用户允许优先补齐覆盖；${album.title} / ${t.discTitle||'单碟'} → ${p.areaName}。原出处：${t.originText||'未提供'}。仅低精度候选，不代表实际触发；空出处无法确认城市或Boss限定性，需要人工校对。`;
  library.associations.push({id:`coverage:${t.neteaseId}:${p.sourceId}`,trackId,anchorId:p.id,evidenceStatus:'pending',matchType:'region-scope',evidenceNote,sourceUrl:album.wikiUrl});
  edges.add(key);roles.add(role==='scene'?'scene':'battle-generic');effective.set(p.id,roles);
  additions.push({trackId,anchorId:p.id,role,areaCode:code,album:album.title,discTitle:t.discTitle,originText:t.originText,reason:evidenceNote});
 }
}
for(const [code,album,disc,pattern,battleAlbum,battleDisc,battlePattern] of scopes){fill(code,album,disc,pattern,'scene');fill(code,battleAlbum,battleDisc,battlePattern,'battle-generic');}
assert.equal(edges.size,library.associations.length);
if(additions.length)await fs.writeFile('public/data/music-library.json',JSON.stringify(library,null,2)+'\n');
const path='data/review/anchor-music-fill.json';
const previous=await read(path).catch(e=>{if(e.code!=='ENOENT')throw e;return {additions:[]};});
const report={policy:'2026-10-08 用户允许专辑/分碟低精度候选补缺；人工删除优先，新增pending。',additions:[...previous.additions,...additions],coverage:auditCoverage(map,library,edits)};
await fs.writeFile(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({added:additions.length,totalAssociations:library.associations.length,...report.coverage.summary},null,2));
