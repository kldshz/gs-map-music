/** Candidate geography uses source origin and actual point headers, never song titles. */
import {jaEvidence,supplementalKind,supplementalScopes} from './ja-bgm-evidence.mjs';
export const bannedArea = code => /^A:(APPLE|VELURIYAM|SIMULANKA):/.test(code);
export const pointHeader = a => a.content.match(/【([^】]+)】/)?.[1] ?? '';
export function isCity(a) {
  // Inspect the geographic header, not quest unlock instructions mentioning a distant city.
  return /蒙德城|璃月港|稻妻城|须弥城|枫丹廷(?:区)?\s*·\s*(?:纳博内区|利奥奈区|灰河)|枫丹廷\s*·\s*沫芒宫|那夏镇|皮拉米达城|至冬堡|凝露镇|海屑镇|彩冰镇|奥古洛夫镇|白淞镇|离岛|奥摩斯港|荆夫港|风车镇/.test(pointHeader(a));
}
const albumAreas = {
 '风与异乡人':['A:MD:MENGDE'],'皎月云间之梦':['A:LY:LIYUE'],'漩涡、落星与冰山':['A:MD:XUESHAN'],
 '寂远无妄之国':['A:DQ:1'],'佚落迁忘之岛':['A:DQ:2','A:DQ:HEGUAN','A:DQ:YUANXIAGONG'],
 '千岩旷望':['A:LY:CENGYAN','A:LY:CENGYAN_UG'],'智妙明论之林':['A:XM:FOREST'],'啁哳流变之砂':['A:XM:DESERT','A:XM:DESERT2','A:XM:DESERT3'],
 '白露澈明之泉':['A:FD:FENGDAN'],'万流始源之海':['A:FD:FENGDAN2','A:FD:FENGDAN3'],'沉玉沐芳':['A:LY:CHENYUGU'],
 '金律永谐':['A:FD:FENGDAN4','A:FD:ANCIENT_SEA'],'炽炎交逐之原':['A:NT:NATA'],'遥古喁望之阳':['A:NT:NATA2'],
 '竟夜有辉之燎':['A:NT:NATA3','A:NT:NATA4'],'幽暮衬映之月':['A:NDKL:NDKL'],'朔望凝待之庭':['A:NDKL:NDKL2','A:NDKL:NDKL3'],
 '悯宥慈怜之垠':['A:ZD:ZHIDONG1'],
};
const broadScopes = [
 [/蒙德(?:野外|战斗)/,['A:MD:MENGDE']],
 [/璃月野外/,['A:LY:LIYUE']],
 [/稻妻野外/,['A:DQ:1','A:DQ:2','A:DQ:HEGUAN']],
 [/须弥雨林野外/,['A:XM:FOREST']],
 [/须弥沙漠野外/,['A:XM:DESERT','A:XM:DESERT2','A:XM:DESERT3']],
 [/挪德卡莱.*大世界/,['A:NDKL:NDKL','A:NDKL:NDKL2','A:NDKL:NDKL3']],
 [/龙脊雪山/,['A:MD:XUESHAN']],
 [/^渊下宫(?:$|[（(])/,['A:DQ:YUANXIAGONG']],
 [/^鹤观(?:$|[（(])/,['A:DQ:HEGUAN']],
 [/^悠悠度假村(?:$|[（(])/,['A:NT:NATA5']],
 [/^远古圣山(?:$|[（(])/,['A:NT:NATA4']],
 [/远古圣山战斗/,['A:NT:NATA4']],
 [/霜月战斗/,['A:NDKL:SY']],
 [/^野外\s*(?:白天|夜晚)/,['A:ZD:ZHIDONG1']],
];
const primary = s => s.split('\n').filter(x=>!x.includes('《原神》EP')&&!x.includes('旅行历程'))[0]??'';
const useful = s => s.trim()&&!/^[\s/—-]+$/.test(s);
const clean = s => s.replace(/[「」『』“”]/g,'').trim();
export function category(t) {
  const extra=jaEvidence.get(t.id??(t.neteaseId?'netease:'+t.neteaseId:''));
  const supplemented=supplementalKind(extra);if(supplemented)return supplemented;
  const note=t.metadataNotes?.find(n=>n.startsWith('日文Wiki分类：'));if(note)return note.slice('日文Wiki分类：'.length);
  const o=primary(t.originText);
  if(!useful(o))return 'missing-source';
  if(/非战斗|战斗状态仍然使用/.test(o))return 'scene';
  if(/周本|BOSS|Boss|战斗|战BGM|女士[一二]阶段|雷电将军.*阶段|深海龙蜥|公子.*阶段|魔王武装/.test(o)){
    if(/^(蒙德战斗|璃月野外战斗|须弥(?:雨林|沙漠)野外战斗|龙脊雪山\s*战斗BGM|挪德卡莱.*大世界战斗|远古圣山战斗曲|霜月战斗曲|战斗曲[123]$)/.test(o))return 'battle-generic';
    return 'battle-limited';
  }
  if(/Battles of Inazuma/.test(t.discTitle)&&/^稻妻野外/.test(o))return 'battle-generic';
  if(/任务|剧情|传说|过场|PV|活动|小游戏|主题曲|印象曲|界面|改编|回忆|登场|出场|音乐[一二三123]|七圣召唤|千星/.test(o))return 'task';
  return 'scene';
}
function special(album,t) {
  const o=t.originText;
  if(/金苹果|海岛幻境|海岛剧情/.test(o)||album.title==='珍珠之歌'&&t.discNumber===1||album.title==='珍珠之歌2'&&t.discNumber===2)return 'A:APPLE:'+(album.title==='珍珠之歌2'?'2_8':'1_6');
  if(/琉形蜃[境景]|清夏.*乐园.*大秘境/.test(o)||album.title==='珍珠之歌3'&&t.discNumber===1)return 'A:VELURIYAM:3_8';
  if(/希穆兰卡/.test(o)||album.title==='珍珠之歌4'&&t.discNumber===1)return 'A:SIMULANKA:4_8';
  return null;
}
export function classifyOne(album,t,map) {
  const extra=jaEvidence.get(t.id??'netease:'+t.neteaseId);
  const kind=category(t),o=clean(extra?.conflict?primary(t.originText):kind.startsWith('battle-')&&extra?.placeZh?.trim()?extra.placeZh:[primary(t.originText),extra?.placeZh].filter(s=>s&&useful(s)).join('、'));
  const specialCode=special(album,t);
  if(specialCode)return {kind:'special-map',areaCodes:[specialCode],countries:[map.areas.find(a=>a.code===specialCode).name.replace(/\(.+\)/,'')],points:[],terms:[],reason:'特殊地图只记录地区目录，不挂当前点位。'};
  const tokens=[];
  for(const a of map.anchors){
    if(bannedArea(a.areaCode)||a.hiddenFlag===3)continue;
    const header=pointHeader(a);
    let place=clean(header.replace(new RegExp('^'+a.country+'\\s*'),''));
    // Some independent maps use their own place header instead of a national prefix.
    if(!place||place.length<2)continue;
    tokens.push({place,a});
  }
  let exact=tokens.filter(({place})=>o.includes(place));
  // A country–region–place path denotes its leaf, not all points of its parent region.
  const terms=[...new Set(exact.map(x=>x.place))];
  exact=exact.filter(({place})=>!terms.some(leaf=>leaf!==place&&o.includes(place+'-'+leaf)||leaf!==place&&o.includes(place+'·'+leaf)));
  // Broad headers (islands/major regions) are candidate ranges, not invented fine places.
  const countries=map.areas.filter(a=>a.parentId===-1&&a.hiddenFlag!==3&&o.includes(a.name)).map(a=>a.name);
  if(exact.length)for(const {a} of exact)if(!countries.includes(a.country))countries.push(a.country);
  let areaCodes=[...new Set(exact.map(({a})=>a.areaCode))];
  if(/悠悠度假村|绘夏.*度假村/.test(o)){areaCodes=['A:NT:NATA5'];if(!countries.includes('纳塔'))countries.push('纳塔');}
  if(/霜月战斗|登月|月心|月表|乌吉恩圈|伊比尼伯龙之眼|月荡海|望月者号|星空生物捕捉站|努尔寂石/.test(o)){areaCodes=['A:NDKL:SY'];if(!countries.includes('挪德卡莱'))countries.push('挪德卡莱');}
  if(/空之神殿|麓阳书院|大方广|无想之间|无所有廊|山中好长日/.test(o)){areaCodes=['A:MD:SHENDIAN'];if(!countries.includes('蒙德'))countries.push('蒙德');}
  // Boss country from the two successfully inspected domain pages; no invented nearby coordinates.
  if(/特瓦林周本|风魔龙战斗/.test(o)){areaCodes=['A:MD:MENGDE'];countries.splice(0,countries.length,'蒙德');exact=tokens.filter(({place})=>place==='风龙废墟');}
  if(/正机之神|散兵周本/.test(o)){areaCodes=['A:XM:FOREST'];countries.splice(0,countries.length,'须弥');}
  if(!countries.length&&albumAreas[album.title]){
    areaCodes=albumAreas[album.title];
    for(const code of areaCodes){const area=map.areas.find(a=>a.code===code);const root=map.areas.find(a=>a.id===area.parentId);if(!countries.includes(root.name))countries.push(root.name);}
  }
  if(!areaCodes.length&&countries.length)areaCodes=map.areas.filter(a=>a.isFinal&&countries.includes(map.areas.find(p=>p.id===a.parentId)?.name)&&a.hiddenFlag!==3).map(a=>a.code);
  const broad=broadScopes.find(([r])=>[o,primary(t.originText),extra?.placeZh??''].some(s=>r.test(s))&&(!r.source.startsWith('^野外')||album.title==='悯宥慈怜之垠'));
  if(broad&&(kind==='battle-generic'||kind==='scene'))areaCodes=broad[1];
  if(kind==='battle-generic'&&album.title==='悯宥慈怜之垠')areaCodes=['A:ZD:ZHIDONG1'];
  const extraScopes=supplementalScopes(extra,map);if(extraScopes)areaCodes=extraScopes;
  let points=exact.map(({a})=>a);
  let method='place-match',reason='出处地名与点位地理标题交叉匹配，实际音区仍待校对。';
  if(kind==='battle-generic'){
    points=map.anchors.filter(a=>areaCodes.includes(a.areaCode)&&!isCity(a)&&!bannedArea(a.areaCode)&&a.hiddenFlag!==3);method='region-scope';reason='通用战斗独立覆盖来源范围所有非城市点位，不受专属普通场景音乐影响。';
  }else if(kind==='scene'&&(broad||extraScopes)){
    points=map.anchors.filter(a=>areaCodes.includes(a.areaCode)&&!isCity(a)&&!bannedArea(a.areaCode)&&a.hiddenFlag!==3);method='region-scope';reason='野外普通场景按来源范围补充，随后排除已有特有普通场景的点位。';
  }else if(!points.length&&kind!=='battle-limited'&&countries.length){
    // Archive only within a known namespace, never turn the absence of coordinates into a fact.
    points=map.anchors.filter(a=>a.kind==='statue'&&areaCodes.includes(a.areaCode)&&!bannedArea(a.areaCode)&&a.hiddenFlag!==3);method='region-archive';reason='缺少精确点位，按来源地区或场景专辑归属在本范围神像归档；不代表实际播放。';
  }
  if(kind==='battle-limited'&&!points.length)reason='限定战斗缺少对应地点/附近点位证据，保留目录，不扩大到全区域。';
  if(method==='region-archive'&&!points.length&&countries.length)reason='地区可确定，但本范围无匹配点位且没有可归档神像；只保留地区目录。';
  if(!countries.length){areaCodes=[];points=[];reason='来源与多地区回顾专辑均不能确定地区，保留未定位目录。';}
  return {kind,areaCodes,countries,points:[...new Map(points.map(a=>[a.id,a])).values()],terms:[...new Set(exact.map(x=>x.place))],method,reason};
}
export function generateAssociations(source,map,existing) {
  const candidates=source.albums.flatMap(album=>album.tracks.map(track=>({album,track,classification:classifyOne(album,track,map)})));
  const occupied=new Set();
  const byTrack=new Map(existing.tracks.map(t=>[t.id,t]));
  for(const a of existing.associations){const t=byTrack.get(a.trackId);if(!a.id.startsWith('ost:')&&['place-match','parent-place-match'].includes(a.matchType)&&t&&category(t.sceneInfo??{originText:'',discTitle:''})==='scene')occupied.add(a.anchorId);}
  const broadNames=new Set(map.areas.filter(a=>a.isFinal).flatMap(a=>[a.name,...a.name.split('、')]));
  for(const c of candidates)if(c.classification.kind==='scene'&&c.classification.method==='place-match'&&c.classification.terms.some(t=>!broadNames.has(t)))for(const p of c.classification.points)occupied.add(p.id);
  for(const c of candidates){if(c.classification.kind==='scene'&&c.classification.method==='region-scope')c.classification.points=c.classification.points.filter(p=>!occupied.has(p.id));}
  // Geographic parent scopes fill only scene gaps, independently of battle/task links.
  const sceneCovered=new Set(occupied);
  for(const c of candidates)if(c.classification.kind==='scene'&&c.classification.method!=='region-archive')for(const p of c.classification.points)sceneCovered.add(p.id);
  for(const p of map.anchors){
    if(p.kind!=='waypoint'||isCity(p)||bannedArea(p.areaCode)||p.hiddenFlag===3||sceneCovered.has(p.id))continue;
    const header=clean(pointHeader(p).replace(new RegExp('^'+p.country+'\\s*'),''));
    const parents=candidates.filter(c=>c.classification.kind==='scene'&&c.classification.method==='place-match'&&c.classification.areaCodes.includes(p.areaCode)&&c.classification.terms.some(term=>header.startsWith(term+' · ')||header.startsWith(term+'·')||header.startsWith(term+'-')));
    for(const c of parents){c.classification.points.push(p);c.classification.reason='出处地名匹配同地区点位地理标题的父级范围；仅补缺少常态场景音乐的点位，实际音区待校对。';}
  }
  return candidates;
}
