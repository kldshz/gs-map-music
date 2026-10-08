import { ref } from 'vue';

export interface PersonalPlaylist { id:string; name:string; trackIds:string[] }
export const COLLECTION_KEY='gs-map-music.collection.v1';
const validIds=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=10000&&v.every(x=>typeof x==='string'&&x.length<=100);

export function useMusicCollection(storage?:Storage){
  const favorites=ref<string[]>([]),playlists=ref<PersonalPlaylist[]>([]),message=ref('');
  let damaged=false;
  let store:Storage|undefined;
  try{
    store=storage??globalThis.localStorage;
    const raw=store?.getItem(COLLECTION_KEY);
    if(raw){
      const value=JSON.parse(raw);
      if(value.schemaVersion!==1||!validIds(value.favorites)||!Array.isArray(value.playlists)||value.playlists.length>1000)throw Error();
      const ids=new Set<string>();
      for(const p of value.playlists){
        if(typeof p.id!=='string'||p.id.length>100||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!validIds(p.trackIds))throw Error();
        ids.add(p.id);
      }
      favorites.value=[...new Set(value.favorites as string[])];
      playlists.value=value.playlists.map((p:PersonalPlaylist)=>({...p,trackIds:[...new Set(p.trackIds)]}));
    }
  }catch{damaged=true;message.value='个人音乐库无法读取，原存储保留；请备份修复后刷新。';}
  function save(f:string[],p:PersonalPlaylist[]){
    if(damaged){message.value='保存已阻止：原音乐库存储损坏，请先备份修复。';return false;}
    if(!validIds(f)||p.length>1000||p.some(l=>!validIds(l.trackIds))){message.value='个人库已达容量上限。';return false;}
    try{if(!store)throw Error('storage');store.setItem(COLLECTION_KEY,JSON.stringify({schemaVersion:1,favorites:f,playlists:p}));favorites.value=f;playlists.value=p;message.value='已保存在此浏览器。';return true;}
    catch{message.value='保存失败，已保存的个人库保持不变，请检查浏览器存储空间。';return false;}
  }
  function change(id:string,update:(p:PersonalPlaylist)=>PersonalPlaylist){return save([...favorites.value],playlists.value.map(p=>p.id===id?update({...p,trackIds:[...p.trackIds]}):{...p,trackIds:[...p.trackIds]}));}
  const isFavorite=(id:string)=>favorites.value.includes(id);
  function toggleFavorite(id:string){if(!id||id.length>100)return;save(isFavorite(id)?favorites.value.filter(x=>x!==id):[...favorites.value,id],playlists.value);}
  function createPlaylist(name:string){name=name.trim();if(!name||name.length>100){message.value='列表名称应为1至100字。';return null;}const id=crypto.randomUUID();return save([...favorites.value],[...playlists.value,{id,name,trackIds:[]}])?id:null;}
  function renamePlaylist(id:string,name:string){name=name.trim();if(!name||name.length>100){message.value='列表名称应为1至100字。';return false;}return change(id,p=>({...p,name}));}
  function deletePlaylist(id:string){return save([...favorites.value],playlists.value.filter(p=>p.id!==id));}
  function addToPlaylist(id:string,trackId:string){if(!trackId||trackId.length>100||!playlists.value.some(p=>p.id===id))return false;return change(id,p=>({...p,trackIds:[...new Set([...p.trackIds,trackId])]}));}
  function removeFromPlaylist(id:string,trackId:string){change(id,p=>({...p,trackIds:p.trackIds.filter(x=>x!==trackId)}));}
  function movePlaylistTrack(id:string,trackId:string,direction:-1|1){change(id,p=>{const at=p.trackIds.indexOf(trackId),to=at+direction;if(at>=0&&to>=0&&to<p.trackIds.length)[p.trackIds[at],p.trackIds[to]]=[p.trackIds[to],p.trackIds[at]];return p;});}
  return {favorites,playlists,message,isFavorite,toggleFavorite,createPlaylist,renamePlaylist,deletePlaylist,addToPlaylist,removeFromPlaylist,movePlaylistTrack};
}
