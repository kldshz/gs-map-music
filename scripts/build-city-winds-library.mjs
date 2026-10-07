import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const source=JSON.parse(await fs.readFile('data/sources/city-winds-source.json','utf8'));
const snapshot=JSON.parse(await fs.readFile('public/data/kongying-map.json','utf8'));
const byAnchor=new Map(snapshot.anchors.map(a=>[a.id,a]));
const md=snapshot.anchors.filter(a=>a.areaCode==='A:MD:MENGDE');
const city=md.filter(a=>a.content.includes('【蒙德 蒙德城】'));
const ruins=md.filter(a=>a.content.includes('【蒙德 风龙废墟】'));
// Broad source ranges cover ordinary Mondstadt points; specific soundscapes keep their own library.
const outdoor=md.filter(a=>!city.some(p=>p.id===a.id)&&!ruins.some(p=>p.id===a.id));
const ly=snapshot.anchors.filter(a=>a.areaCode==='A:LY:LIYUE'&&a.kind==='statue');
const fallback=[byAnchor.get('kongying:6557')];
assert.equal(city.length,2);assert.equal(ruins.length,5);assert.equal(outdoor.length,20);assert.equal(ly.length,5);
const rules=new Map();
function rule(numbers,name,anchors,matchType,notes='',areaCode='A:MD:MENGDE',kind='place',regions=['蒙德']){
 for(const number of numbers)rules.set(number,{name,anchors,matchType,notes,areaCode,kind,regions});
}
rule([3,4,5,6,7,8],'蒙德城',city,'place-match','出处明确蒙德城，原点位说明也是蒙德城；不能据此确定城内哪一个锚点距离实际音区最近。');
rule([9],'西风大教堂',city,'parent-place-match','出处明确室内，但当前只收集传送锚点/神像，无教堂室内点位；挂在两个蒙德城锚点的城内目录，不宣称精确室内坐标。');
rule([10],'西风骑士团',city,'parent-place-match','室内出处借用蒙德城锚点目录；当前点位说明只到蒙德城，建筑位置待核对。');
rule([11],'天使的馈赠',city,'parent-place-match','酒馆室内出处借用蒙德城锚点目录；非酒馆入口精确点位。');
rule([22],'风魔龙进城（剧情）',city,'parent-place-match','“进城”按蒙德篇主线及专辑归属候选到蒙德城，需人工复核；不是常驻场景BGM。','A:MD:MENGDE','scene');
rule([61],'蒙德城内 · 特瓦林（剧情战斗）',city,'parent-place-match','出处直接列特瓦林(蒙德城内)，只能匹配城级锚点；非城内常驻音乐。','A:MD:MENGDE','scene');
rule([28,29],'晨曦酒庄', [byAnchor.get('kongying:6555')],'region-archive','出处明确酒庄，现有点位说明没有“晨曦酒庄”。借苍风高地神像归档；归档不证明神像位置就是酒庄音区。');
rule([30],'尘歌壶 · 翠黛峰（当前）；晨曦酒庄（历史）',fallback,'region-archive','原文区分原/现出处，不把历史酒庄位置当现行播放地点。暂无尘歌壶地图，以专辑归属借蒙德神像归档。','A:MD:MENGDE','scene',['尘歌壶（当前）','蒙德 · 晨曦酒庄（历史）']);
rule([31,32,35,36,37,38,40,41,42,43,44,45,46,50],'蒙德野外',outdoor,'region-scope','按用户范围规则，将明确“蒙德野外”的曲目挂到蒙德源地区20个普通点位；蒙德城与风龙废墟保留专属音乐。范围推定待核实，未逐点确认实际音乐触发，不外推其它独立地区。');
rule([47,48],'风龙废墟',ruins,'place-match','出处明确风龙废墟，原点位说明匹配四个锚点与一个神像；实际精确音区/触发仍待复核。');
rule([52,53],'蒙德战斗',outdoor,'region-scope','出处明确蒙德战斗，按用户范围规则挂到20个普通蒙德点位。保留战斗语境和待核实，不将它写成常驻环境音乐；专属点位不追加泛地区候选。','A:MD:MENGDE','scene');
rule([54],'西风之鹰的庙宇',fallback,'region-archive','保留Wiki原名；详情页404、现有锚点说明无同名。仅按蒙德篇归档，秘境名称/方位待核对。','A:MD:MENGDE','place',['蒙德（专辑归属；秘境位置待核对）']);
rule([55],'芬德尼尔之顶',[byAnchor.get('kongying:6558')],'region-archive','秘境页面所属地区为龙脊雪山。无秘境同名锚点，归档到该源地区唯一神像，非覆雪之路常驻BGM。','A:MD:XUESHAN','place',['蒙德 · 龙脊雪山']);
rule([56],'太山府',ly,'region-archive','秘境页面明确属于璃月；无同名锚点，挂在源地区璃月的五个神像。没有推定到更细真实音区。','A:LY:LIYUE','place',['璃月']);
rule([57],'塞西莉亚苗圃',fallback,'region-archive','秘境页面所属地区为蒙德；无同名点位，用蒙德默认归档神像，不将星落湖当秘境所在地。');
rule([58],'震雷连山密宫',ly,'region-archive','专辑页“雷震连山秘宫”为不存在的红链。另页“震雷连山密宫”明确属于璃月；名称规范化为候选，保留原文字并待人工确认。','A:LY:LIYUE','place',['璃月（秘境别名匹配待核对）']);
rule([59],'冒险等级突破副本、深渊',fallback,'region-archive','出处可能为多个副本或独立场景，当前无对应传送锚点；仅按专辑归属归档，实际所在地区待确认。','A:MD:MENGDE','scene',['位置未定（独立副本/深渊）']);
rule([60],'主线任务（战斗/具体地点未定）',fallback,'region-archive','出处只写主线任务，不推断具体地区或常驻BGM；按蒙德篇专辑归档。','A:MD:MENGDE','scene',['位置未定（按蒙德篇专辑归档）']);
rule([62,63],'北风狼战斗', [byAnchor.get('kongying:6555')],'region-archive','出处只明确北风狼阶段；当前锚点说明无北风狼/奔狼领，借苍风高地神像归档，不给副本捏造坐标。','A:MD:MENGDE','scene');
// Nonspatial/ambiguous origins intentionally remain scene entries, not invented geographic places.
for(const [num,name] of [[1,'游戏加载界面'],[2,'安柏传说任务故事书'],[12,'紧张氛围与活动'],[13,'愚人众对峙场景'],[14,'琴传说任务过场'],[15,'尴尬剧情场景'],[16,'小游戏与飞行执照'],[17,'安柏传说任务 · 空中轰炸'],[18,'剧情音乐'],[19,'温迪与风魔龙主线剧情'],[20,'主线剧情（具体地点未定）'],[21,'初遇安柏主线剧情'],[23,'温迪传说任务'],[24,'传说任务结尾'],[25,'初遇凯亚主线剧情'],[26,'内测音乐（含人声）'],[27,'内测音乐'],[33,'祈愿界面'],[34,'初见神像与神像满级'],[39,'游戏加载界面'],[49,'未归的息星剧情PV'],[51,'温迪PV · 四方之风']]){
 rule([num],name,fallback,'region-archive','出处为界面/剧情/活动，可能跨区域，没有精确地图地点；按专辑归属放在蒙德默认星落湖神像归档，不认定在那里实际播放。','A:MD:MENGDE','scene',['位置未定（按蒙德篇专辑归档）']);
}
const musicLocations=[],locationKeys=new Map(),tracks=[],associations=[];
for(const [i,t] of source.tracks.entries()){
 const r=rules.get(i+1);assert(r,`Rule missing ${i+1}`);assert(r.anchors.every(Boolean));
 const area=snapshot.areas.find(a=>a.code===r.areaCode);assert(area);
 const country=snapshot.areas.find(a=>a.id===area.parentId)?.name??'';
 const locationKey=r.areaCode+'|'+r.name;
 if(!locationKeys.has(locationKey)){
  const id='city-winds-place-'+(musicLocations.length+1);
  locationKeys.set(locationKey,id);musicLocations.push({id,name:r.name,country,areaId:area.id,areaCode:area.code,kind:r.kind,sourceUrl:source.wikiSourceUrl,notes:r.notes});
 }
 const id='netease:'+t.neteaseId;
 const englishOfficial=t.neteaseTitle.slice(t.wikiTitle.length).trim();
 const metadataNotes=[source.wikiCaveat,'艺人来自网易元数据；作曲由Wiki制作团队及网易专辑介绍明确支持。'];
 if(englishOfficial!==t.englishTitle)metadataNotes.push(`Wiki外文名与网易文本不同，保留两者：网易 ${englishOfficial}；Wiki ${t.englishTitle}`);
 if(i+1===58)metadataNotes.push('原出处的秘境名称与有效详情页不一致，规范化待确认。');
 tracks.push({id,title:t.neteaseTitle,artists:t.artists,composers:[source.album.composer],album:source.album.title,releaseDate:source.album.releaseDate,durationSeconds:t.durationSeconds,
  description:'来源：网易云音乐专辑元数据与BWIKI曲目出处。具体地点关系仅为试做候选，请结合下列出处和挂载说明核对。',personalNote:'',neteaseId:t.neteaseId,neteaseEncryptedId:t.neteaseEncryptedId,sourceUrl:'https://music.163.com/song?id='+t.neteaseId,
  sceneInfo:{wikiTitle:t.wikiTitle,englishTitle:t.englishTitle,discNumber:t.discNumber,discTitle:t.discTitle,trackNumber:t.trackNumber,originText:t.originText,mainRegions:r.regions,musicLocationIds:[locationKeys.get(locationKey)],wikiSourceUrl:source.wikiSourceUrl,wikiRevisionId:source.wikiRevisionId,metadataNotes}});
 for(const a of r.anchors){
  assert.equal(a.areaCode,r.areaCode);
  associations.push({id:`city-winds:${t.neteaseId}:${a.sourceId}`,trackId:id,anchorId:a.id,evidenceStatus:'pending',matchType:r.matchType,
   evidenceNote:`Wiki出处：${t.originText.replaceAll('\n','；')}。点位原说明：${a.content.replaceAll('\n','；')}。${r.notes} 所有音乐与点位关系仍待人工复核。`,sourceUrl:source.wikiSourceUrl});
 }
}
const library={schemaVersion:1,tracks,associations,musicLocations};
assert.equal(tracks.length,63);assert.equal(new Set(associations.map(a=>a.trackId+'|'+a.anchorId)).size,associations.length);
assert(tracks.every(t=>associations.some(a=>a.trackId===t.id)));assert(associations.filter(a=>a.matchType==='region-archive').every(a=>byAnchor.get(a.anchorId)?.kind==='statue'));
// Refuse to replace a reviewed/user-edited library; snapshots are not a sync API.
const current=JSON.parse(await fs.readFile('public/data/music-library.json','utf8'));
let previous=null;
try{previous=JSON.parse(await fs.readFile('outputs/city-winds-region-20261007/music-library.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;
 previous=JSON.parse(await fs.readFile('outputs/city-winds-pilot-20261007/music-library.json','utf8'));}
if(current.tracks.length||current.associations.length){
 assert(previous&&JSON.stringify(current)===JSON.stringify(previous),'曲库已有改动；请先备份并人工合并，不自动覆盖个人评价或挂载。');
}
await fs.writeFile('public/data/music-library.json',JSON.stringify(library,null,2)+'\n');
await fs.mkdir('outputs/city-winds-region-20261007',{recursive:true});
await fs.writeFile('outputs/city-winds-region-20261007/music-library.json',JSON.stringify(library,null,2)+'\n');
console.log(JSON.stringify({tracks:tracks.length,associations:associations.length,musicLocations:musicLocations.length,matchedAnchors:new Set(associations.map(a=>a.anchorId)).size,
 matchTypes:Object.fromEntries(['place-match','parent-place-match','region-archive','region-scope'].map(k=>[k,associations.filter(a=>a.matchType===k).length])),allPending:true,personalNotesBlank:tracks.every(t=>t.personalNote==='')},null,2));
