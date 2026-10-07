<script setup lang="ts">
// Leaflet CRS/tile construction adapted from Kongying Tavern V3, MulanPSL-2.0.
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Anchor, LayerNode, ResolvedMap } from '../domain/contracts';
import { tileUrl } from '../adapters/kongying-config';

const props=defineProps<{config:ResolvedMap|null;anchors:Anchor[];selectedId:string;highlightedIds:string[];focusRequest:number;layerFilter?:string}>();
const emit=defineEmits<{select:[id:string];status:[text:string]}>();
const container=ref<HTMLElement|null>(null);
let map:L.Map|null=null,tile:L.TileLayer|null=null,markers=L.layerGroup(),overlays=L.layerGroup(),resize:ResizeObserver|null=null;
let loaded=0,failed=0,generation=0;
const markerLookup=new Map<string,L.Marker>();
function renderMarkers(){
  markers.clearLayers();markerLookup.clear();if(!map)return;
  for(const a of props.anchors){
    if(!a.position)continue;
    const active=props.highlightedIds.includes(a.id)||props.selectedId===a.id;
    const icon=L.divIcon({className:`music-anchor ${active?'is-highlighted':''} ${a.underground?'is-underground':''}`,
      html:'<span class="anchor-ring"></span><img alt=""/><span class="underground-mark"></span>',iconSize:a.kind==='statue'?[30,43]:[23,33],iconAnchor:a.kind==='statue'?[15,21.5]:[11.5,16.5]});
    const marker=L.marker(a.position,{icon,keyboard:true,title:`${a.name} #${a.sourceId} ${a.content.replace(/<[^>]*>/g,'')}`,riseOnHover:true,zIndexOffset:active?1000:0});
    marker.on('click',()=>emit('select',a.id));marker.addTo(markers);markerLookup.set(a.id,marker);
    const el=marker.getElement();if(el){el.setAttribute('role','button');el.setAttribute('aria-label',`${a.name} ${a.sourceId}`);el.dataset.anchorId=a.id;
      const img=el.querySelector('img');if(img&&a.iconUrl){img.src=a.iconUrl;img.onerror=()=>{img.remove();el.classList.add('icon-unavailable');};}
      el.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();emit('select',a.id);}});
    }
  }
}
function renderOverlays(){
  overlays.clearLayers();const config=props.config;if(!map||!config?.plugin.overlayConfig)return;
  const selected=props.layerFilter;if(!selected||['all','surface'].includes(selected))return;
  const plugin=config.plugin.overlayConfig;
  if(!plugin.urlTemplate?.startsWith('https://tiles.yuanshen.site/'))return;
  function walk(nodes:LayerNode[],parentSelected=false){for(const n of nodes){
    const active=parentSelected||n.value===selected;
    if(active)for(const chunk of n.chunks??[]){
      const image=L.imageOverlay(plugin.urlTemplate!.replace('{{chunkValue}}',encodeURIComponent(chunk.value)),chunk.bounds,{interactive:false});
      image.on('error',()=>emit('status','分层图片加载失败，可切回全部分层查看底图'));image.addTo(overlays);
    }
    walk(n.children??[],active);
  }}
  walk(plugin.overlays??[]);
}
async function rebuild(){
  generation++;map?.remove();map=null;tile=null;markerLookup.clear();loaded=0;failed=0;
  await nextTick();const config=props.config;if(!config||!container.value)return;
  const current=generation;
  const crs=L.Util.extend({},L.CRS.Simple,{
    transformation:new L.Transformation(1,0,1,0),
    projection:{project:(latlng:L.LatLng)=>L.point(latlng.lat+config.center[0],latlng.lng+config.center[1]),
      unproject:(point:L.Point)=>L.latLng(point.x-config.center[0],point.y-config.center[1])},
  }) as L.CRS;
  map=L.map(container.value,{crs,center:config.settings.center,zoom:config.settings.zoom,minZoom:config.settings.minZoom,maxZoom:config.settings.maxZoom,
    zoomSnap:0.5,zoomDelta:0.5,attributionControl:true,zoomControl:true});
  class Tile extends L.TileLayer { getTileUrl(coords:L.Coords){return tileUrl(config!.code,coords.z,coords.x,coords.y,config!.extension);} }
  const tiles=new Tile('',{minZoom:-6,maxZoom:10,maxNativeZoom:0,minNativeZoom:-3,noWrap:true,
    bounds:L.latLngBounds([-config.center[0]+config.tilesOffset[0],-config.center[1]+config.tilesOffset[1]],
      [config.size[0]-config.center[0]+config.tilesOffset[0],config.size[1]-config.center[1]+config.tilesOffset[1]]),
    attribution:'地图：<a href="https://yuanshen.site/" target="_blank" rel="noopener">空荧酒馆</a> · <a href="/licenses/KONGYING-MulanPSL-2.0.txt" target="_blank">代码许可</a>'});
  tile=tiles;
  tiles.on('loading',()=>{if(current!==generation)return;loaded=0;failed=0;emit('status','地图瓦片加载中…');});
  tiles.on('tileload',()=>{loaded++;});tiles.on('tileerror',()=>{failed++;});
  tiles.on('load',()=>{if(current!==generation)return;emit('status',failed?`部分地图加载失败（${failed}张）；可缩放或切换地区重试`:`真实地图已加载 · ${loaded}张瓦片`);});
  tiles.addTo(map);markers=L.layerGroup().addTo(map);overlays=L.layerGroup().addTo(map);renderMarkers();renderOverlays();
  resize?.disconnect();resize=new ResizeObserver(()=>map?.invalidateSize());resize.observe(container.value);
  container.value.setAttribute('aria-label','提瓦特地图，可拖动与缩放，点位也可从目录用键盘选择');
  container.value.tabIndex=0;
}
function focusPoints(){
  if(!map)return;const points=props.anchors.filter(a=>a.position&&props.highlightedIds.includes(a.id)).map(a=>a.position!);
  if(points.length===1)map.setView(points[0],Math.max(map.getZoom(),-1));
  else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[55,55],maxZoom:-0.5});
}
watch(()=>props.config,()=>rebuild());watch(()=>[props.anchors,props.selectedId,props.highlightedIds],()=>renderMarkers(),{deep:false});
watch(()=>props.layerFilter,()=>renderOverlays());
watch(()=>props.focusRequest,async()=>{await nextTick();focusPoints();});
onMounted(()=>rebuild());onBeforeUnmount(()=>{generation++;resize?.disconnect();map?.remove();});
</script>
<template><div ref="container" class="leaflet-music-map"></div></template>
<style>
.leaflet-music-map{width:100%;height:100%;min-height:240px;background:#a8c7ce;isolation:isolate}
.music-anchor{background:none;border:0;cursor:pointer}.music-anchor img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 1px 2px #1238)}
.music-anchor .anchor-ring{position:absolute;inset:-5px;border:2px solid transparent;border-radius:50%}
.music-anchor.is-highlighted .anchor-ring{border-color:#ffe0a0;box-shadow:0 0 0 3px #80652d,0 0 14px #fff;background:#fdd8}
.music-anchor:focus{outline:3px solid #fff5b0;outline-offset:6px}.music-anchor .underground-mark{display:none}
.music-anchor.is-underground .underground-mark{display:block;position:absolute;bottom:-3px;left:7px;width:8px;height:8px;background:#7c75b9;border:1px solid white;transform:rotate(45deg)}
.music-anchor.icon-unavailable{background:#dfedf6;border:2px solid #325b78;border-radius:50%}
.leaflet-container .leaflet-control-attribution{font-size:10px;max-width:80vw}.leaflet-control-zoom a{color:#314357!important}
</style>
