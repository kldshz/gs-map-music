import { computed, ref } from 'vue';
import type { Anchor, LayerNode, MapSnapshot, MusicLibrary, ResolvedMap } from '../domain/contracts';
import { validateLibrary, validateSnapshot } from '../domain/validation';
import { resolveMap } from '../adapters/kongying-config';
import { usePersonalNotes } from './personal-notes';
import type { AssociationEdits, EditOperation } from '../domain/association-edits';

export function useExplorer() {
  let libraryRevision=0;
  const notes=usePersonalNotes();
  const snapshot=ref<MapSnapshot|null>(null),library=ref<MusicLibrary>({schemaVersion:1,tracks:[],associations:[]});
  const loading=ref(false),error=ref(''),importMessage=ref(''),query=ref('');
  const areaCode=ref('A:MD:MENGDE'),selectedAnchorId=ref(''),selectedTrackId=ref('');
  const typeFilter=ref<'all'|'waypoint'|'statue'>('all'),layerFilter=ref('all');
  const developmentMode=import.meta.env?.DEV===true;
  const editingAvailable=ref(false),editBusy=ref(false),editMessage=ref('');
  const manualEdits=ref<AssociationEdits>({schemaVersion:1,edits:[]});
  const highlightedIds=ref<string[]>([]),focusRequest=ref(0),mapStatus=ref('等待加载地图');
  const areas=computed(()=>snapshot.value?.areas??[]),anchors=computed(()=>snapshot.value?.anchors??[]);
  const roots=computed(()=>areas.value.filter(a=>a.parentId===-1&&a.hiddenFlag!==3));
  const areaOptions=computed(()=>areas.value.filter(a=>a.parentId!==-1&&a.hiddenFlag!==3&&roots.value.some(r=>r.id===a.parentId))
    .sort((a,b)=>(roots.value.findIndex(r=>r.id===a.parentId)-roots.value.findIndex(r=>r.id===b.parentId))||b.sortIndex-a.sortIndex));
  const selectedArea=computed(()=>areas.value.find(a=>a.code===areaCode.value)??null);
  const selectedAnchor=computed(()=>anchors.value.find(a=>a.id===selectedAnchorId.value)??null);
  const tracks=computed(()=>library.value.tracks);
  const musicLocations=computed(()=>library.value.musicLocations??[]);
  const anchorById=computed(()=>new Map(anchors.value.map(a=>[a.id,a])));
  const trackById=computed(()=>new Map(tracks.value.map(t=>[t.id,t])));
  const locationById=computed(()=>new Map(musicLocations.value.map(p=>[p.id,p])));
  const associationIndex=computed(()=>{
    const byTrack=new Map<string,typeof library.value.associations>(),byAnchor=new Map<string,Set<string>>(),byPair=new Map<string,typeof library.value.associations[number]>();
    for(const a of library.value.associations){
      if(!byTrack.has(a.trackId))byTrack.set(a.trackId,[]);byTrack.get(a.trackId)!.push(a);
      if(!byAnchor.has(a.anchorId))byAnchor.set(a.anchorId,new Set());byAnchor.get(a.anchorId)!.add(a.trackId);
      byPair.set(JSON.stringify([a.trackId,a.anchorId]),a);
    }
    return {byTrack,byAnchor,byPair};
  });
  const selectedTrack=computed(()=>tracks.value.find(t=>t.id===selectedTrackId.value)??null);
  const anchorTracks=computed(()=>tracks.value.filter(t=>associationIndex.value.byAnchor.get(selectedAnchorId.value)?.has(t.id)));
  const trackLocations=computed(()=>{
    const ids=new Set((associationIndex.value.byTrack.get(selectedTrackId.value)??[]).map(a=>a.anchorId));
    return anchors.value.filter(p=>ids.has(p.id));
  });
  const trackAssociations=computed(()=>associationIndex.value.byTrack.get(selectedTrackId.value)??[]);
  function associationFor(trackId:string,anchorId:string){return associationIndex.value.byPair.get(JSON.stringify([trackId,anchorId]));}
  function trackLocationLabels(trackId:string){
    const track=trackById.value.get(trackId);
    if(track?.sceneInfo?.geographicScopes)return track.sceneInfo.geographicScopes.length?[...new Set(track.sceneInfo.geographicScopes.map(s=>[s.country,s.primary,s.secondary].filter(Boolean).join(' / ')))]:['未定位'];
    return (track?.sceneInfo?.musicLocationIds??[]).flatMap(id=>{
      const p=locationById.value.get(id);return p?[p.areaId===null?`未定位 / ${p.name}`:`${p.country} / ${areas.value.find(a=>a.id===p.areaId)?.name??p.areaCode} / ${p.name}`]:[];
    });
  }
  const anchorMusicContexts=computed(()=>[...new Set(anchorTracks.value.flatMap(t=>trackLocationLabels(t.id)))]);
  const mapConfig=computed<ResolvedMap|null>(()=>snapshot.value?resolveMap(snapshot.value,areaCode.value):null);
  const layerOptions=computed(()=>{
    const options=[{value:'all',label:'全部分层'},{value:'surface',label:'仅地表点位'}],values=new Set<string>();
    function walk(nodes:LayerNode[],parent:string[]=[]){for(const n of nodes){if(!values.has(n.value)){values.add(n.value);options.push({value:n.value,label:[...parent,n.label].join(' / ')});}walk(n.children??[],[...parent,n.label]);}}
    walk(mapConfig.value?.plugin.extraConfig?.underground?.levels??[]);walk(mapConfig.value?.plugin.overlayConfig?.overlays??[]);return options;
  });
  const includes=(values:unknown[])=>values.join(' ').toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase());
  function layerMatch(a:Anchor){
    if(layerFilter.value==='all')return true;if(layerFilter.value==='surface')return !a.underground;
    const chosen=layerFilter.value,values=new Set([chosen]);
    function walk(nodes:LayerNode[],selected=false){for(const n of nodes){const active=selected||n.value===chosen;if(active)values.add(n.value);walk(n.children??[],active);}}
    walk(mapConfig.value?.plugin.extraConfig?.underground?.levels??[]);walk(mapConfig.value?.plugin.overlayConfig?.overlays??[]);
    return a.layerValues.some(v=>values.has(v));
  }
  const visibleAnchors=computed(()=>anchors.value.filter(a=>(a.areaCode===areaCode.value||(highlightedIds.value.includes(a.id)&&snapshot.value&&resolveMap(snapshot.value,a.areaCode).code===mapConfig.value?.code))&&(typeFilter.value==='all'||a.kind===typeFilter.value)&&layerMatch(a)
    &&includes([a.name,a.content,a.country,a.areaName,a.sourceId,a.geography?.primary,a.geography?.secondary])));
  const searchCorpus=computed(()=>new Map(tracks.value.map(t=>[t.id,[t.title,...t.artists,...(t.composers??[]),t.album,t.description,t.neteaseId,
    t.sceneInfo?.wikiTitle,t.sceneInfo?.englishTitle,t.sceneInfo?.originText,...(t.sceneInfo?.mainRegions??[]),...trackLocationLabels(t.id),
    ...(associationIndex.value.byTrack.get(t.id)??[]).flatMap(link=>{const p=anchorById.value.get(link.anchorId);return p?[p.areaName,p.country,p.content,p.geography?.primary,p.geography?.secondary]:[]})].join(' ').toLocaleLowerCase()])));
  const searchTracks=computed(()=>{
    const q=query.value.trim().toLocaleLowerCase();if(!q)return tracks.value;
    return tracks.value.filter(t=>searchCorpus.value.get(t.id)?.includes(q)||notes.personalNoteFor(t.id,t.personalNote??'').toLocaleLowerCase().includes(q));
  });
  async function load(){
    const revision=++libraryRevision;
    loading.value=true;error.value='';
    try{
      const response=await fetch('/data/kongying-map.json');if(!response.ok)throw new Error(`地图数据HTTP ${response.status}`);
      const next=validateSnapshot(await response.json());for(const a of next.areas.filter(a=>a.isFinal))resolveMap(next,a.code);
      snapshot.value=next;
      const music=await fetch('/data/music-library.json');if(!music.ok)throw new Error(`曲库数据HTTP ${music.status}`);
      const builtin=validateLibrary(await music.json(),new Set(next.anchors.map(a=>a.id)),next);
      if(revision!==libraryRevision)return;
      library.value=builtin;
      if(import.meta.env?.DEV){
        try{const result=await (await import('./development-links')).developmentLibrary();
          if(revision!==libraryRevision)return;
          library.value=validateLibrary(result.library,new Set(next.anchors.map(a=>a.id)),next);manualEdits.value=result.edits;editingAvailable.value=true;
        }catch{editingAvailable.value=false;editMessage.value='开发编辑服务加载失败，请重试加载；仍可浏览原曲库。';}
      }
    }catch(cause){error.value=cause instanceof Error?cause.message:'数据加载失败'}finally{loading.value=false}
  }
  function selectArea(code:string){if(!areas.value.some(a=>a.code===code&&a.isFinal))return;areaCode.value=code;selectedAnchorId.value='';layerFilter.value='all';highlightedIds.value=[];}
  function selectAnchor(id:string){
    const a=anchors.value.find(a=>a.id===id);if(!a)return;if(areaCode.value!==a.areaCode)selectArea(a.areaCode);
    if(!layerMatch(a))layerFilter.value='all';typeFilter.value='all';query.value='';selectedAnchorId.value=id;highlightedIds.value=[id];focusRequest.value++;
  }
  function selectTrack(id:string){if(tracks.value.some(t=>t.id===id))selectedTrackId.value=id;}
  function locateTrack(){
    const points=trackLocations.value.filter(a=>a.position);highlightedIds.value=trackLocations.value.map(a=>a.id);
    if(!points.length){mapStatus.value='关联地点没有可用坐标';return;}
    const first=points.find(a=>a.areaCode===areaCode.value)??points[0];areaCode.value=first.areaCode;typeFilter.value='all';layerFilter.value='all';query.value='';focusRequest.value++;
    const other=points.filter(a=>snapshot.value&&resolveMap(snapshot.value,a.areaCode).code!==mapConfig.value?.code).length;
    mapStatus.value=other?`已高亮当前地图；另有${other}处位于独立地图，请从关联列表选择`:`已高亮${points.length}个有坐标关联点位`;
  }
  function associationStatus(trackId:string){const links=library.value.associations.filter(a=>a.trackId===trackId);return links.length?`关联${links.length}处：已核实${links.filter(a=>a.evidenceStatus==='verified').length}，待核实${links.filter(a=>a.evidenceStatus==='pending').length}；无播放资源`:'暂无地点关联；无播放资源';}
  function hasManualEdit(trackId:string,anchorId:string){return manualEdits.value.edits.some(e=>e.trackId===trackId&&e.anchorId===anchorId);}
  async function editAssociation(op:EditOperation,trackId:string,anchorId:string){
    if(!import.meta.env?.DEV||!editingAvailable.value||editBusy.value)return false;
    editBusy.value=true;editMessage.value='正在保存关联…';
    try{
      const result=await (await import('./development-links')).developmentLibrary({op,trackId,anchorId});
      library.value=validateLibrary(result.library,new Set(anchors.value.map(a=>a.id)),snapshot.value??undefined);manualEdits.value=result.edits;
      editMessage.value=op==='restore'?'已恢复来源关联；修改已保存到本机项目。':op==='add'?'已添加关联并保存到本机项目；仍待核实。':'已移除关联并保存到本机项目；歌曲资料保持。';return true;
    }catch(cause){editMessage.value=`关联保存失败：${cause instanceof Error?cause.message:'未知错误'}；当前曲库保持不变。`;return false;
    }finally{editBusy.value=false;}
  }
  const addTrackToAnchor=(trackId:string,anchorId:string)=>editAssociation('add',trackId,anchorId);
  const removeTrackFromAnchor=(trackId:string,anchorId:string)=>editAssociation('remove',trackId,anchorId);
  const restoreTrackAnchor=(trackId:string,anchorId:string)=>editAssociation('restore',trackId,anchorId);
  function exportEditedLibrary(){
    if(!import.meta.env?.DEV)return;
    const href=URL.createObjectURL(new Blob([JSON.stringify(library.value,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=href;link.download='music-library-edited.json';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }
  async function importLibrary(file:File){
    try{if(file.size>16*1024*1024)throw new Error('JSON文件超过16MB');const next=validateLibrary(JSON.parse(await file.text()),new Set(anchors.value.map(a=>a.id)),snapshot.value??undefined);
      libraryRevision++;library.value=next;selectedTrackId.value='';highlightedIds.value=[];importMessage.value=`已导入${next.tracks.length}首曲目、${next.associations.length}条关联；仅本次会话，无音源。请仅导入原神音乐。`;
      if(import.meta.env?.DEV){editingAvailable.value=false;editMessage.value='当前为临时导入库；刷新后可编辑本机内置库。';}
    }catch(cause){importMessage.value=`导入失败：${cause instanceof Error?cause.message:'未知错误'}；原曲库保持不变。`;}
  }
  return {loading,error,areas,areaCode,selectedArea,roots,areaOptions,typeFilter,query,visibleAnchors,anchors,selectedAnchor,selectedAnchorId,highlightedIds,focusRequest,
    tracks,searchTracks,anchorTracks,selectedTrack,trackLocations,trackAssociations,associationFor,trackLocationLabels,anchorMusicContexts,musicLocations,...notes,
    developmentMode,editingAvailable,editBusy,editMessage,hasManualEdit,addTrackToAnchor,removeTrackFromAnchor,restoreTrackAnchor,exportEditedLibrary,
    mapConfig,mapStatus,importMessage,layerOptions,layerFilter,load,selectArea,selectAnchor,selectTrack,locateTrack,associationStatus,importLibrary};
}
