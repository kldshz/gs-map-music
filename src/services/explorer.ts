import { computed, ref } from 'vue';
import type { Anchor, LayerNode, MapSnapshot, MusicLibrary, ResolvedMap } from '../domain/contracts';
import { validateLibrary, validateSnapshot } from '../domain/validation';
import { resolveMap } from '../adapters/kongying-config';

export function useExplorer() {
  const snapshot=ref<MapSnapshot|null>(null),library=ref<MusicLibrary>({schemaVersion:1,tracks:[],associations:[]});
  const loading=ref(false),error=ref(''),importMessage=ref(''),query=ref('');
  const areaCode=ref('A:MD:MENGDE'),selectedAnchorId=ref(''),selectedTrackId=ref('');
  const typeFilter=ref<'all'|'waypoint'|'statue'>('all'),layerFilter=ref('all');
  const highlightedIds=ref<string[]>([]),focusRequest=ref(0),mapStatus=ref('等待加载地图');
  const areas=computed(()=>snapshot.value?.areas??[]),anchors=computed(()=>snapshot.value?.anchors??[]);
  const roots=computed(()=>areas.value.filter(a=>a.parentId===-1&&a.hiddenFlag!==3));
  const areaOptions=computed(()=>areas.value.filter(a=>a.parentId!==-1&&a.hiddenFlag!==3&&roots.value.some(r=>r.id===a.parentId))
    .sort((a,b)=>(roots.value.findIndex(r=>r.id===a.parentId)-roots.value.findIndex(r=>r.id===b.parentId))||b.sortIndex-a.sortIndex));
  const selectedArea=computed(()=>areas.value.find(a=>a.code===areaCode.value)??null);
  const selectedAnchor=computed(()=>anchors.value.find(a=>a.id===selectedAnchorId.value)??null);
  const tracks=computed(()=>library.value.tracks);
  const selectedTrack=computed(()=>tracks.value.find(t=>t.id===selectedTrackId.value)??null);
  const anchorTracks=computed(()=>tracks.value.filter(t=>library.value.associations.some(a=>a.anchorId===selectedAnchorId.value&&a.trackId===t.id)));
  const trackLocations=computed(()=>anchors.value.filter(p=>library.value.associations.some(a=>a.anchorId===p.id&&a.trackId===selectedTrackId.value)));
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
    &&includes([a.name,a.content,a.country,a.areaName,a.sourceId])));
  const searchTracks=computed(()=>tracks.value.filter(t=>includes([t.title,...t.artists,...(t.composers??[]),t.album,t.description,t.neteaseId,
    ...anchors.value.filter(p=>library.value.associations.some(a=>a.anchorId===p.id&&a.trackId===t.id)).flatMap(p=>[p.areaName,p.country,p.content])])));
  async function load(){
    loading.value=true;error.value='';
    try{
      const response=await fetch('/data/kongying-map.json');if(!response.ok)throw new Error(`地图数据HTTP ${response.status}`);
      const next=validateSnapshot(await response.json());for(const a of next.areas.filter(a=>a.isFinal))resolveMap(next,a.code);
      snapshot.value=next;
      const music=await fetch('/data/music-library.json');if(!music.ok)throw new Error(`曲库数据HTTP ${music.status}`);
      library.value=validateLibrary(await music.json(),new Set(next.anchors.map(a=>a.id)));
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
  async function importLibrary(file:File){
    try{if(file.size>8*1024*1024)throw new Error('JSON文件超过8MB');const next=validateLibrary(JSON.parse(await file.text()),new Set(anchors.value.map(a=>a.id)));
      library.value=next;selectedTrackId.value='';highlightedIds.value=[];importMessage.value=`已导入${next.tracks.length}首曲目、${next.associations.length}条关联；仅本次会话，无音源。请仅导入原神音乐。`;
    }catch(cause){importMessage.value=`导入失败：${cause instanceof Error?cause.message:'未知错误'}；原曲库保持不变。`;}
  }
  return {loading,error,areas,areaCode,selectedArea,roots,areaOptions,typeFilter,query,visibleAnchors,anchors,selectedAnchor,selectedAnchorId,highlightedIds,focusRequest,
    tracks,searchTracks,anchorTracks,selectedTrack,trackLocations,mapConfig,mapStatus,importMessage,layerOptions,layerFilter,load,selectArea,selectAnchor,selectTrack,locateTrack,associationStatus,importLibrary};
}
