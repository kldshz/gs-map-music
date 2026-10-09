import { computed, ref } from 'vue';
import type { MusicTrack, PlaybackResource } from '../domain/contracts';

export const PLAYER_KEY='gs-map-music.player.v1';
export interface PlayerOptions {
  storage?:Storage;
  createAudio?:()=>HTMLAudioElement;
  resolve?:(id:string,signal:AbortSignal)=>Promise<PlaybackResource>;
  random?:()=>number;
}
const finite=(v:unknown,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=10000&&v.every(x=>typeof x==='string'&&x.length<=100);

/** One player belongs to the application, not to a map, selected detail or panel. */
export function useMusicPlayer(tracks:()=>MusicTrack[],options:PlayerOptions={}){
  let storage:Storage|undefined;
  const currentId=ref(''),queueIds=ref<string[]>([]),playing=ref(false);
  const status=ref<'idle'|'resolving'|'loading'|'playing'|'paused'|'blocked'|'unavailable'|'error'>('idle');
  const message=ref('选择歌曲后点击播放'),position=ref(0),duration=ref(0),volume=ref(.8);
  const shuffle=ref(false),repeat=ref<'off'|'all'|'one'>('off'),storageMessage=ref('');
  const currentTrack=computed(()=>tracks().find(t=>t.id===currentId.value)??null);
  let audio:HTMLAudioElement|null=null,abort:AbortController|null=null,version=0,playAttempt=0,disposed=false,damaged=false,wantPlay=false;
  let resumePosition=0,lastSave=0,expiry:number|null=null,sourceNote='',lastAudibleVolume=.8;
  const history:string[]=[];
  try{
    storage=options.storage??globalThis.localStorage;
    const raw=storage?.getItem(PLAYER_KEY);
    if(raw){const s=JSON.parse(raw);if(s.schemaVersion!==1||typeof s.currentId!=='string'||s.currentId.length>100||!ids(s.queueIds)||!finite(s.position,86400)||!finite(s.volume,1)||typeof s.shuffle!=='boolean'||!['off','all','one'].includes(s.repeat))throw Error();
      currentId.value=s.currentId;queueIds.value=[...new Set(s.queueIds as string[])];position.value=s.position;resumePosition=s.position;volume.value=s.volume;shuffle.value=s.shuffle;repeat.value=s.repeat;
      lastAudibleVolume=finite(s.lastAudibleVolume,1)&&s.lastAudibleVolume>0?s.lastAudibleVolume:s.volume>0?s.volume:.8;
      if(currentId.value){status.value='paused';message.value='已恢复曲目和进度，点击播放继续';}
    }
  }catch{damaged=true;storageMessage.value='播放状态无法读取，原存储保留；请备份修复后刷新。';}
  function persist(){
    if(damaged)return;
    try{if(!storage)throw Error('storage');storage.setItem(PLAYER_KEY,JSON.stringify({schemaVersion:1,currentId:currentId.value,queueIds:queueIds.value,position:position.value,volume:volume.value,lastAudibleVolume,shuffle:shuffle.value,repeat:repeat.value}));}
    catch{storageMessage.value='播放状态保存失败；本次仍可操作，刷新可能无法恢复。';}
  }
  function retire(){abort?.abort();abort=null;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.remove?.();audio=null;}playing.value=false;expiry=null;}
  const resolve=options.resolve??(async(id,signal)=>{
    const response=await fetch(`/api/playback/resolve?trackId=${encodeURIComponent(id)}`,{signal,cache:'no-store'});
    const result=await response.json() as PlaybackResource;
    if(result.status==='unavailable')return result;
    if(!response.ok||result.status!=='ready')throw Error('本机播放服务不可用');
    return result;
  });
  function fail(cause:unknown){
    playing.value=false;wantPlay=false;
    if(cause instanceof Error&&cause.name==='NotAllowedError'){status.value='blocked';message.value='浏览器阻止自动播放，请再次点击播放';}
    else{status.value='error';message.value='音频加载或播放失败，请点击播放重试';}
    persist();
  }
  async function start(id:string,offset=0){
    if(disposed)return;
    const token=++version,attempt=++playAttempt;retire();wantPlay=true;currentId.value=id;position.value=offset;resumePosition=offset;duration.value=0;persist();
    if(!tracks().some(t=>t.id===id)){status.value='unavailable';message.value='此曲目已不在当前曲库中';wantPlay=false;return;}
    status.value='resolving';message.value='正在获取播放资源…';abort=new AbortController();
    try{
      const resource=await resolve(id,abort.signal);if(token!==version||disposed)return;
      if(resource.status!=='ready'){status.value='unavailable';message.value=resource.message;wantPlay=false;return;}
      if(typeof resource.url!=='string'||!resource.url||!(/^(https?:\/\/|\/api\/playback\/audio\?)/.test(resource.url))){throw Error('无效音源');}
      expiry=resource.expiresAt?Date.parse(resource.expiresAt):null;
      if(expiry!==null&&(!Number.isFinite(expiry)||expiry<=Date.now())){status.value='unavailable';message.value='播放资源已过期，请重试';wantPlay=false;return;}
      sourceNote=resource.preview?'试听资源':resource.provider==='netease-outer'?'网易公开外链':'真实音频';
      const media=(options.createAudio??(()=>new Audio()))();audio=media;media.preload='metadata';media.volume=volume.value;
      if(!options.createAudio){media.hidden=true;media.setAttribute('aria-hidden','true');media.dataset.playerAudio='true';document.body.append(media);}
      const active=()=>token===version&&audio===media&&!disposed;
      media.addEventListener('loadedmetadata',()=>{
        if(!active())return;duration.value=Number.isFinite(media.duration)?media.duration:0;
        if(resumePosition>0&&duration.value>0){media.currentTime=Math.min(resumePosition,Math.max(0,duration.value-.05));position.value=media.currentTime;resumePosition=0;}
      });
      media.addEventListener('timeupdate',()=>{if(!active())return;position.value=Number.isFinite(media.currentTime)?media.currentTime:0;if(Date.now()-lastSave>1000){lastSave=Date.now();persist();}});
      media.addEventListener('playing',()=>{if(!active())return;if(!wantPlay){media.pause();return;}playing.value=true;status.value='playing';message.value=sourceNote;});
      media.addEventListener('pause',()=>{if(!active())return;playing.value=false;if(status.value==='playing'||!wantPlay){status.value='paused';message.value='已暂停';}persist();});
      media.addEventListener('waiting',()=>{if(active()&&wantPlay){playing.value=false;status.value='loading';message.value='音频缓冲中…';}});
      media.addEventListener('error',()=>{if(active()){media.pause();fail(Error());}});
      media.addEventListener('ended',()=>{if(!active())return;playing.value=false;position.value=0;persist();if(repeat.value==='one')void start(id);else void advance(true);});
      status.value='loading';message.value='正在加载音频…';media.src=resource.url;
      await media.play();if(!active())return;if(!wantPlay)media.pause();
    }catch(cause){if(token!==version||attempt!==playAttempt||disposed||!wantPlay)return;fail(cause);}
  }
  function validQueue(){return queueIds.value.filter(id=>tracks().some(t=>t.id===id));}
  async function playTrack(id:string,contextIds?:string[]){
    if(!tracks().some(t=>t.id===id)){status.value='unavailable';message.value='此曲目已不在当前曲库中';return;}
    if(contextIds)queueIds.value=[...new Set(contextIds.filter(x=>tracks().some(t=>t.id===x)))].slice(0,10000);
    if(!queueIds.value.includes(id))queueIds.value.push(id);history.length=0;await start(id);
  }
  async function toggle(){
    if(playing.value||status.value==='resolving'||status.value==='loading'){
      wantPlay=false;++playAttempt;if(status.value==='resolving'){++version;abort?.abort();abort=null;}
      audio?.pause();playing.value=false;status.value='paused';message.value='已暂停';persist();return;
    }
    if(!currentId.value){const id=validQueue()[0];if(id)await start(id);return;}
    if(audio&&!audio.error&&(expiry===null||expiry>Date.now())){
      const token=version,attempt=++playAttempt;wantPlay=true;status.value='loading';message.value='正在播放…';try{await audio.play();}catch(cause){if(token===version&&attempt===playAttempt&&wantPlay)fail(cause);}return;
    }
    await start(currentId.value,position.value);
  }
  async function advance(automatic=false){
    const queue=validQueue();if(!queue.length){wantPlay=false;status.value='paused';message.value='队列为空';persist();return;}
    const at=queue.indexOf(currentId.value);let id:string|undefined;
    if(shuffle.value){const alternatives=queue.filter(x=>x!==currentId.value);if(alternatives.length)id=alternatives[Math.floor((options.random??Math.random)()*alternatives.length)];else if(!automatic||repeat.value==='all')id=queue[0];}
    else id=queue[at+1]??(!automatic||repeat.value==='all'?queue[0]:undefined);
    if(!id){wantPlay=false;status.value='paused';message.value='队列播放完毕';persist();return;}
    if(currentId.value)history.push(currentId.value);await start(id);
  }
  const next=()=>advance();
  async function previous(){
    if(audio&&position.value>3){seek(0);return;}
    const q=validQueue();if(!q.length)return;const id=shuffle.value?history.pop()??q[0]:q[(q.indexOf(currentId.value)-1+q.length)%q.length];await start(id);
  }
  function seek(seconds:number){if(!audio||!finite(seconds,86400)||duration.value<=0)return;audio.currentTime=Math.min(seconds,duration.value);position.value=audio.currentTime;persist();}
  function setVolume(value:number){if(!finite(value,1))return;volume.value=value;if(value>0)lastAudibleVolume=value;if(audio)audio.volume=value;persist();}
  function toggleMute(){setVolume(volume.value>0?0:lastAudibleVolume);}
  function toggleShuffle(){shuffle.value=!shuffle.value;persist();}
  function cycleRepeat(){repeat.value=repeat.value==='off'?'all':repeat.value==='all'?'one':'off';persist();}
  function enqueue(id:string){if(tracks().some(t=>t.id===id)&&!queueIds.value.includes(id)&&queueIds.value.length<10000){queueIds.value.push(id);persist();}}
  function removeFromQueue(id:string){queueIds.value=queueIds.value.filter(x=>x!==id);persist();}
  function clearQueue(){queueIds.value=[];persist();}
  function moveInQueue(id:string,direction:-1|1){const at=queueIds.value.indexOf(id),to=at+direction;if(at>=0&&to>=0&&to<queueIds.value.length){[queueIds.value[at],queueIds.value[to]]=[queueIds.value[to],queueIds.value[at]];persist();}}
  function dispose(){persist();disposed=true;++version;retire();if(typeof window!=='undefined')window.removeEventListener('pagehide',persist);}
  if(typeof window!=='undefined')window.addEventListener('pagehide',persist);
  return {currentTrack,currentId,queueIds,playing,status,message,position,duration,volume,shuffle,repeat,storageMessage,playTrack,toggle,previous,next,seek,setVolume,toggleMute,toggleShuffle,cycleRepeat,enqueue,removeFromQueue,clearQueue,moveInQueue,dispose};
}
