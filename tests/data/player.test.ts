import test from 'node:test';
import assert from 'node:assert/strict';
import { useMusicPlayer, PLAYER_KEY } from '../../src/services/music-player';
import { useMusicCollection, COLLECTION_KEY } from '../../src/services/music-collection';
import { officialAvailability, parseRange, resolveNeteaseOuter } from '../../scripts/playback-service';
import type { MusicTrack, PlaybackResource } from '../../src/domain/contracts';

class MemoryStorage implements Storage {
  values=new Map<string,string>();length=0;fail=false;
  getItem(k:string){return this.values.get(k)??null;}
  setItem(k:string,v:string){if(this.fail)throw Error('quota');this.values.set(k,v);}
  removeItem(k:string){this.values.delete(k);}
  clear(){this.values.clear();}
  key(n:number){return [...this.values.keys()][n]??null;}
}
class Media extends EventTarget {
  src='';preload='';volume=1;currentTime=0;duration=120;error:null|object=null;paused=true;
  blocked=false;deferred:Promise<void>|null=null;
  async play(){if(this.blocked){const e=Error();e.name='NotAllowedError';throw e;}if(this.deferred)return this.deferred;this.paused=false;this.dispatchEvent(new Event('playing'));}
  pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
  load(){}removeAttribute(){this.src='';}
  emit(name:string){this.dispatchEvent(new Event(name));}
}
const tracks=['1','2','3'].map(id=>({id:`netease:${id}`,title:id,artists:['HOYO-MiX'],composers:null,album:null,releaseDate:null,durationSeconds:null,description:'',neteaseId:id,sourceUrl:null} satisfies MusicTrack));
const ready:PlaybackResource={status:'ready',provider:'local',url:'/api/playback/audio?trackId=netease%3A1',expiresAt:null,preview:false};
const unavailable:PlaybackResource={status:'unavailable',reason:'permission',message:'当前无权限'};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(resolve: (id:string,signal:AbortSignal)=>Promise<PlaybackResource>=async()=>ready,storage=new MemoryStorage()){
 const media:Media[]=[];const player=useMusicPlayer(()=>tracks,{storage,resolve,random:()=>0,createAudio:()=>{const m=new Media();media.push(m);return m as unknown as HTMLAudioElement;}});return {player,media,storage};
}
test('缺音频不生成媒体、无假播放进度；官方不可见/错ID不可播放',async()=>{
 const {player,media}=setup(async()=>unavailable);await player.playTrack('netease:1');assert.equal(player.status.value,'unavailable');assert.equal(player.playing.value,false);assert.equal(player.position.value,0);assert.equal(media.length,0);
 assert.equal(officialAvailability([{originalId:1,visible:false,playFlag:true}],'1').status,'unavailable');assert.equal(officialAvailability([{originalId:2,visible:true,playFlag:true}],'1').status,'unavailable');player.dispose();
});
test('快速切歌只接受最后资源响应，旧媒体事件不能覆盖新曲',async()=>{
 let release!:(value:PlaybackResource)=>void;
 const {player,media}=setup(async id=>id==='netease:1'?new Promise(r=>release=r):ready);
 const old=player.playTrack('netease:1');await player.playTrack('netease:2');release(ready);await old;
 assert.equal(media.length,1);assert.equal(player.currentId.value,'netease:2');assert.equal(player.playing.value,true);
 const m=media[0];await player.playTrack('netease:3');m.emit('error');m.currentTime=99;m.emit('timeupdate');assert.equal(player.currentId.value,'netease:3');assert.equal(player.position.value,0);assert.equal(player.playing.value,true);player.dispose();
});
test('资源请求中暂停后，迟到响应不能自动发声',async()=>{
 let release!:(value:PlaybackResource)=>void;const {player,media}=setup(async()=>new Promise(r=>release=r));
 const pending=player.playTrack('netease:1');await player.toggle();release(ready);await pending;assert.equal(player.status.value,'paused');assert.equal(media.length,0);player.dispose();
});
test('同音源快速暂停/恢复，旧play拒绝不能覆盖已恢复播放',async()=>{
 const {player,media}=setup();await player.playTrack('netease:1');await player.toggle();
 let reject!:(error:Error)=>void;media[0].deferred=new Promise((_,r)=>reject=r);const loading=player.toggle();await player.toggle();media[0].deferred=null;await player.toggle();
 const error=Error('interrupted');error.name='AbortError';reject(error);await loading;assert.equal(player.status.value,'playing');assert.equal(player.playing.value,true);player.dispose();
});
test('播放限制就地反馈，再次手势可恢复；地图选曲与媒体当前曲独立',async()=>{
 const {player,media}=setup();await player.playTrack('netease:1');await player.toggle();media[0].blocked=true;await player.toggle();assert.equal(player.status.value,'blocked');assert.equal(player.playing.value,false);
 media[0].blocked=false;await player.toggle();assert.equal(player.status.value,'playing');assert.equal(media.length,1);player.dispose();
});
test('进度仅由真实媒体事件推进；拖动/音量及刷新恢复，不自动播放',async()=>{
 const {player,media,storage}=setup();await player.playTrack('netease:1',['netease:1','netease:2']);media[0].emit('loadedmetadata');player.seek(32);player.setVolume(.25);player.toggleShuffle();player.cycleRepeat();await player.toggle();player.dispose();
 const next=setup(async()=>ready,storage);assert.equal(next.media.length,0);assert.equal(next.player.playing.value,false);assert.equal(next.player.position.value,32);assert.equal(next.player.volume.value,.25);assert.equal(next.player.repeat.value,'all');assert.equal(next.player.shuffle.value,true);
 await next.player.toggle();next.media[0].emit('loadedmetadata');assert.equal(next.media[0].currentTime,32);next.player.dispose();
});
test('结束事件顺序切歌，关闭循环在队尾停止；单曲循环重新解析',async()=>{
 const {player,media}=setup();await player.playTrack('netease:1',['netease:1','netease:2']);media[0].emit('ended');await tick();assert.equal(player.currentId.value,'netease:2');media[1].emit('ended');await tick();assert.equal(player.status.value,'paused');
 player.cycleRepeat();player.cycleRepeat();await player.playTrack('netease:1');const before=media.length;media.at(-1)!.emit('ended');await tick();assert.equal(player.currentId.value,'netease:1');assert.equal(media.length,before+1);player.dispose();
});
test('静音恢复最近非零音量，刷新和旧存储兼容，媒体切曲仍保持静音',async()=>{
 const {player,media,storage}=setup();await player.playTrack('netease:1');player.setVolume(.27);player.toggleMute();
 assert.equal(media[0].volume,0);await player.playTrack('netease:2');assert.equal(media[1].volume,0);player.dispose();
 const restored=setup(async()=>ready,storage);assert.equal(restored.player.volume.value,0);restored.player.toggleMute();assert.equal(restored.player.volume.value,.27);
 restored.player.setVolume(0);restored.player.toggleMute();assert.equal(restored.player.volume.value,.27);restored.player.setVolume(Number.NaN);assert.equal(restored.player.volume.value,.27);restored.player.dispose();
 const old=JSON.parse(storage.getItem(PLAYER_KEY)!);delete old.lastAudibleVolume;old.volume=0;storage.setItem(PLAYER_KEY,JSON.stringify(old));
 const compatible=setup(async()=>ready,storage);compatible.player.toggleMute();assert.equal(compatible.player.volume.value,.8);compatible.player.dispose();
});
test('随机不连续重复，上下曲、队列排序/删除/清空不打断当前播放',async()=>{
 const {player,media}=setup();await player.playTrack('netease:1',tracks.map(t=>t.id));player.toggleShuffle();await player.next();assert.equal(player.currentId.value,'netease:2');await player.previous();assert.equal(player.currentId.value,'netease:1');
 player.moveInQueue('netease:3',-1);assert.deepEqual(player.queueIds.value,['netease:1','netease:3','netease:2']);player.removeFromQueue('netease:1');assert.equal(player.playing.value,true);player.clearQueue();assert.equal(player.queueIds.value.length,0);assert.equal(media.at(-1)!.paused,false);player.dispose();
});
test('过期资源与媒体失败不伪造成功；故障不递归轮询队列',async()=>{
 const {player,media}=setup(async()=>({...ready,expiresAt:'2000-01-01T00:00:00Z'}));await player.playTrack('netease:1');assert.equal(player.status.value,'unavailable');assert.equal(media.length,0);player.dispose();
 const second=setup();await second.player.playTrack('netease:1');second.media[0].error={};second.media[0].emit('error');assert.equal(second.player.playing.value,false);assert.equal(second.player.status.value,'error');assert.equal(second.media.length,1);second.player.dispose();
});
test('损坏播放存储保留，配额失败明确反馈',async()=>{
 const storage=new MemoryStorage();storage.setItem(PLAYER_KEY,'broken');const {player}=setup(async()=>ready,storage);await player.playTrack('netease:1');assert.equal(storage.getItem(PLAYER_KEY),'broken');assert(player.storageMessage.value);player.dispose();
 const second=setup();second.storage.fail=true;second.player.setVolume(.4);assert(second.player.storageMessage.value);second.player.dispose();
});
test('收藏/播放列表去重排序/重命名/删除与刷新持久化',()=>{
 const storage=new MemoryStorage(),c=useMusicCollection(storage);c.toggleFavorite('netease:1');const id=c.createPlaylist('测试')!;c.addToPlaylist(id,'netease:1');c.addToPlaylist(id,'netease:2');c.addToPlaylist(id,'netease:1');c.movePlaylistTrack(id,'netease:2',-1);c.renamePlaylist(id,'新名');
 const reload=useMusicCollection(storage);assert.equal(reload.isFavorite('netease:1'),true);assert.deepEqual(reload.playlists.value[0].trackIds,['netease:2','netease:1']);assert.equal(reload.playlists.value[0].name,'新名');reload.removeFromPlaylist(id,'netease:1');reload.deletePlaylist(id);assert.equal(useMusicCollection(storage).playlists.value.length,0);
});
test('损坏个人库与存储写失败不会覆盖旧数据',()=>{
 const storage=new MemoryStorage();storage.setItem(COLLECTION_KEY,'broken');const c=useMusicCollection(storage);c.toggleFavorite('netease:1');assert.equal(storage.getItem(COLLECTION_KEY),'broken');assert(c.message.value);
 const second=new MemoryStorage(),ok=useMusicCollection(second);ok.toggleFavorite('netease:1');second.fail=true;ok.toggleFavorite('netease:2');assert.deepEqual(ok.favorites.value,['netease:1']);assert.match(ok.message.value,/失败/);
});
test('本机音频Range支持进度拖动，不接受多范围/越界请求',()=>{
 assert.equal(parseRange(undefined,100),null);assert.deepEqual(parseRange('bytes=30-',100),{start:30,end:99});assert.deepEqual(parseRange('bytes=-20',100),{start:80,end:99});assert.deepEqual(parseRange('bytes=0-1000',100),{start:0,end:99});assert.equal(parseRange('bytes=100-',100),false);assert.equal(parseRange('bytes=0-1,10-20',100),false);assert.equal(parseRange('bytes=-0',100),false);
});

