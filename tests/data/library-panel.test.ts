import test from 'node:test';
import assert from 'node:assert/strict';
import { useLibraryPanel } from '../../src/services/library-panel';
import { useMusicCollection } from '../../src/services/music-collection';
import type { useMusicPlayer } from '../../src/services/music-player';
import type { MusicTrack } from '../../src/domain/contracts';
import { useExplorer } from '../../src/services/explorer';
import { readFileSync } from 'node:fs';
import { ref } from 'vue';

class MemoryStorage implements Storage {
 values=new Map<string,string>();fail=false;get length(){return this.values.size;}
 getItem(key:string){return this.values.get(key)??null;}
 setItem(key:string,value:string){if(this.fail)throw Error('quota');this.values.set(key,value);}
 removeItem(key:string){this.values.delete(key);}clear(){this.values.clear();}key(n:number){return [...this.values.keys()][n]??null;}
}
const tracks=['1','2'].map(id=>({id:`netease:${id}`,title:id==='1'?'晨曦酒庄':'孤独的旅居',artists:['HOYO-MiX'],composers:null,album:'原神',releaseDate:null,durationSeconds:null,description:'',neteaseId:id,sourceUrl:null} satisfies MusicTrack));
function setup(){const storage=new MemoryStorage(),collection=useMusicCollection(storage),played:{id:string;context:string[]}[]=[];
 const player={playTrack:async(id:string,context:string[])=>{played.push({id,context});}} as unknown as ReturnType<typeof useMusicPlayer>;
 return {storage,collection,played,panel:useLibraryPanel(collection,()=>tracks,player)};
}
test('左侧歌单创建并加入待添加曲，清空成功草稿，失败保留操作主体',()=>{
 const {storage,collection,panel}=setup();panel.show('playlists','netease:1');panel.newName.value='试验歌单';const id=panel.create()!;
 assert(id);assert.equal(panel.open.value,true);assert.equal(panel.selectedPlaylistId.value,id);assert.equal(panel.pendingTrackId.value,'');assert.deepEqual(collection.playlists.value[0].trackIds,['netease:1']);
 panel.show('playlists','netease:2');assert.equal(panel.addPending(id),true);assert.deepEqual(collection.playlists.value[0].trackIds,['netease:1','netease:2']);panel.show('playlists','netease:2');panel.addPending(id);assert.equal(collection.playlists.value[0].trackIds.length,2);
 storage.fail=true;panel.newName.value='草稿';panel.show('playlists','netease:2');assert.equal(panel.create(),null);assert.equal(panel.newName.value,'草稿');assert.equal(panel.pendingTrackId.value,'netease:2');
 assert.equal(panel.addPending(id),false);assert.equal(panel.pendingTrackId.value,'netease:2');assert.equal(collection.addToPlaylist('不存在','netease:1'),false);
});
test('收藏索引及歌单搜索不写库；按当前个人库上下文播放，不改地图浏览',async()=>{
 const {collection,panel,played}=setup();collection.toggleFavorite('netease:1');collection.toggleFavorite('netease:2');panel.show('favorites');panel.query.value='晨曦';assert.deepEqual(panel.favoriteIds.value,['netease:1']);assert.equal(collection.favorites.value.length,2);await panel.playAll();assert.deepEqual(played,[{id:'netease:1',context:['netease:1']}]);
 panel.query.value='';await panel.play('netease:2',panel.favoriteIds.value);assert.deepEqual(played[1],{id:'netease:2',context:['netease:1','netease:2']});panel.newName.value='歌单';const id=panel.create()!;collection.addToPlaylist(id,'netease:2');collection.addToPlaylist(id,'netease:removed');panel.query.value='';await panel.playAll();assert.deepEqual(played[2],{id:'netease:2',context:['netease:2']});
});
test('重命名/删除保存失败保持选中和草稿；恢复后操作与刷新一致',()=>{
 const {storage,collection,panel}=setup();panel.newName.value='旧名';const id=panel.create()!;panel.beginRename(id);panel.renameName.value='新名';storage.fail=true;assert.equal(panel.saveRename(),false);assert.equal(panel.renameName.value,'新名');assert.equal(panel.removePlaylist(id),false);assert.equal(panel.selectedPlaylistId.value,id);
 storage.fail=false;assert.equal(panel.saveRename(),true);assert.equal(panel.renameId.value,'');assert.equal(useMusicCollection(storage).playlists.value[0].name,'新名');assert.equal(panel.removePlaylist(id),true);assert.equal(panel.selectedPlaylistId.value,'');assert.equal(collection.playlists.value.length,0);
});

test('曲目收藏筛选响应收藏变动，与文字专辑地区交集，不把旧个人评价当搜索结果',async()=>{
 const realLibrary=JSON.parse(readFileSync('public/data/music-library.json','utf8'));
 const selected=realLibrary.tracks.find((t:MusicTrack)=>t.neteaseId==='1455706951');
 const snapshot=JSON.parse(readFileSync('public/data/kongying-map.json','utf8'));
 const oldFetch=globalThis.fetch;
 globalThis.fetch=(async(url:string|URL|Request)=>new Response(JSON.stringify(String(url).includes('kongying-map')?snapshot:realLibrary))) as typeof fetch;
 try{
  const favorites=ref<string[]>([selected.id]);const explorer=useExplorer({favorites:()=>favorites.value});await explorer.load();assert.equal(explorer.error.value,'');
  explorer.favoritesOnly.value=true;assert.equal(explorer.searchTracks.value.length,1);assert.equal(explorer.searchTracks.value[0].id,selected.id);
  explorer.albumFilter.value=selected.album;explorer.regionFilter.value='蒙德';explorer.query.value='1455706951';assert.equal(explorer.searchTracks.value.length,1);
  explorer.regionFilter.value='枫丹';assert.equal(explorer.searchTracks.value.length,0);explorer.regionFilter.value='蒙德';favorites.value=[];assert.equal(explorer.searchTracks.value.length,0);
  explorer.setEditingEnabled(true);assert.equal(explorer.editingEnabled.value,false);assert.equal(await explorer.addTrackToAnchor(selected.id,'kongying:6290'),false);
 }finally{globalThis.fetch=oldFetch;}
});
