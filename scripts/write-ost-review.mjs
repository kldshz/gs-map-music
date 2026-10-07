import fs from 'node:fs/promises';
const r=JSON.parse(await fs.readFile('data/review/ost-association-review.json','utf8'));
const source=JSON.parse(await fs.readFile('data/sources/ost-bulk-source.json','utf8'));
const esc=s=>String(s).replaceAll('|','／').replaceAll('\n','；');
let md=`# OST批量校对清单\n\n2026-10-07，仍阶段3。新增${r.summary.newTracks}曲、${r.summary.newAssociations}候选关系；原63曲另补蒙德通用战斗10关系。曲库共${r.summary.totalTracks}曲/${r.summary.totalAssociations}关系。全部pending，不参加路线自动选曲。原63出处/个人评价不重做，主键保留前缀。\n\n`;
md+='| 专辑 | 新曲目 | 候选关系 | 地区不明 | 无点位 | 空出处 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n';
for(const a of source.albums){const ts=r.tracks.filter(t=>t.album===a.title);md+=`| ${a.title} | ${ts.length} | ${ts.reduce((n,t)=>n+t.anchorIds.length,0)} | ${ts.filter(t=>!t.countries.length).length} | ${ts.filter(t=>!t.anchorIds.length).length} | ${ts.filter(t=>!t.originText.trim()||/^[\s/—-]+$/.test(t.originText)).length} |\n`;}
md+=`\n## 重点校对\n\n- ${r.summary.unlocated}首尚不能确定地区，集中在多地区回顾专辑的无出处、活动/任务与角色曲；保留未定位目录，未随意挂神像。\n- ${r.summary.missingOrigin}首来源为空或斜杠，已知场景专辑地区只作归档依据，不能视为实际触发音区。白露/万流/沉玉/金律与部分纳塔战斗分碟未注明限定性，未仅凭分碟“战记”标题推为全域通用战斗。\n- ${r.summary.limitedBattleWithoutPoint}首限定战斗缺少地点附近证据，暂零挂载；包括正机之神、阿佩普、若陀龙王等。已检索追加页面部分404/567，未补造坐标。\n- 金苹果29首、琉形30首、希穆26首，共85首录入并记录特殊地图地区，零挂载。\n- 悠悠度假村已按25个点位范围及精确地名处理；霜月已有33点位可匹配，雾灵渚、浮沤泊等缺现说明地名，相关曲目保留待核对。当前挪德四区原目录只有锚点没有神像，无法履行神像归档的曲目只留地区目录。\n- ${source.conflicts.length}条来源差异记录：98条标题/外文差异（其中34条Wiki外文为空）、1条重复分碟标题、1条幽暮同名版本。逐曲ID无未解决匹配冲突。保留双方原文，不用相邻序号猜ID。\n- 所有地区范围、父级地点及神像归档关系仍需你核对；不是实测游戏BGM。人工增删机制保留，删除覆盖来源基线，重复生成不会在有效曲库重新添加。\n\n`;
for(const [title,predicate] of [
 ['地区不明曲目',t=>!t.countries.length],
 ['限定战斗无点位',t=>t.category==='battle-limited'&&!t.anchorIds.length],
 ['地区已知但当前无匹配点位或神像（特殊地图及限定战斗除外）',t=>t.countries.length&&!t.anchorIds.length&&!['special-map','battle-limited'].includes(t.category)],
]){
 md+=`## ${title}\n\n| 专辑 | 歌曲ID | 歌曲 | 出处原文 | 地区目录 |\n| --- | --- | --- | --- | --- |\n`;
 for(const t of r.tracks.filter(predicate))md+=`| ${esc(t.album)} | ${t.id} | ${esc(t.title)} | ${esc(t.originText)||'（来源未提供）'} | ${esc(t.countries.join('、'))||'未定位'} |\n`;
 md+='\n';
}
md+='## 来源冲突与差异\n\n完整字段见 [净化来源](../data/sources/ost-bulk-source.json)，原出处/候选点位逐曲见 [机器可读校对记录](../data/review/ost-association-review.json)。\n\n';
for(const c of source.conflicts)md+=`- ${esc(c.album)}：${c.type}；${esc(c.wiki??c.caption??c.selected)} → ${esc(c.netease??JSON.stringify(c.versions??{}))}。${c.resolution}\n`;
await fs.writeFile('docs/OST_REVIEW.md',md);
console.log(r.summary);
