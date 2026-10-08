import labelsSource from '../../data/sources/official-map-labels.json' with {type:'json'};
export const normalizePlace=s=>(s??'').replace(/[「」『』“”]/g,'').replace(/\s*·\s*/g,'·').replace(/奥奇坎纳塔/g,'奥奇卡纳塔').trim();
export const headerPlace=a=>normalizePlace((a.content.match(/【([^】]+)】/)?.[1]??'').replace(new RegExp('^'+a.country+'\\s*'),''));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const scopeKey=s=>JSON.stringify([s.country,s.primary,s.secondary]);
export const scopeLabel=s=>[s.country,s.primary,s.secondary].filter(Boolean).join(' / ');
const parentOverrides={
 蒙德城:'坠星山谷',果酒湖:'坠星山谷',低语森林:'坠星山谷',星落湖:'坠星山谷',摘星崖:'坠星山谷',望风山地:'坠星山谷',望风角:'坠星山谷',
 清泉镇:'苍风高地',晨曦酒庄:'苍风高地',奔狼领:'苍风高地',风起地:'风啸山坡',千风神殿:'风啸山坡',达达乌帕谷:'风啸山坡',誓言岬:'风啸山坡',鹰翔海滩:'风啸山坡',马斯克礁:'风啸山坡',风龙废墟:'明冠山地',明冠峡:'明冠山地',
 柔灯港:'伊黎耶林区',巡猎者木屋:'古兽冰原',凝露镇:'古兽冰原',曙光车站:'古兽冰原',
 石门:'碧水原',荻花洲:'碧水原',望舒客栈:'碧水原',轻策庄:'碧水原',无妄坡:'碧水原',地中之盐:'碧水原',归离原:'琼玑野',渌华池:'琼玑野',明蕴镇:'琼玑野',瑶光滩:'琼玑野',翠玦坡:'珉林',绝云间:'珉林',庆云顶:'珉林',奥藏山:'珉林',华光林:'珉林',琥牢山:'珉林',南天门:'珉林',天遒谷:'珉林',遁玉陵:'璃沙郊',灵矩关:'璃沙郊',青墟浦:'璃沙郊',璃月港:'云来海',天衡山:'云来海',孤云阁:'云来海',
};
const countryPrimaries={蒙德:['坠星山谷','苍风高地','风啸山坡','明冠山地'],璃月:['碧水原','琼玑野','珉林','璃沙郊','云来海'],须弥:['护世森','道成林','二净甸','桓那兰那','善见地','阿陀河谷','失落的苗圃']};
export function makeCatalog(map){
 const main=map.anchors.filter(a=>a.position&&!a.underground&&a.hiddenFlag!==3&&!/^A:(APPLE|VELURIYAM|SIMULANKA):/.test(a.areaCode)&&!/CENGYAN_UG|YUANXIAGONG|ANCIENT_SEA|:SY$|SHENDIAN|SANJIE|NATA4/.test(a.areaCode));
 const labels=labelsSource.labels.map(l=>({...l,position:l.officialPosition.map((v,i)=>v*labelsSource.transform.scale+labelsSource.transform.offset[i])}));
 for(const l of labels){const closest=main.reduce((p,a)=>!p||distance(a.position,l.position)<distance(p.position,l.position)?a:p,null);l.country=closest?.country??'';}
 const primary=labels.filter(l=>l.tier==='primary');
 function primaryFor(a,at=a.position){
  const parts=a.areaName.split('、').map(normalizePlace),allowed=countryPrimaries[a.country]&&['A:MD:MENGDE','A:LY:LIYUE','A:XM:FOREST'].includes(a.areaCode)?countryPrimaries[a.country]:parts;
  const candidates=primary.filter(l=>l.country===a.country&&allowed.includes(l.name));
  return candidates.length&&at?candidates.sort((x,y)=>distance(x.position,at)-distance(y.position,at))[0].name:(parts.length===1?parts[0]:null);
 }
 const secondaries=labels.filter(l=>l.tier==='secondary');
 for(const l of secondaries){const nearest=main.filter(a=>a.country===l.country).sort((a,b)=>distance(a.position,l.position)-distance(b.position,l.position))[0];l.primary=parentOverrides[l.name]??(nearest?primaryFor(nearest,l.position):null);}
 return {primary,secondaries,primaryFor,sourceUrl:labelsSource.sourceUrl};
}
export function classifyAnchor(a,catalog){
 const place=headerPlace(a),allPrimary=catalog.primary.filter(l=>l.country===a.country).map(l=>l.name);
 const headerPrimary=allPrimary.filter(p=>place===p||place.startsWith(p+'·')).sort((a,b)=>b.length-a.length)[0];
 const explicit=catalog.secondaries.filter(l=>l.country===a.country&&(place===normalizePlace(l.name)||place.startsWith(normalizePlace(l.name)+'·')||place.startsWith(normalizePlace(l.name)+'-'))).sort((a,b)=>b.name.length-a.name.length)[0];
 let primary=headerPrimary??explicit?.primary??catalog.primaryFor(a),secondary=null,method='source-header',dist=null;
 const broad=place===a.country||place===normalizePlace(a.areaName)||place===primary||allPrimary.includes(place);
 if(explicit)secondary=explicit.name;
 else if(!broad&&place)secondary=headerPrimary?place.slice(headerPrimary.length+1):place;
 else if(a.underground){secondary=normalizePlace(a.content.match(/(?:地下|水下|空中)「([^」]+)」/)?.[1]??'')||null;}
 else if(a.position){
  const candidates=catalog.secondaries.filter(l=>l.country===a.country&&l.primary===primary).map(l=>({...l,distance:distance(a.position,l.position)})).sort((x,y)=>x.distance-y.distance);
  const best=candidates[0],runner=candidates[1];
  if(best&&best.distance<=350&&(!runner||runner.distance-best.distance>=80)){secondary=best.name;dist=Math.round(best.distance);method='landmark-distance';}
 }
 // User inspected examples: avoid allowing a future label snapshot to fill the distant point.
 if(a.id==='kongying:121680'){primary='古兽冰原';secondary='巡猎者木屋';method='landmark-distance';dist=Math.round(distance(a.position,catalog.secondaries.find(l=>l.name===secondary).position));}
 if(a.id==='kongying:121678'){primary='古兽冰原';secondary=null;dist=null;}
 if(/^枫丹廷(?:区)?·(?:纳博内区|利奥奈区|灰河|沫芒宫)/.test(place)){primary='枫丹廷区';secondary='枫丹廷';method='source-header';dist=null;}
 if(!primary&&!secondary)method='unresolved';
 return {country:a.country,primary,secondary,method,evidenceStatus:'pending',distance:dist,sourceUrl:method==='landmark-distance'?catalog.sourceUrl:a.sourceUrl};
}
export function geographyTokens(map,catalog){
 const rows=[...map.anchors.filter(a=>a.hiddenFlag!==3&&!/^A:(APPLE|VELURIYAM|SIMULANKA):/.test(a.areaCode)).map(a=>a.geography),...catalog.secondaries.map(l=>({country:l.country,primary:l.primary,secondary:l.name})),...catalog.primary.map(l=>({country:l.country,primary:l.name,secondary:null}))].filter(Boolean);
 return [...new Map(rows.map(s=>{const g={country:s.country,primary:s.primary??null,secondary:s.secondary??null};return [scopeKey(g),g]})).values()];
}
export function findScopes(text,rows){
 const o=normalizePlace(text),hits=rows.filter(s=>s.secondary&&o.includes(normalizePlace(s.secondary)));
 const fine=hits.filter(s=>!hits.some(l=>l.secondary!==s.secondary&&normalizePlace(l.secondary).includes(normalizePlace(s.secondary))));
 const parents=rows.filter(s=>!s.secondary&&s.primary&&o.includes(normalizePlace(s.primary))&&!fine.some(f=>f.country===s.country&&f.primary===s.primary));
 return [...new Map([...fine,...parents].map(s=>[scopeKey(s),s])).values()];
}
export function matchesScope(a,s){const g=a.geography;return !!g&&g.country===s.country&&(!s.primary||g.primary===s.primary)&&(!s.secondary||g.secondary===s.secondary||g.secondary?.startsWith(s.secondary+'·'));}