test('网易公开外链只按数字ID探测：有效音频才ready，不暴露临时URL或把HTML/403当成功',async()=>{
 let called=0;
 const request=(async(url:string|URL|Request,options?:RequestInit)=>{
  called++;assert.equal(String(url),'https://music.163.com/song/media/outer/url?id=1455706951.mp3');assert.equal(options?.method,'HEAD');
  const result=new Response(null,{status:200,headers:{'Content-Type':'audio/mpeg'}});Object.defineProperty(result,'url',{value:'https://m10.music.126.net/temporary.mp3'});return result;
 }) as typeof fetch;
 const ready=await resolveNeteaseOuter('1455706951',request);assert.equal(ready.status,'ready');if(ready.status==='ready'){assert.equal(ready.provider,'netease-outer');assert.match(ready.url,/id=1455706951\.mp3$/);assert.equal(ready.preview,null);}
 assert.equal((await resolveNeteaseOuter('../credentials',request)).status,'unavailable');assert.equal(called,1);
 for(const [status,type,host] of [[403,'audio/mpeg','m10.music.126.net'],[200,'text/html','m10.music.126.net'],[200,'audio/mpeg','example.com']] as const){
  const denied=await resolveNeteaseOuter('1455706951',(async()=>{const r=new Response(null,{status,headers:{'Content-Type':type}});Object.defineProperty(r,'url',{value:`https://${host}/file`});return r;}) as typeof fetch);assert.equal(denied.status,'unavailable');
 }
 assert.equal((await resolveNeteaseOuter('1455706951',(async()=>{throw Error('timeout');}) as typeof fetch)).status,'unavailable');
});
