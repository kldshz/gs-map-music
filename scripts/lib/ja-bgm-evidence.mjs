import data from '../../data/sources/ja-bgm-crosscheck.json' with {type:'json'};
export const jaEvidence=new Map(data.tracks.map(t=>[t.trackId,t]));
export function supplementalKind(e){
 if(!e)return null;
 if(e.role==='battle-limited')return 'battle-limited';
 if(e.role==='battle')return /^(?:戦闘(?:\((?:モンド|璃月|稲妻|スメール|フォンテーヌ|ナタ|ナド・クライ|スネージナヤ|ドラゴンスパイン|淵下宮|霜月|諸法の森|大赤砂海|古の聖山)\))?|淵下宮\(戦闘\))$/.test(e.placeJa)?'battle-generic':'battle-limited';
 if(e.role==='task')return 'task';
 return e.placeJa.trim()? 'scene':null;
}
export function supplementalScopes(e,map){
 if(!e)return null;
 if(e.placeJa==='戦闘'&&e.album==='千岩旷望')return ['A:LY:CENGYAN','A:LY:CENGYAN_UG'];
 if(/諸法の森/.test(e.placeJa))return ['A:XM:FOREST'];
 if(/大赤砂海/.test(e.placeJa))return ['A:XM:DESERT','A:XM:DESERT2','A:XM:DESERT3'];
 if(/淵下宮/.test(e.placeJa))return ['A:DQ:YUANXIAGONG'];
 if(/霜月/.test(e.placeJa))return ['A:NDKL:SY'];
 if(e.placeJa==='戦闘(古の聖山)')return ['A:NT:NATA4'];
 if(/海を望めぬ峰/.test(e.placeJa)&&/波追いの峠/.test(e.placeJa))return ['A:NDKL:NDKL2','A:NDKL:NDKL3'];
 if(e.placeJa==='三界道饗祭')return ['A:DQ:SANJIE'];
 const countries={'戦闘(モンド)':['A:MD:MENGDE'],'戦闘(璃月)':['A:LY:LIYUE'],'戦闘(稲妻)':['A:DQ:1','A:DQ:2','A:DQ:HEGUAN'],'戦闘(スメール)':['A:XM:FOREST'],'戦闘(ドラゴンスパイン)':['A:MD:XUESHAN'],'戦闘(ナド・クライ)':['A:NDKL:NDKL','A:NDKL:NDKL2','A:NDKL:NDKL3']};
 if(countries[e.placeJa])return countries[e.placeJa];
 if(e.placeJa==='戦闘(スネージナヤ)')return ['A:ZD:ZHIDONG1'];
 if(e.placeJa==='戦闘(フォンテーヌ)')return ['A:FD:FENGDAN','A:FD:FENGDAN2','A:FD:FENGDAN3','A:FD:FENGDAN4','A:FD:ANCIENT_SEA'];
 if(e.placeJa==='戦闘(ナタ)')return ['A:NT:NATA','A:NT:NATA2','A:NT:NATA3'];
 if(e.placeJa==='層岩巨淵')return ['A:LY:CENGYAN'];
 if(e.placeJa==='層岩巨淵・地下鉱区')return ['A:LY:CENGYAN_UG'];
 if(/^沈玉の谷\([昼夜霧]\)$/.test(e.placeJa))return ['A:LY:CHENYUGU'];
 return null;
}
