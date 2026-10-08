import { computed, ref } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicCollection } from './music-collection';
import type { useMusicPlayer } from './music-player';

/** Shared sidebar state; layout and animations belong to the view components. */
export function useLibraryPanel(collection:ReturnType<typeof useMusicCollection>,tracks:()=>MusicTrack[],player:ReturnType<typeof useMusicPlayer>){
  const open=ref(false),tab=ref<'favorites'|'playlists'>('favorites'),query=ref('');
  const newName=ref(''),selectedPlaylistId=ref(''),pendingTrackId=ref('');
  const renameId=ref(''),renameName=ref('');
  const trackMap=computed(()=>new Map(tracks().map(t=>[t.id,t])));
  const selectedPlaylist=computed(()=>collection.playlists.value.find(p=>p.id===selectedPlaylistId.value)??null);
  function match(id:string){const track=trackMap.value.get(id),q=query.value.trim().toLocaleLowerCase();return !q||!!track&&[track.title,track.sceneInfo?.wikiTitle,track.sceneInfo?.englishTitle,track.album,...track.artists,track.neteaseId].join(' ').toLocaleLowerCase().includes(q);}
  const favoriteIds=computed(()=>collection.favorites.value.filter(match));
  const playlistIds=computed(()=>selectedPlaylist.value?.trackIds.filter(match)??[]);
  function show(target:'favorites'|'playlists'='favorites',trackId=''){open.value=true;tab.value=target;query.value='';pendingTrackId.value=trackId;}
  function toggle(){open.value=!open.value;}
  function close(){open.value=false;pendingTrackId.value='';}
  function selectPlaylist(id:string){if(collection.playlists.value.some(p=>p.id===id)){selectedPlaylistId.value=id;tab.value='playlists';query.value='';}}
  function create(){const id=collection.createPlaylist(newName.value);if(!id)return null;newName.value='';selectPlaylist(id);if(pendingTrackId.value)addPending(id);return id;}
  function addPending(id:string){if(!pendingTrackId.value||!trackMap.value.has(pendingTrackId.value))return false;const saved=collection.addToPlaylist(id,pendingTrackId.value);if(saved){selectPlaylist(id);pendingTrackId.value='';}return saved;}
  function beginRename(id:string){const list=collection.playlists.value.find(p=>p.id===id);if(list){renameId.value=id;renameName.value=list.name;}}
  function cancelRename(){renameId.value='';renameName.value='';}
  function saveRename(){if(!renameId.value||!collection.renamePlaylist(renameId.value,renameName.value))return false;cancelRename();return true;}
  function removePlaylist(id:string){const saved=collection.deletePlaylist(id);if(saved&&selectedPlaylistId.value===id)selectedPlaylistId.value='';if(saved&&renameId.value===id)cancelRename();return saved;}
  async function play(id:string,contextIds:string[]){const valid=contextIds.filter(x=>trackMap.value.has(x));if(trackMap.value.has(id))await player.playTrack(id,valid);}
  async function playAll(){const context=tab.value==='favorites'?favoriteIds.value:playlistIds.value;const valid=context.filter(id=>trackMap.value.has(id));if(valid.length)await player.playTrack(valid[0],valid);}
  return {open,tab,query,newName,selectedPlaylistId,pendingTrackId,renameId,renameName,selectedPlaylist,favoriteIds,playlistIds,trackMap,show,toggle,close,selectPlaylist,create,addPending,beginRename,cancelRename,saveRename,removePlaylist,play,playAll};
}
