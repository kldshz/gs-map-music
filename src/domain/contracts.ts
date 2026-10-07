/** Stage 3 contracts: real map data; no day/night distinction or playable demo. */
export interface Area { id:number; name:string; code:string; parentId:number; isFinal:boolean; hiddenFlag:number; sortIndex:number }
export interface Anchor {
  id:string; sourceId:number; name:string; kind:'waypoint'|'statue'; areaId:number; areaCode:string;
  country:string; areaName:string; content:string;
  /** Original V3 Leaflet image coordinates, not geographic degrees. */
  position:[number,number]|null; underground:boolean; layerValues:string[]; iconUrl:string|null; sourceUrl:string;
  itemId:number; version:number; hiddenFlag:number; sourceUpdateTime:number;
}
export interface LayerChunk { value:string; bounds:[[number,number],[number,number]] }
export interface LayerNode { label:string; value:string; children?:LayerNode[]; chunks?:LayerChunk[] }
export interface MapPlugin {
  extraConfig?:{underground?:{levels?:LayerNode[]}};
  overlayConfig?:{urlTemplate?:string; overlays?:LayerNode[]};
}
export interface TileConfig {
  code?:string; extend?:string; name?:string; center?:[number,number]; size?:[number,number]; tilesOffset?:[number,number]; extension?:string;
  settings?:{center?:[number,number]; zoom?:number; minZoom?:number; maxZoom?:number};
}
export interface MapSnapshot {
  schemaVersion:1; capturedOn:string; upstreamCommit:string; configSha256:string; sources:Record<string,string>;
  areas:Area[]; anchors:Anchor[]; tiles:Record<string,TileConfig>; plugins:Record<string,MapPlugin>;
}
export interface ResolvedMap {
  areaCode:string; code:string; center:[number,number]; size:[number,number]; tilesOffset:[number,number]; extension:string;
  settings:{center:[number,number]; zoom:number; minZoom:number; maxZoom:number}; plugin:MapPlugin;
}
/** x right, y down, origin at top-left tileset extent. */
export interface MapPoint { mapId:string; x:number; y:number }
export interface MusicTrack {
  id:string; title:string; artists:string[]; composers:string[]|null; album:string|null; releaseDate:string|null;
  durationSeconds:number|null; description:string; neteaseId:string|null; sourceUrl:string|null;
  /** Personal text is independent of source metadata and is never generated for the user. */
  personalNote?:string;
  neteaseEncryptedId?:string|null;
  sceneInfo?:SceneInfo;
}
export interface SceneInfo {
  wikiTitle:string; englishTitle:string; discNumber:number; discTitle:string; trackNumber:number;
  originText:string; mainRegions:string[]; musicLocationIds:string[];
  wikiSourceUrl:string; wikiRevisionId:string; metadataNotes:string[];
}
export interface MusicLocation {
  id:string; name:string; country:string; areaId:number|null; areaCode:string|null;
  /** area fields describe the archive namespace; scene locations can be geographically unresolved. */
  kind:'place'|'scene'; sourceUrl:string; notes:string;
}
export type AssociationMatch = 'place-match'|'parent-place-match'|'region-archive'|'region-scope'|'manual';
export interface TrackAnchor {
  id:string; trackId:string; anchorId:string; evidenceStatus:'pending'|'verified'; evidenceNote:string; sourceUrl:string|null;
  matchType?:AssociationMatch;
}
export interface MusicLibrary { schemaVersion:1; tracks:MusicTrack[]; associations:TrackAnchor[]; musicLocations?:MusicLocation[] }
/** Stage 4 resolver contract only; no audio implementation or URL is bundled. */
export type PlaybackResource =
  | { status:'ready'; provider:'netease'|'local'; url:string; expiresAt:string|null; preview:boolean }
  | { status:'unavailable'; reason:'missing'|'authentication'|'permission'|'copyright'|'expired'|'network'; message:string };
