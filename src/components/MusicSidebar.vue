<template>
  <div class="music-sidebar">
    <div class="panel-tabs" role="group" aria-label="面板切换">
      <button ref="anchorsTabBtn" type="button" :class="['tab-btn', { active: activeTab === 'anchors' }]" :aria-pressed="activeTab === 'anchors'" title="浏览当前地图筛选下的传送锚点与神像" @click="switchTab('anchors')">点位目录</button>
      <button ref="tracksTabBtn" type="button" :class="['tab-btn', { active: activeTab === 'tracks' }]" :aria-pressed="activeTab === 'tracks'" title="按文字、专辑、地区或收藏检索曲目" @click="switchTab('tracks')">曲目检索</button>
      <button type="button" :class="['tab-btn', { active: activeTab === 'detail' }]" :aria-pressed="activeTab === 'detail'" title="查看当前选中点位或曲目的详细信息" @click="switchTab('detail')">歌曲信息</button>
    </div>

    <div v-if="activeTab === 'anchors'" class="tab-content" @keydown="handleDetailKeydown">
      <p class="result-count" aria-live="polite">{{ anchorCountText }}</p>
      <p v-if="!state.visibleAnchors.length" class="empty-state">当前筛选无点位</p>
      <ul v-else class="anchor-list" aria-label="点位列表">
        <li v-for="anchor in displayAnchors" :key="anchor.id">
          <button type="button" :class="['anchor-item', 'sb-tip', 'sb-tip--inset', { selected: anchor.id === state.selectedAnchorId }]" data-tip="查看点位详情与关联音乐" :aria-current="anchor.id === state.selectedAnchorId ? 'true' : undefined" @click="selectAnchorAndShow(anchor.id)">
            <span class="anchor-kind" :title="kindLabel(anchor.kind)" aria-hidden="true"><UiIcon :name="anchor.kind === 'statue' ? 'star' : 'locate'" /></span>
            <span class="sr-only">{{ kindLabel(anchor.kind) }}</span>
            <span class="anchor-name">{{ anchor.name }}</span>
            <span class="anchor-area anchor-geo-path">{{ geoPath(anchor.geography) }}</span>
            <span class="anchor-id">#{{ anchor.id }}</span>
            <span class="anchor-content">{{ summary(anchor.content) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else-if="activeTab === 'tracks'" class="tab-content tracks-view" @keydown="handleDetailKeydown">
      <div class="track-filters" role="group" aria-label="曲目筛选">
        <select v-model="state.albumFilter" class="filter-select" aria-label="筛选专辑" title="按专辑筛选曲目">
          <option value="">全部专辑</option>
          <option v-for="album in state.albumOptions" :key="album" :value="album">{{ album }}</option>
        </select>
        <select v-model="state.regionFilter" class="filter-select" aria-label="筛选音乐地区" title="按国家、一级地区或二级地点筛选曲目">
          <option value="">全部地区</option>
          <option v-for="region in state.regionOptions" :key="region.value" :value="region.value">{{ region.label }}</option>
        </select>
        <label class="fav-switch sb-tip" data-tip="只显示已收藏曲目；可与搜索、专辑和地区筛选同时使用">
          <input v-model="state.favoritesOnly" type="checkbox" role="switch" class="fav-switch-input" />
          <UiIcon name="star" class="fav-switch-icon" aria-hidden="true" />
          <span>仅收藏</span>
        </label>
      </div>
      <p class="result-count" aria-live="polite">{{ trackCountText }}</p>
      <p v-if="!state.tracks.length" class="empty-state">曲库暂无曲目</p>
      <p v-else-if="state.favoritesOnly && !collectionState.favorites.length" class="empty-state fav-empty">尚未收藏任何曲目。可在曲目卡片中点击“收藏”，或关闭“仅收藏”浏览全部曲目。</p>
      <p v-else-if="!state.searchTracks.length" class="empty-state">
        没有匹配的曲目
        <template v-if="state.query">（搜索：“{{ state.query }}”）</template>
        <template v-if="state.albumFilter">（专辑：{{ state.albumFilter }}）</template>
        <template v-if="state.regionFilter">（地区：{{ regionLabel(state.regionFilter) }}）</template>
        <template v-if="state.favoritesOnly">（仅收藏）</template>
      </p>
      <ul v-else class="track-list track-card-list" aria-label="曲目列表">
        <li v-for="track in state.searchTracks" :key="track.id" class="track-card" :data-track-id="track.id">
          <button type="button" class="track-item info sb-tip sb-tip--inset" data-tip="查看曲目详情" @click="selectTrackAndShow(track.id, 'search')">
            <span class="track-title-row">
              <span class="track-title">{{ trackDisplayTitle(track) }}</span>
              <span v-if="isFavorite(track.id)" class="fav-mark" role="img" aria-label="已收藏" title="已收藏"><UiIcon name="star" /></span>
            </span>
            <span class="track-artists">{{ joinList(track.artists) }}</span>
            <span class="track-origin">{{ originOrPending(track) }}</span>
          </button>
          <div class="track-card-actions">
            <TrackActions :track="track" :player="props.player" :collection="props.collection" :context-ids="searchTrackIds" @open-library="forwardOpenLibrary" />
          </div>
        </li>
      </ul>
    </div>

    <div v-else-if="activeTab === 'detail' && viewMode === 'anchor' && state.selectedAnchor" class="tab-content detail-view anchor-detail-view" @keydown="handleDetailKeydown">
      <h2 ref="anchorDetailHeading" tabindex="-1" class="sidebar-detail-title">{{ state.selectedAnchor.name }} · #{{ state.selectedAnchor.sourceId }}</h2>

      <details open class="detail-section">
        <summary class="detail-summary sb-tip" data-tip="展开或收起点位的编号、类型、地区与坐标">点位信息</summary>
        <div class="detail-body">
          <dl class="anchor-info">
            <dt>编号</dt><dd>{{ state.selectedAnchor.id }}</dd>
            <dt>类型</dt><dd>{{ kindLabel(state.selectedAnchor.kind) }}</dd>
            <dt>国家</dt><dd>{{ show(state.selectedAnchor.geography?.country || state.selectedAnchor.country) }}</dd>
            <dt>一级地区</dt><dd>{{ primaryLabel(state.selectedAnchor.geography) }}</dd>
            <dt>二级地点</dt><dd>{{ secondaryLabel(state.selectedAnchor.geography) }}</dd>
            <dt>源地图分组</dt><dd>{{ show(state.selectedAnchor.areaName) }}</dd>
            <dt>坐标</dt><dd>{{ state.selectedAnchor.position ? `x=${state.selectedAnchor.position[0].toFixed(1)}, y=${state.selectedAnchor.position[1].toFixed(1)} (V3图像坐标)` : '待核实' }}</dd>
            <dt>说明</dt><dd>{{ show(state.selectedAnchor.content) }}</dd>
            <dt>来源</dt>
            <dd>
              <a v-if="state.selectedAnchor.sourceUrl" :href="state.selectedAnchor.sourceUrl" target="_blank" rel="noopener" title="在新窗口打开空荧酒馆来源">空荧酒馆</a>
              <template v-else>未知</template>
            </dd>
          </dl>
        </div>
      </details>

      <details v-if="state.selectedAnchor.geography" class="detail-section geography-evidence">
        <summary class="detail-summary sb-tip" data-tip="查看地区归类方式与核实状态">归类证据</summary>
        <div class="detail-body">
          <p class="context-note">地区归类仅供参考，尚待核实，不代表官方边界</p>
          <dl class="anchor-info">
            <dt>归类方式</dt><dd>{{ geographyMethodLabel(state.selectedAnchor.geography) }}</dd>
            <dt>核实状态</dt><dd>{{ evidenceStatusLabel(state.selectedAnchor.geography) }}</dd>
            <template v-if="editorOn && geographyDistance(state.selectedAnchor.geography)">
              <dt>距离候选</dt><dd>{{ geographyDistance(state.selectedAnchor.geography) }}</dd>
            </template>
            <dt>归类来源</dt>
            <dd>
              <a v-if="state.selectedAnchor.geography?.sourceUrl" :href="state.selectedAnchor.geography?.sourceUrl" target="_blank" rel="noopener">查看归类来源</a>
              <template v-else>未知</template>
            </dd>
          </dl>
        </div>
      </details>

      <details open class="detail-section anchor-tracks-section">
        <summary class="detail-summary sb-tip" data-tip="展开或收起与此点位关联的曲目">关联音乐（{{ anchorTracks.length }}）</summary>
        <div class="detail-body">
          <UiButton v-if="anchorTracks.length" class="play-all-btn" label="播放点位曲库" text="播放点位曲库" icon="play" @click="handlePlayAnchorTracks" />
          <div v-if="state.anchorMusicContexts.length" class="music-contexts">
            <h4>曲库细分目录</h4>
            <p class="context-note">以下为此点位已关联曲目的细分目录标签，不代表该点位的实际地理位置</p>
            <ul class="context-list">
              <li v-for="ctx in state.anchorMusicContexts" :key="ctx">{{ ctx }}</li>
            </ul>
          </div>
          <ul v-if="anchorTracks.length" class="tracks-list track-card-list" aria-label="点位关联曲目">
            <li v-for="track in anchorTracks" :key="track.id" class="track-detail track-card" :data-track-id="track.id">
              <button type="button" class="track-item info sb-tip sb-tip--inset" data-tip="查看曲目详情" @click="selectTrackAndShow(track.id, 'anchor')">
                <span class="track-title-row">
                  <span class="track-title">{{ trackDisplayTitle(track) }}</span>
                  <span v-if="isFavorite(track.id)" class="fav-mark" role="img" aria-label="已收藏" title="已收藏"><UiIcon name="star" /></span>
                </span>
                <span class="track-artists">艺人：{{ joinList(track.artists) }}</span>
                <span class="track-origin">{{ originOrPending(track) }}</span>
              </button>
              <div class="track-card-actions">
                <TrackActions :track="track" :player="props.player" :collection="props.collection" :context-ids="anchorTrackIds" @open-library="forwardOpenLibrary" />
              </div>
              <div v-if="editorOn" class="edit-actions dev-zone-inline" role="group" aria-label="开发编辑：此曲目与当前点位的关联">
                <span class="dev-tag">开发</span>
                <button type="button" class="edit-btn remove-btn sb-tip" data-tip="仅移除此曲目与当前点位的关联，曲目资料保留" :disabled="state.editBusy" @click="removeFromAnchor(track.id)">移除关联</button>
                <button v-if="anchorTrackCanRestore(track.id)" type="button" class="edit-btn restore-btn sb-tip" data-tip="撤销手动修改，恢复来源数据中的关联状态" :disabled="state.editBusy" @click="restoreAnchorTrack(track.id)">恢复来源关联</button>
              </div>
            </li>
          </ul>
          <p v-else class="empty-state">尚未补充音乐关系数据</p>

          <div v-if="editorOn && state.selectedAnchor" class="dev-add-track dev-zone">
            <h4>开发编辑：添加曲目到此点位</h4>
            <p class="dev-hint">仅修改点位关联，歌曲资料保留</p>
            <input v-model="addTrackQuery" type="search" class="search-input" placeholder="搜索全部曲目" aria-label="搜索要添加的曲目" />
            <ul v-if="candidateTracks.length" class="candidate-list">
              <li v-for="track in candidateTracks.slice(0, 20)" :key="track.id" :data-track-id="track.id">
                <div class="candidate-item">
                  <span class="track-title">{{ trackDisplayTitle(track) }}</span>
                  <button type="button" class="edit-btn add-btn sb-tip" data-tip="把此曲目关联到当前点位（待核实）" :disabled="state.editBusy || isAlreadyAdded(track.id)" @click="addToAnchor(track.id)">{{ isAlreadyAdded(track.id) ? '已添加' : '添加到此点位' }}</button>
                  <button v-if="anchorCandidateCanRestore(track.id)" type="button" class="edit-btn restore-btn sb-tip" data-tip="撤销手动修改，恢复来源数据中的关联状态" :disabled="state.editBusy" @click="restoreAnchorTrack(track.id)">恢复来源关联</button>
                </div>
              </li>
            </ul>
            <p v-else-if="addTrackQuery.trim()" class="empty-state">无匹配曲目</p>
          </div>
        </div>
      </details>
    </div>

    <div v-else-if="activeTab === 'detail' && viewMode === 'track' && state.selectedTrack" class="tab-content detail-view track-detail-view" @keydown="handleDetailKeydown">
      <header class="track-detail-head" :data-track-id="state.selectedTrack.id">
        <div class="track-detail-title-row">
          <h2 ref="trackDetailHeading" tabindex="-1" class="sidebar-detail-title">{{ trackDisplayTitle(state.selectedTrack) }}</h2>
          <span v-if="isFavorite(state.selectedTrack.id)" class="fav-mark fav-mark--lg" role="img" aria-label="已收藏" title="已收藏"><UiIcon name="star" /></span>
        </div>
        <TrackActions :track="state.selectedTrack" :player="props.player" :collection="props.collection" :context-ids="detailContextIds" @open-library="forwardOpenLibrary" />
      </header>
      <UiButton v-if="state.selectedAnchor" class="back-to-anchor-btn" label="返回当前点位曲库" text="返回当前点位曲库" icon="arrow-left" @click="backToAnchor" />

      <details open class="detail-section track-basic-section">
        <summary class="detail-summary sb-tip" data-tip="展开或收起曲目的基本信息、出处与分类">基本信息</summary>
        <div class="detail-body">
          <dl class="track-metadata">
            <template v-if="state.selectedTrack.sceneInfo">
              <dt>中文名</dt><dd>{{ show(state.selectedTrack.sceneInfo.wikiTitle) }}</dd>
              <dt>英文名</dt><dd>{{ show(state.selectedTrack.sceneInfo.englishTitle) }}</dd>
              <dt>分碟与曲序</dt><dd>{{ state.selectedTrack.sceneInfo.discTitle }} 第{{ state.selectedTrack.sceneInfo.trackNumber }}首</dd>
            </template>
            <dt>艺人</dt><dd>{{ joinList(state.selectedTrack.artists) }}</dd>
            <dt>作曲</dt><dd>{{ joinList(state.selectedTrack.composers) }}</dd>
            <dt>专辑</dt><dd>{{ show(state.selectedTrack.album) }}</dd>
            <dt>发行日期</dt><dd>{{ show(state.selectedTrack.releaseDate) }}</dd>
            <dt>时长</dt><dd>{{ formatDuration(state.selectedTrack.durationSeconds) }}</dd>
            <dt>网易云音乐</dt>
            <dd>
              <a v-if="state.selectedTrack.neteaseId" :href="neteaseUrl(state.selectedTrack.neteaseId)" target="_blank" rel="noopener" title="在网易云音乐中打开（新窗口）">{{ state.selectedTrack.neteaseId }}</a>
              <template v-else>未知</template>
            </dd>
            <dt>出处原文</dt><dd class="origin-text">{{ originOrUnknown(state.selectedTrack) }}</dd>
            <dt>主要地区</dt><dd>{{ joinList(state.selectedTrack.sceneInfo?.mainRegions) }}</dd>
            <dt>统一分类路径</dt>
            <dd>
              <ul v-if="selectedScopes.length" class="location-labels geo-scope-list">
                <li v-for="(scope, idx) in selectedScopes" :key="idx">{{ geoPath(scope) }}</li>
              </ul>
              <template v-else>统一目录未归类</template>
            </dd>
            <dt>细分目录</dt>
            <dd>
              <ul v-if="selectedLabels.length" class="location-labels">
                <li v-for="label in selectedLabels" :key="label">{{ label }}</li>
              </ul>
              <template v-else>未知</template>
            </dd>
            <dt>Wiki来源</dt>
            <dd>
              <a v-if="state.selectedTrack.sceneInfo?.wikiSourceUrl" :href="state.selectedTrack.sceneInfo?.wikiSourceUrl" target="_blank" rel="noopener">{{ state.selectedTrack.sceneInfo?.wikiSourceUrl }}</a>
              <template v-else>未知</template>
              <span v-if="state.selectedTrack.sceneInfo?.wikiRevisionId" class="metadata-note">（修订版本 {{ state.selectedTrack.sceneInfo?.wikiRevisionId }}，内容仅供参考）</span>
            </dd>
            <template v-if="selectedMetaNotes.length">
              <dt>元数据说明</dt>
              <dd>
                <ul class="metadata-notes">
                  <li v-for="(note, idx) in selectedMetaNotes" :key="idx">{{ note }}</li>
                </ul>
              </dd>
            </template>
          </dl>
        </div>
      </details>

      <details class="detail-section track-locations-section">
        <summary class="detail-summary sb-tip" data-tip="展开或收起此曲目关联的地图点位">关联点位（{{ trackLocations.length }}）</summary>
        <div class="detail-body">
          <template v-if="trackLocations.length">
            <div class="locate-all-row">
              <UiButton class="locate-btn" label="在地图上定位全部" text="在地图上定位全部" icon="locate" @click="locateAll" />
            </div>
            <ul class="location-list" aria-label="关联点位列表">
              <li v-for="anchor in trackLocations" :key="anchor.id" class="location-item">
                <button type="button" class="location-btn sb-tip sb-tip--inset" data-tip="在地图上定位此点位并查看详情" @click="locateAnchor(anchor.id)">
                  <span class="location-content">{{ anchor.content?.trim() || '点位说明尚未提供' }}</span>
                  <span class="location-area">{{ kindLabel(anchor.kind) }} · #{{ anchor.id }}</span>
                  <span v-if="!anchor.position" class="location-pending">坐标待核实</span>
                </button>
                <div v-if="editorOn" class="edit-actions dev-zone-inline" role="group" aria-label="开发编辑：此点位与当前曲目的关联">
                  <span class="dev-tag">开发</span>
                  <button type="button" class="edit-btn remove-btn sb-tip" data-tip="仅移除此点位与当前曲目的关联，曲目资料保留" :disabled="state.editBusy" @click="removeFromTrack(anchor.id)">移除所选关联</button>
                  <button v-if="trackAnchorCanRestore(anchor.id)" type="button" class="edit-btn restore-btn sb-tip" data-tip="撤销手动修改，恢复来源数据中的关联状态" :disabled="state.editBusy" @click="restoreTrackLocation(anchor.id)">恢复所选来源关联</button>
                </div>
              </li>
            </ul>
          </template>
          <p v-else class="empty-state">尚无关联点位</p>

          <div v-if="editorOn && state.selectedTrack" class="dev-add-anchor dev-zone">
            <h4>开发编辑：添加点位到此曲目</h4>
            <p class="dev-hint">仅修改点位关联，歌曲资料保留</p>
            <div class="anchor-filter">
              <select v-model="addAnchorRegion" class="region-select" aria-label="按地区筛选候选点位">
                <option value="">全部地区</option>
                <option v-for="area in state.areaOptions" :key="area.code" :value="area.code">{{ areaLabel(area) }}</option>
              </select>
              <input v-model="addAnchorQuery" type="search" class="search-input" placeholder="搜索点位" aria-label="搜索候选点位" />
            </div>
            <ul v-if="candidateAnchors.length" class="candidate-list">
              <li v-for="anchor in candidateAnchors.slice(0, 20)" :key="anchor.id">
                <div class="candidate-item">
                  <div class="candidate-info">
                    <span class="anchor-content candidate-content">{{ anchor.content?.trim() || '点位说明尚未提供' }}</span>
                    <span class="anchor-meta"><span class="anchor-kind" :title="kindLabel(anchor.kind)" aria-hidden="true">{{ anchor.kind === 'statue' ? '✦' : '⚓' }}</span>{{ kindLabel(anchor.kind) }} · #{{ anchor.id }}</span>
                    <span class="anchor-geo-path">{{ geoPath(anchor.geography) }}</span>
                  </div>
                  <div class="candidate-actions">
                    <button type="button" class="edit-btn add-btn sb-tip" data-tip="把此点位关联到当前曲目（待核实）" :disabled="state.editBusy || isAnchorAdded(anchor.id)" @click="addAnchorToTrack(anchor.id)">{{ isAnchorAdded(anchor.id) ? '已添加' : '添加到所选点位' }}</button>
                    <button v-if="isAnchorAdded(anchor.id)" type="button" class="edit-btn remove-btn sb-tip" data-tip="仅移除此点位与当前曲目的关联" :disabled="state.editBusy" @click="removeFromTrack(anchor.id)">移除所选关联</button>
                    <button v-if="candidateAnchorCanRestore(anchor.id)" type="button" class="edit-btn restore-btn sb-tip" data-tip="撤销手动修改，恢复来源数据中的关联状态" :disabled="state.editBusy" @click="restoreTrackLocation(anchor.id)">恢复所选来源关联</button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-else-if="addAnchorQuery.trim() || addAnchorRegion" class="empty-state">无匹配点位</p>
          </div>
        </div>
      </details>
    </div>

    <div v-else-if="activeTab === 'detail'" class="tab-content detail-view">
      <p class="empty-state">请从点位目录或曲目检索选择一项</p>
    </div>

    <div v-if="editorOn" class="dev-section dev-zone" role="group" aria-label="开发编辑状态">
      <p class="dev-hint"><span class="dev-tag">开发</span> 增删点位关联保存到本机项目，刷新保留；歌曲资料保持，不自动同步MySQL。</p>
      <p v-if="state.editMessage" class="edit-message" :role="state.editMessage.includes('失败') ? 'alert' : 'status'">{{ state.editMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { MusicTrack, GeographicScope, AnchorGeography } from '../domain/contracts';
import type { useExplorer } from '../services/explorer';
import UiIcon from './UiIcon.vue';
import UiButton from './UiButton.vue';
import TrackActions from './TrackActions.vue';

type Maybe<T> = T | null | undefined;

const props = defineProps<{
  explorer: ReturnType<typeof useExplorer>;
  player: ReturnType<typeof import('../services/music-player').useMusicPlayer>;
  collection: ReturnType<typeof import('../services/music-collection').useMusicCollection>;
}>();

const emit = defineEmits<{
  (e: 'open-library', payload: { trackId?: string }): void;
}>();

const state = reactive(props.explorer);
const playerState = reactive(props.player);
const collectionState = reactive(props.collection);

type Tab = 'anchors' | 'tracks' | 'detail';
type ViewMode = 'anchor' | 'track' | null;
type TrackSource = 'anchor' | 'search';

const activeTab = ref<Tab>('anchors');
const viewMode = ref<ViewMode>(null);
const lastValidViewMode = ref<ViewMode>(null);
const trackSource = ref<TrackSource>('search');
const addTrackQuery = ref('');
const addAnchorQuery = ref('');
const addAnchorRegion = ref('');
const anchorDetailHeading = ref<HTMLElement | null>(null);
const trackDetailHeading = ref<HTMLElement | null>(null);
const anchorsTabBtn = ref<HTMLElement | null>(null);
const tracksTabBtn = ref<HTMLElement | null>(null);

/** Development controls require all three gates; DEV alone never exposes them. */
const editorOn = computed(() => state.developmentMode && state.editingAvailable && state.editingEnabled);

const displayAnchors = computed(() => state.visibleAnchors.slice(0, 100));
const anchorCountText = computed(() => {
  const n = state.visibleAnchors.length;
  return n > 100 ? `当前共 ${n} 个点位，显示前 100 个` : `当前共 ${n} 个点位`;
});
const trackCountText = computed(() => {
  const total = state.tracks.length;
  const shown = state.searchTracks.length;
  if (!total) return '0 首曲目';
  const base = shown === total ? `${total} 首曲目` : `${shown} / ${total} 首曲目`;
  return state.favoritesOnly ? `${base} · 仅收藏` : base;
});

const anchorTracks = computed(() => state.anchorTracks);
const trackLocations = computed(() => state.trackLocations);
const searchTrackIds = computed(() => state.searchTracks.map(t => t.id));
const anchorTrackIds = computed(() => anchorTracks.value.map(t => t.id));
const detailContextIds = computed(() => {
  const track = state.selectedTrack;
  if (!track) return [] as string[];
  if (trackSource.value === 'anchor' && anchorTrackIds.value.includes(track.id)) return anchorTrackIds.value;
  if (searchTrackIds.value.includes(track.id)) return searchTrackIds.value;
  return [track.id];
});

const selectedScopes = computed<GeographicScope[]>(() => state.selectedTrack?.sceneInfo?.geographicScopes ?? []);
const selectedLabels = computed<string[]>(() => (state.selectedTrack ? state.trackLocationLabels(state.selectedTrack.id) : []));
const selectedMetaNotes = computed<string[]>(() => state.selectedTrack?.sceneInfo?.metadataNotes ?? []);

const candidateTracks = computed(() => {
  if (!addTrackQuery.value.trim()) return [];
  const q = addTrackQuery.value.trim().toLocaleLowerCase();
  return state.tracks.filter(t => {
    const text = [t.title, ...t.artists, t.album, t.sceneInfo?.wikiTitle, t.sceneInfo?.englishTitle].join(' ').toLocaleLowerCase();
    return text.includes(q);
  });
});

const candidateAnchors = computed(() => {
  let list = state.anchors;
  if (addAnchorRegion.value) {
    list = list.filter(a => a.areaCode === addAnchorRegion.value);
  }
  if (addAnchorQuery.value.trim()) {
    const q = addAnchorQuery.value.trim().toLocaleLowerCase();
    list = list.filter(a => {
      const text = [a.name, a.content, a.areaName, a.country, a.id, a.geography?.country, a.geography?.primary, a.geography?.secondary].join(' ').toLocaleLowerCase();
      return text.includes(q);
    });
  }
  return list;
});

function isFavorite(id: string): boolean {
  return collectionState.isFavorite(id);
}

function regionLabel(value: string): string {
  return state.regionOptions.find(r => r.value === value)?.label ?? value;
}

function areaLabel(area: { name: string; parentId?: Maybe<number> }): string {
  const parent = area.parentId ? state.areas.find((a) => a.id === area.parentId)?.name : undefined;
  return parent ? `${parent} · ${area.name}` : area.name;
}

function kindLabel(kind: string): string {
  if (kind === 'statue') return '神像';
  if (kind === 'waypoint') return '传送锚点';
  return '点位';
}

function primaryLabel(scope: Maybe<GeographicScope>): string {
  return scope?.primary?.trim() || '未确定';
}

function secondaryLabel(scope: Maybe<GeographicScope>): string {
  return scope?.secondary?.trim() || '未细分';
}

function geoPath(scope: Maybe<GeographicScope>): string {
  if (!scope) return '统一目录未归类';
  return [scope.country?.trim() || '未知', primaryLabel(scope), secondaryLabel(scope)].join(' / ');
}

function geographyMethodLabel(geo: Maybe<AnchorGeography>): string {
  if (geo?.method === 'source-header') return '来源标题归类';
  if (geo?.method === 'landmark-distance') return '地标距离候选';
  return '未解析';
}

function evidenceStatusLabel(geo: Maybe<AnchorGeography>): string {
  return geo?.evidenceStatus === 'pending' ? '待核实' : '未知';
}

function geographyDistance(geo: Maybe<AnchorGeography>): string | null {
  const d = geo?.distance;
  return typeof d === 'number' && Number.isFinite(d) ? `${d.toFixed(1)} V3图像单位（非米）` : null;
}

function show(value: Maybe<string | number>): string {
  return value === null || value === undefined || value === '' ? '未知' : String(value);
}

function joinList(values: Maybe<readonly string[]>): string {
  return values && values.length ? values.join('、') : '未知';
}

function summary(value: Maybe<string>, max = 36): string {
  const text = value ? value.trim() : '';
  if (!text) return '暂无说明';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function originOrPending(track: MusicTrack): string {
  return track.sceneInfo?.originText?.trim() || '出处尚未提供';
}

function originOrUnknown(track: MusicTrack): string {
  const raw = track.sceneInfo?.originText;
  return raw && raw.trim() ? raw : '未知';
}

function formatDuration(seconds: Maybe<number>): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '未知';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function neteaseUrl(id: string | number): string {
  return `https://music.163.com/#/song?id=${encodeURIComponent(String(id))}`;
}

function trackDisplayTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

function switchTab(tab: Tab): void {
  activeTab.value = tab;
  if (tab === 'detail') {
    if (lastValidViewMode.value === 'track' && state.selectedTrack) {
      viewMode.value = 'track';
    } else if (lastValidViewMode.value === 'anchor' && state.selectedAnchor) {
      viewMode.value = 'anchor';
    } else if (state.selectedTrack) {
      viewMode.value = 'track';
    } else if (state.selectedAnchor) {
      viewMode.value = 'anchor';
    } else {
      viewMode.value = null;
    }
  }
}

function selectAnchorAndShow(id: string): void {
  state.selectAnchor(id);
  viewMode.value = 'anchor';
  lastValidViewMode.value = 'anchor';
  activeTab.value = 'detail';
  void nextTick(() => {
    anchorDetailHeading.value?.focus();
  });
}

function selectTrackAndShow(id: string, source: TrackSource = 'search'): void {
  state.selectTrack(id);
  trackSource.value = source;
  viewMode.value = 'track';
  lastValidViewMode.value = 'track';
  activeTab.value = 'detail';
  void nextTick(() => {
    trackDetailHeading.value?.focus();
  });
}

function backToAnchor(): void {
  if (state.selectedAnchor) selectAnchorAndShow(state.selectedAnchor.id);
}

function locateAll(): void {
  state.locateTrack();
}

function locateAnchor(id: string): void {
  state.selectAnchor(id);
  viewMode.value = 'anchor';
  lastValidViewMode.value = 'anchor';
  activeTab.value = 'detail';
  void nextTick(() => {
    anchorDetailHeading.value?.focus();
  });
}

function isAlreadyAdded(trackId: string): boolean {
  return state.anchorTracks.some(t => t.id === trackId);
}

function isAnchorAdded(anchorId: string): boolean {
  return state.trackLocations.some(a => a.id === anchorId);
}

async function addToAnchor(trackId: string): Promise<void> {
  if (!state.selectedAnchor) return;
  await state.addTrackToAnchor(trackId, state.selectedAnchor.id);
}

async function removeFromAnchor(trackId: string): Promise<void> {
  if (!state.selectedAnchor) return;
  await state.removeTrackFromAnchor(trackId, state.selectedAnchor.id);
}

async function addAnchorToTrack(anchorId: string): Promise<void> {
  if (!state.selectedTrack) return;
  await state.addTrackToAnchor(state.selectedTrack.id, anchorId);
}

async function removeFromTrack(anchorId: string): Promise<void> {
  if (!state.selectedTrack) return;
  await state.removeTrackFromAnchor(state.selectedTrack.id, anchorId);
}

async function restoreAssociation(trackId: string, anchorId: string): Promise<void> {
  await state.restoreTrackAnchor(trackId, anchorId);
}

async function restoreAnchorTrack(trackId: string): Promise<void> {
  if (!state.selectedAnchor) return;
  await restoreAssociation(trackId, state.selectedAnchor.id);
}

async function restoreTrackLocation(anchorId: string): Promise<void> {
  if (!state.selectedTrack) return;
  await restoreAssociation(state.selectedTrack.id, anchorId);
}

function trackAnchorCanRestore(anchorId: string): boolean {
  return !!state.selectedTrack && state.hasManualEdit(state.selectedTrack.id, anchorId);
}

function candidateAnchorCanRestore(anchorId: string): boolean {
  return !!state.selectedTrack && state.hasManualEdit(state.selectedTrack.id, anchorId);
}

function anchorTrackCanRestore(trackId: string): boolean {
  return !!state.selectedAnchor && state.hasManualEdit(trackId, state.selectedAnchor.id);
}

function anchorCandidateCanRestore(trackId: string): boolean {
  return !!state.selectedAnchor && state.hasManualEdit(trackId, state.selectedAnchor.id);
}

function handleDetailKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const target = event.target as HTMLElement | null;
  // Escape inside an open card menu belongs to that menu, not to tab navigation.
  if (target?.closest?.('details[open]:not(.detail-section)')) return;
  if (viewMode.value === 'anchor') {
    event.preventDefault();
    activeTab.value = 'anchors';
    void nextTick(() => {
      anchorsTabBtn.value?.focus();
    });
  } else if (viewMode.value === 'track') {
    event.preventDefault();
    activeTab.value = 'tracks';
    void nextTick(() => {
      tracksTabBtn.value?.focus();
    });
  }
}

watch(() => state.selectedAnchorId, (newId) => {
  addTrackQuery.value = '';
  addAnchorQuery.value = '';
  addAnchorRegion.value = '';
  if (newId) {
    viewMode.value = 'anchor';
    lastValidViewMode.value = 'anchor';
    activeTab.value = 'detail';
    void nextTick(() => {
      anchorDetailHeading.value?.focus();
    });
  }
});

watch(() => state.selectedTrack?.id, () => {
  addTrackQuery.value = '';
  addAnchorQuery.value = '';
  addAnchorRegion.value = '';
});

async function handlePlayAnchorTracks(): Promise<void> {
  const ids = anchorTrackIds.value;
  if (!ids.length) return;
  await playerState.playTrack(ids[0], ids);
}

function forwardOpenLibrary(payload: { trackId?: string }): void {
  emit('open-library', { trackId: payload?.trackId });
}

defineExpose({ showAnchor: selectAnchorAndShow, showTrack: (id: string) => selectTrackAndShow(id) });
</script>
