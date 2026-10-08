import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const albums=await read('.local/ja-bgm-albums.json'),main=await read('.local/bgm-ja-tables.json'),words=await read('.local/genshin-words.json');
const library=await read('public/data/music-library.json');
const norm=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const terms=[];
for(const w of words)if(w.ja&&w.zhCN)for(const ja of [w.ja,...(w.variants?.ja??[])].flatMap(s=>s.split(/\s+\/\s+/)))if(ja.length>1)terms.push({ja,zh:w.zhCN,url:'https://genshin-dictionary.com/zh-CN/'+w.id});
terms.sort((a,b)=>b.ja.length-a.ja.length);
const used=new Map();
const prose={
 '諸法の森':'须弥雨林','失なわれた苗畑':'失落的苗圃','永遠のオアシス':'永恒绿洲','オアシス':'绿洲','裏切りの塔':'背叛之塔','真の安眠処':'真正的安眠处','マジック工房':'魔术工坊','エリニュスの根':'伊黎耶之根','願いの象限':'愿望之象限','記憶の象限':'记忆之象限','魂の象限':'灵魂之象限','人格の象限':'人格之象限','クイセルのクロックワーク工房':'奎瑟发条工坊','ブラヴェのプレス工房':'布拉维锻压工坊','廃棄された実験室':'废弃实验室','春立つ風を梳かす彩鳶':'彩鹞栉春风','沈玉の祝福':'沉玉祝珑','パレス・カエサレウム':'切萨勒姆宫','ホルトゥス・ユーレゲティス':'优恩花园','ドムス・アウレア':'黄金宫殿','カピトリウム':'卡皮托林','諧律のカンティクル':'谐律上的咏叙诗','スピリット・ウォール':'灵墙','テスカテペトン山脈':'特斯卡特佩通山脉','聖山の心':'圣山之心','源火の玉座':'源火之座','春光が描く桃符':'春曦画桃符','ケラティの目':'凯拉蒂之眼','浴光の台地':'沐光之台','月の狭間':'月隙','北の訓練場':'北方训练场','空月の歌':'空月之歌','ガイア':'凯亚','モナ':'莫娜','フィッシュル':'菲谢尔','エウルア':'优菈','小兎の章':'小兔之章','招待ルーム':'邀请房间','戦士の挑戦':'勇士挑战','花翼の集':'花羽会','謎煙の主':'烟谜主','染夏！烈日？リゾート満喫！':'绘夏！烈日？度假村！',
};
function translate(text){
 const more={'ゲームプレイトレーラー':'游戏玩法预告片','とある小宇宙のはじまり':'某个小宇宙的开端','そしてすぐに夕暮れが来る':'很快便将迎来黄昏','エネルギーフローに影響された':'受能量流影响的','ヒルチャールの集落':'丘丘人聚落','予測不能の舞台！':'不可预测的舞台！','スピリット・ウォール':'灵墙','聖道試練の遺跡':'圣道试炼遗迹','原初の災境':'原初灾境','織りの間':'织造间','伝説の天舵の船':'传说中的天舵船','ヴクブ':'乌库布','トーテムポール':'图腾柱','ウィツィロポチトリが存在するエリア':'维齐洛波奇特利所在区域','ショートアニメ':'动画短片','キャラアニメ':'角色动画','生涯の記憶':'一生的记忆','瓶の中の願い':'瓶中的愿望','トルフィンに出会う前':'遇见托尔芬之前','「テツクジラ大将」を呼び覚ます前':'唤醒铁鲸大将之前','「テツクジラ大将」を呼び覚ました後':'唤醒铁鲸大将之后','ラウマかコロンビーナがチーム内にいる時':'菈乌玛或哥伦比娅在队伍中时','碑文を全て下ろした後':'放下全部碑文后','誓いを遺した者の聖地':'留誓者圣地','魔女の花園':'魔女的花园','苦難の道':'苦难之路','果てなき深谷':'无尽深谷','終末後の楽園':'末日后的乐园','夜鳴鶯の歌':'夜莺之歌','氷霜の王庁':'冰霜王庭','氷結の雷枝':'冰结雷枝','雲上の祭壇':'云上祭坛','祈りの礼拝堂':'祈祷礼拜堂','光に満ちた庭園':'充满光芒的庭园','帰らぬ熄星':'未归的熄星','白亜と黒龍':'白垩与黑龙','風花の招待':'风花的邀约','決闘！召喚の頂！':'决斗！召唤之巅！','祝福の小屋':'祝福小屋','囁きの島':'低语之岛','控え室':'候场室','薄靄の渚':'薄雾之渚','高速移送トンネル':'高速转运隧道','カラグの警備地':'卡拉格警戒地','月を見上げる時':'仰望月亮之时','星々を巡り、幻境を築く旅へ':'巡星之旅，筑梦幻境','夜を紡ぐ灯り':'编织夜色的灯火','プレビュー動画':'前瞻视频','野外動画':'野外视频','吹雪に覆われた凍土':'风雪覆盖的冻土','極寒の不文律':'极寒的不成文律','睡竜の章':'眠龙之章','獄主犬の章':'狱守犬之章','楽隊の公演':'乐队演出','海蝕の裂け目':'海蚀裂隙','執務室':'办公室','地下マグマ流':'地下熔岩流','祈月の夜':'祈月之夜','星の庭':'星之庭','螺の楽章':'螺之乐章','水の秘密':'水之秘密'};
 for(const [ja,zh] of Object.entries(more).sort((a,b)=>b[0].length-a[0].length))text=text.replaceAll(ja,zh);
 for(const [ja,zh] of Object.entries(prose).sort((a,b)=>b[0].length-a[0].length))text=text.replaceAll(ja,zh);
 let out='',i=0;while(i<text.length){const term=terms.find(t=>text.startsWith(t.ja,i));if(term){out+=term.zh;used.set(term.ja,term);i+=term.ja.length;}else out+=text[i++];}
 out=out.replaceAll('ログイン画面','登录界面').replaceAll('シーン','场景').replaceAll('洞窟','洞窟').replaceAll('霧が晴れた後','雾散后').replaceAll('中の','中的').replaceAll('等','等').replaceAll('関連','相关').replaceAll('地上','地表').replaceAll('地下','地下').replaceAll('中心部','中心区域').replaceAll('周辺','周围').replaceAll('招待ルーム','邀请房间').replaceAll('移送ステーション','转运站').replaceAll('ステーション','站').replaceAll('船外','舱外').replaceAll('オープニング','开场').replaceAll('会話','对话').replaceAll('ステルス時','潜行时');
 return out.replaceAll('戦闘','战斗').replaceAll('ボス','Boss').replaceAll('フィールド','野外').replaceAll('魔神任務','魔神任务').replaceAll('伝説任務','传说任务').replaceAll('世界任務','世界任务').replaceAll('イベント','活动').replaceAll('ムービー','过场').replaceAll('(昼)','(白天)').replaceAll('(夜)','(夜晚)').replaceAll('海中','水下').replaceAll('・','·').replaceAll('誓いの間','誓约之间').replaceAll('真の安眠处','真正的安眠处').replaceAll('孔雀の章','孔雀羽之章').replaceAll('翠黛の山','翠黛峰').replaceAll('龍の巣','龙巢').replaceAll('安息の殿堂','安息之殿').replaceAll('瓶の','瓶中的').replaceAll('願い','愿望').replaceAll('遺跡','遗迹').replaceAll('の','之');
}
const evidence=[],unmatched=[],failed=albums.filter(a=>a.error);
for(const album of albums.filter(a=>a.tables)){
 const albumTracks=library.tracks.filter(t=>t.sceneInfo);
 const expected=albumTracks.filter(t=>t.album.startsWith('原神-'+album.album+' '));
 const matched=new Map();
 for(const table of album.tables){const header=table[0],placeColumn=header.findIndex(s=>/再生場所|再生エリア/.test(s));
  for(const row of placeColumn<0?table:table.slice(1)){
   const lines=(row[0]??'').split('\n'),english=lines.filter(s=>/[A-Za-z]{2}/.test(s)).join(' ').replace(/\*\d+/g,'');
   if(!english)continue;
   const found=expected.filter(t=>norm(t.sceneInfo.englishTitle)===norm(english));
   if(found.length!==1){if(found.length)unmatched.push({album:album.album,titleJa:lines[0],english,reason:'ambiguous'});continue;}
   const t=found[0],mainRows=main.filter(table=>['エリア','テーマ曲','任務'].includes(table.section)).flatMap(table=>table.rows.slice(1).filter(row=>row[0]?.text===lines[0]&&row.some(cell=>cell?.text?.split('\n').some(s=>s.trim()===album.albumJa))).map(row=>({section:table.section,subsection:table.subsection,placeJa:row[1]?.text??''})));
   const placeJa=row[placeColumn]??mainRows.find(r=>r.section==='エリア')?.placeJa??mainRows[0]?.placeJa??'';const allPlaces=[...new Set([placeJa,...mainRows.map(r=>r.placeJa)].filter(Boolean))];
   let role=mainRows.some(r=>r.subsection==='ボス戦')?'battle-limited':allPlaces.some(s=>/戦闘/.test(s))?'battle':mainRows.some(r=>r.section==='エリア')?'scene':allPlaces.some(s=>/任務|ムービー|イベント|ログイン|PV/.test(s))?'task':'scene';
   const original=t.sceneInfo.metadataNotes.find(n=>n.startsWith('BWIKI原出处：'))?.slice(9)??t.sceneInfo.originText;
   const conflict=!role.startsWith('battle')&&!/非战斗|战斗状态仍然使用/.test(original)&&/战斗|BOSS|Boss|周本|深海龙蜥|魔王武装/.test(original)?'BWIKI明确战斗；日文仅列地点/任务，不能据此降为常态，保留限定战斗待校对。':null;
   if(conflict)role='battle-limited';
   const item={trackId:t.id,title:t.title,englishTitle:t.sceneInfo.englishTitle,titleJa:lines[0],album:album.album,albumJa:album.albumJa,sourceUrl:album.url,mainSourceUrl:'https://wikiwiki.jp/genshinwiki/BGM',placeJa,placeZh:translate(placeJa),role,...(conflict?{conflict}:{}),contexts:mainRows.map(r=>({...r,placeZh:translate(r.placeJa)}))};
   if(!matched.has(t.id))matched.set(t.id,item);else if(matched.get(t.id).placeJa!==placeJa)unmatched.push({trackId:t.id,reason:'conflicting-album-row',places:[matched.get(t.id).placeJa,placeJa]});
  }
 }
 evidence.push(...matched.values());
 for(const t of expected)if(!matched.has(t.id))unmatched.push({trackId:t.id,title:t.title,album:album.album,reason:'no-unique-bilingual-row'});
}
const result={capturedOn:'2026-10-08',sources:['https://wikiwiki.jp/genshinwiki/BGM','https://genshin-dictionary.com/zh-CN/opendata','https://dataset.genshin-dictionary.com/words.json'],matching:'专辑范围内唯一英文曲名；日文曲名再与主表交叉验证。非唯一不自动写入。专有名词优先采用用户指定词典；说明性短语由中文对照翻译，日文原文单独保留。',tracks:evidence,translationTerms:[...used.values()],unmatched,failedAlbums:failed};
await fs.writeFile('data/sources/ja-bgm-crosscheck.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({matched:evidence.length,battles:evidence.filter(e=>e.role.startsWith('battle')).length,unmatched:unmatched.length,failedAlbums:failed.length,translationTerms:used.size}));
