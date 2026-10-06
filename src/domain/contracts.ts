/** Stage 1 interfaces only; no player, search, route or map implementation. */
export type Id = string;
export type DayNight = 'day' | 'night';
export type TimeCondition = DayNight | 'any' | 'unknown';
export type EvidenceStatus = 'verified' | 'pending' | 'synthetic';
export type RightsStatus = 'allowed' | 'pending' | 'user-provided';

export interface Source {
  id: Id;
  url: string | null;
  accessedOn: string;
  description: string;
}

export interface Rights {
  status: RightsStatus;
  license: string | null;
  scope: 'code' | 'geometry' | 'audio' | 'metadata' | 'personal-local';
  attribution: string;
  sourceIds: Id[];
}

/** Canonical coordinates: x right, y down; never Earth latitude/longitude. */
export interface MapPoint {
  mapId: Id;
  surfaceId: Id;
  x: number;
  y: number;
}

export interface MapResource {
  id: Id;
  kind: 'schematic' | 'image' | 'tiles';
  version: string;
  width: number;
  height: number;
  uri: string | null;
  rights: Rights;
  /** Same coordinate space as anchors and region rings. */
  coordinateSystem: 'image-pixels-y-down';
  calibration: { origin: [number, number]; sourceId: Id | null };
  /** Required by an eventual tile importer; values come from its resource pack. */
  tiles?: { template: string; tileSize: number; minZoom: number; maxZoom: number; zoomOffset: number; offset: [number, number] };
}

export interface Region {
  id: Id;
  mapId: Id;
  surfaceId: Id;
  name: string;
  /** Closed rings; first outer ring, remaining rings are holes. */
  rings: Array<Array<[number, number]>>;
  priority: number;
  evidenceStatus: EvidenceStatus;
  sourceIds: Id[];
}

export interface Location {
  id: Id;
  name: string;
  regionId: Id | null;
  point: MapPoint | null;
  evidenceStatus: EvidenceStatus;
  sourceIds: Id[];
}

export interface Track {
  id: Id;
  title: string;
  aliases: string[];
  artists: string[];
  composers: string[] | null;
  album: string | null;
  releaseDate: string | null;
  durationSeconds: number | null;
  origin: 'licensed-demo' | 'genshin-catalog';
  description: string;
  sourceIds: Id[];
  audioAssetIds: Id[];
  metadataRights: Rights;
  /** Persist IDs, never an expiring playback URL; do not invent missing IDs. */
  providerRefs?: ProviderTrackRef[];
}

export interface ProviderTrackRef {
  provider: 'netease';
  originalId: string | null;
  encryptedId: string | null;
  evidenceStatus: 'verified' | 'pending';
  sourceIds: Id[];
}

export interface TrackLocation {
  id: Id;
  trackId: Id;
  locationId: Id;
  timeCondition: TimeCondition;
  evidenceStatus: EvidenceStatus;
  evidenceNote: string;
  sourceIds: Id[];
}

export type AudioAsset = {
  id: Id;
  mime: string;
  durationSeconds: number;
  sha256: string;
  rights: Rights;
} & (
  | { kind: 'bundled'; uri: string }
  | { kind: 'user-file'; fileKey: Id; uri: null }
);

export interface Dataset {
  schemaVersion: 1;
  id: Id;
  label: string;
  sources: Source[];
  maps: MapResource[];
  regions: Region[];
  locations: Location[];
  tracks: Track[];
  associations: TrackLocation[];
  audioAssets: AudioAsset[];
}

export interface MapAdapter {
  load(element: HTMLElement, map: MapResource): Promise<void>;
  destroy(): void;
  fitLocations(locations: Location[]): void;
  highlightLocations(ids: Id[]): void;
  onPointSelected(callback: (point: MapPoint, locationId?: Id) => void): () => void;
  showRoute(points: MapPoint[]): void;
  showMovingMarker(point: MapPoint | null): void;
}

export type AudioResolution =
  | { status: 'ready'; url: string; revoke: () => void; expiresAt?: number; playbackRange?: { startSeconds: number; endSeconds: number } }
  /** CLI/mpv playback must not be presented as browser HTMLAudio playback. */
  | { status: 'external-player'; provider: 'netease-cli'; trackRef: ProviderTrackRef }
  | { status: 'unavailable'; reason: 'no-source' | 'file-reselect-required' | 'unsupported-format' | 'load-failed' | 'provider-not-configured' | 'authorization-required' | 'rights-unavailable' | 'quota-exceeded' };

export interface AudioResolver {
  resolve(track: Track): Promise<AudioResolution>;
}

export interface UserLibrary {
  schemaVersion: 1;
  favoriteTrackIds: Id[];
  playlists: Array<{ id: Id; name: string; trackIds: Id[] }>;
  descriptionOverrides: Record<Id, string>;
  /** Matching information only, never a persisted blob URL. */
  fileMatches: Record<Id, { fileKey: Id; fileName: string; sha256: string }>;
}

export interface Route {
  id: Id;
  mapId: Id;
  surfaceId: Id;
  points: MapPoint[];
}

export interface RouteSimulationState {
  status: 'idle' | 'running' | 'paused' | 'finished';
  position: MapPoint | null;
  distance: number;
  speedUnitsPerSecond: number;
  activeRegionId: Id | null;
  timeOfDay: DayNight;
}
