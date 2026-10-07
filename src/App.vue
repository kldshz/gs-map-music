<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">原神锚点音乐库</h1>
      <div class="header-controls">
        <select v-model="areaCode" class="area-select" aria-label="选择地区" @change="selectArea(areaCode)">
          <option v-for="area in areaOptions" :key="area.code" :value="area.code">{{ areaLabel(area) }}</option>
        </select>
        <select v-model="layerFilter" class="area-select layer-select" aria-label="地图分层">
          <option v-for="opt in layerOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="type-filter" role="group" aria-label="点位类型">
          <button type="button" :class="['filter-btn', { active: typeFilter === 'all' }]" :aria-pressed="typeFilter === 'all'" @click="typeFilter = 'all'">全部</button>
          <button type="button" :class="['filter-btn', { active: typeFilter === 'waypoint' }]" :aria-pressed="typeFilter === 'waypoint'" @click="typeFilter = 'waypoint'">锚点</button>
          <button type="button" :class="['filter-btn', { active: typeFilter === 'statue' }]" :aria-pressed="typeFilter === 'statue'" @click="typeFilter = 'statue'">神像</button>
        </div>
        <input v-model="query" type="search" class="search-input" placeholder="搜索点位、曲目、专辑或地区" aria-label="搜索点位、曲目、专辑或地区" />
      </div>
    </header>

    <main class="app-main">
      <div class="map-container">
        <MapCanvas
          class="map-canvas"
          :config="mapConfig"
          :anchors="visibleAnchors"
          :selected-id="selectedAnchorId"
          :highlighted-ids="highlightedIds"
          :focus-request="focusRequest"
          :layer-filter="layerFilter"
          @select="selectAnchor"
          @status="mapStatus = $event"
        />
        <div v-if="loading" class="map-overlay" role="status">加载中...</div>
        <div v-if="error" class="map-overlay error" role="alert">
          <p>{{ error }}</p>
          <button type="button" class="retry-btn" @click="load()">重试加载</button>
        </div>
        <div v-if="mapStatus" class="map-status" role="status" aria-live="polite">{{ mapStatus }}</div>
      </div>

      <aside :class="['side-panel', { collapsed: panelCollapsed }]">
        <button type="button" class="panel-toggle" aria-controls="side-panel-content" :aria-expanded="!panelCollapsed" :aria-label="panelCollapsed ? '展开面板' : '收起面板'" @click="panelCollapsed = !panelCollapsed">
          {{ panelCollapsed ? '◀' : '▶' }}
        </button>
        <div v-show="!panelCollapsed" id="side-panel-content" class="panel-content">
          <div class="panel-tabs" role="group" aria-label="面板切换">
            <button type="button" :class="['tab-btn', { active: activeTab === 'anchors' }]" :aria-pressed="activeTab === 'anchors'" @click="activeTab = 'anchors'">点位目录</button>
            <button type="button" :class="['tab-btn', { active: activeTab === 'tracks' }]" :aria-pressed="activeTab === 'tracks'" @click="activeTab = 'tracks'">曲目检索</button>
          </div>

          <div v-if="activeTab === 'anchors'" class="tab-content">
            <p class="result-count" aria-live="polite">{{ anchorCountText }}</p>
            <p v-if="!visibleAnchors.length" class="empty-state">当前筛选无点位</p>
            <ul v-else class="anchor-list" aria-label="点位列表">
              <li v-for="anchor in displayAnchors" :key="anchor.id">
                <button type="button" :class="['anchor-item', { selected: anchor.id === selectedAnchorId }]" :aria-current="anchor.id === selectedAnchorId ? 'true' : undefined" @click="selectAnchor(anchor.id)">
                  <span class="anchor-kind" :title="kindLabel(anchor.kind)" aria-hidden="true">{{ anchor.kind === 'statue' ? '✦' : '⚓' }}</span>
                  <span class="sr-only">{{ kindLabel(anchor.kind) }}</span>
                  <span class="anchor-name">{{ anchor.name }}</span>
                  <span class="anchor-area">{{ show(anchor.areaName) }}</span>
                  <span class="anchor-id">#{{ anchor.id }}</span>
                  <span class="anchor-content">{{ summary(anchor.content) }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div v-else class="tab-content">
            <p class="result-count" aria-live="polite">{{ trackCountText }}</p>
            <p v-if="!tracks.length" class="empty-state">音乐库尚未补充</p>
            <p v-else-if="!searchTracks.length" class="empty-state">没有与“{{ query }}”匹配的曲目</p>
            <ul v-else class="track-list" aria-label="曲目列表">
              <li v-for="track in searchTracks" :key="track.id">
                <button type="button" class="track-item" @click="openTrack(track.id)">
                  <span class="track-title">{{ track.title }}</span>
                  <span class="track-artists">{{ joinList(track.artists) }}</span>
                  <span class="track-status">{{ associationStatus(track.id) }}</span>
                </button>
              </li>
            </ul>
          </div>

          <section class="import-section" aria-labelledby="import-title">
            <h3 id="import-title">导入音乐库</h3>
            <p class="import-hint">曲目与关联JSON；神像和锚点均可关联多首。音乐数据暂空。</p>
            <label class="import-label">
              <input type="file" accept="application/json,.json" class="import-input" @change="handleImport" />
              <span class="import-btn">{{ tracks.length ? '替换导入' : '选择文件' }}</span>
            </label>
            <p v-if="importMessage" class="import-message" role="status" aria-live="polite">{{ importMessage }}</p>
            <p v-if="importError" class="import-message error" role="alert">{{ importError }}</p>
          </section>
        </div>
      </aside>
    </main>

    <dialog ref="anchorDialog" class="anchor-dialog" aria-labelledby="anchor-dialog-title" @close="onAnchorDialogClose">
      <div class="dialog-content">
        <header class="dialog-header">
          <h2 id="anchor-dialog-title">{{ selectedAnchor ? selectedAnchor.name : '未选择点位' }}</h2>
          <button type="button" class="close-btn" aria-label="关闭" @click="closeAnchor">✕</button>
        </header>
        <div v-if="selectedAnchor" class="dialog-body">
          <dl class="anchor-info">
            <dt>编号</dt><dd>{{ selectedAnchor.id }}</dd>
            <dt>类型</dt><dd>{{ kindLabel(selectedAnchor.kind) }}</dd>
            <dt>地区</dt><dd>{{ show(selectedAnchor.areaName) }}</dd>
            <dt>国家</dt><dd>{{ show(selectedAnchor.country) }}</dd>
            <dt>说明</dt><dd>{{ show(selectedAnchor.content) }}</dd>
            <dt>来源</dt>
            <dd>
              <a v-if="selectedAnchor.sourceUrl" :href="selectedAnchor.sourceUrl" target="_blank" rel="noopener">空荧酒馆</a>
              <template v-else>未知</template>
            </dd>
          </dl>
          <section class="anchor-tracks">
            <h3>关联音乐（{{ anchorTracks.length }}）</h3>
            <ul v-if="anchorTracks.length" class="tracks-list">
              <li v-for="track in anchorTracks" :key="track.id" class="track-detail">
                <button type="button" class="track-item" @click="openTrack(track.id)">
                  <span class="track-title">{{ track.title }}</span>
                  <span class="track-artists">演奏：{{ joinList(track.artists) }}</span>
                  <span class="track-status">{{ associationStatus(track.id) }}</span>
                </button>
              </li>
            </ul>
            <p v-else class="empty-state">尚未补充音乐关系数据</p>
          </section>
        </div>
      </div>
    </dialog>

    <dialog ref="trackDialog" class="track-dialog" aria-labelledby="track-dialog-title" @close="onTrackDialogClose">
      <div class="dialog-content">
        <header class="dialog-header">
          <h2 id="track-dialog-title">{{ selectedTrack ? selectedTrack.title : '尚未选择曲目' }}</h2>
          <button type="button" class="close-btn" aria-label="关闭" @click="closeTrack">✕</button>
        </header>
        <div v-if="selectedTrack" class="dialog-body">
          <dl class="track-metadata">
            <dt>演奏</dt><dd>{{ joinList(selectedTrack.artists) }}</dd>
            <dt>作曲</dt><dd>{{ joinList(selectedTrack.composers) }}</dd>
            <dt>专辑</dt><dd>{{ show(selectedTrack.album) }}</dd>
            <dt>发行日期</dt><dd>{{ show(selectedTrack.releaseDate) }}</dd>
            <dt>时长</dt><dd>{{ formatDuration(selectedTrack.durationSeconds) }}</dd>
            <dt>网易云 ID</dt>
            <dd>
              <a v-if="selectedTrack.neteaseId" :href="neteaseUrl(selectedTrack.neteaseId)" target="_blank" rel="noopener">{{ selectedTrack.neteaseId }}</a>
              <template v-else>未知</template>
            </dd>
            <dt>来源</dt>
            <dd>
              <a v-if="selectedTrack.sourceUrl" :href="selectedTrack.sourceUrl" target="_blank" rel="noopener">{{ selectedTrack.sourceUrl }}</a>
              <template v-else>未知</template>
            </dd>
            <dt>地域关系</dt><dd>{{ associationStatus(selectedTrack.id) }}</dd>
          </dl>
          <p class="track-description">{{ selectedTrack.description || '简介未知' }}</p>
          <section class="track-locations">
            <h3>关联点位（{{ trackLocations.length }}）</h3>
            <template v-if="trackLocations.length">
              <button type="button" class="locate-btn" @click="locateAll">在地图上定位全部</button>
              <ul class="location-list">
                <li v-for="anchor in trackLocations" :key="anchor.id" class="location-item">
                  <button type="button" class="location-btn" @click="locateAnchor(anchor.id)">
                    <span>{{ anchor.name }}</span>
                    <span class="location-area">{{ show(anchor.areaName) }} · #{{ anchor.id }}</span>
                    <span v-if="!anchor.position" class="location-pending">坐标待核实</span>
                  </button>
                </li>
              </ul>
            </template>
            <p v-else class="empty-state">尚无关联点位</p>
          </section>
        </div>
      </div>
    </dialog>

    <footer class="app-footer">
      <div class="player-stub" role="region" aria-label="播放器">
        <div class="player-track">
          <span class="player-title">{{ selectedTrack ? selectedTrack.title : '尚未选择曲目' }}</span>
          <span class="player-note">音源尚未接入</span>
        </div>
        <div class="player-controls">
          <button type="button" class="player-btn" disabled aria-label="上一首">⏮</button>
          <button type="button" class="player-btn" disabled aria-label="播放">▶</button>
          <button type="button" class="player-btn" disabled aria-label="下一首">⏭</button>
          <span class="player-time">--:--</span>
          <input type="range" class="player-progress" min="0" max="100" value="0" disabled aria-label="播放进度" />
          <span class="player-time">--:--</span>
          <input type="range" class="player-volume" min="0" max="100" value="80" disabled aria-label="音量" />
          <button type="button" class="player-btn" disabled aria-label="随机播放">⇄</button>
          <button type="button" class="player-btn" disabled aria-label="循环播放">↻</button>
        </div>
      </div>
      <p class="footer-note">地图数据来源：<a href="https://yuanshen.site" target="_blank" rel="noopener">空荧酒馆</a></p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Ref } from 'vue';
import MapCanvas from './components/MapCanvas.vue';
import { useExplorer } from './services/explorer';

const {
  loading, error, areas, areaOptions, areaCode, typeFilter, layerFilter, layerOptions, query,
  visibleAnchors, selectedAnchorId, selectedAnchor, highlightedIds, focusRequest, mapStatus,
  tracks, searchTracks, anchorTracks, selectedTrack, trackLocations, mapConfig, importMessage,
  load, selectArea, selectAnchor, selectTrack, locateTrack, importLibrary, associationStatus,
} = useExplorer();

type Tab = 'anchors' | 'tracks';
type Maybe<T> = T | null | undefined;

const panelCollapsed = ref(false);
const activeTab = ref<Tab>('anchors');
const showTrackDetail = ref(false);
const importError = ref('');
const anchorDialog = ref<HTMLDialogElement | null>(null);
const trackDialog = ref<HTMLDialogElement | null>(null);
let lastFocus: HTMLElement | null = null;
let suppressAnchorDialog = false;

const displayAnchors = computed(() => visibleAnchors.value.slice(0, 100));
const anchorCountText = computed(() => {
  const n = visibleAnchors.value.length;
  return n > 100 ? `当前共 ${n} 个点位，显示前 100 个` : `当前共 ${n} 个点位`;
});
const trackCountText = computed(() =>
  tracks.value.length ? `${searchTracks.value.length} / ${tracks.value.length} 首曲目` : '0 首曲目',
);

function areaLabel(area: { name: string; parentId?: Maybe<number> }): string {
  const parent = area.parentId ? areas.value.find((a) => a.id === area.parentId)?.name : undefined;
  return parent ? `${parent} · ${area.name}` : area.name;
}

function kindLabel(kind: string): string {
  if (kind === 'statue') return '神像';
  if (kind === 'waypoint') return '传送锚点';
  return '点位';
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

function formatDuration(seconds: Maybe<number>): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '未知';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function neteaseUrl(id: string | number): string {
  return `https://music.163.com/#/song?id=${encodeURIComponent(String(id))}`;
}

function rememberFocus(): void {
  const el = document.activeElement;
  if (el instanceof HTMLElement && !el.closest('dialog')) lastFocus = el;
}

function restoreFocus(): void {
  if (anchorDialog.value?.open || trackDialog.value?.open) return;
  const el = lastFocus;
  lastFocus = null;
  if (el && el.isConnected) el.focus();
}

async function openModal(dialog: Ref<HTMLDialogElement | null>): Promise<void> {
  rememberFocus();
  await nextTick();
  const el = dialog.value;
  if (el && !el.open) el.showModal();
}

function closeModal(dialog: Ref<HTMLDialogElement | null>): void {
  if (dialog.value?.open) dialog.value.close();
}

function closeAnchor(): void {
  closeModal(anchorDialog);
}

function closeTrack(): void {
  showTrackDetail.value = false;
}

watch(selectedAnchorId, (id) => {
  if (!id) {
    closeAnchor();
    return;
  }
  if (suppressAnchorDialog) {
    suppressAnchorDialog = false;
    return;
  }
  void openModal(anchorDialog);
});

watch(showTrackDetail, (visible) => {
  if (visible) void openModal(trackDialog);
  else closeModal(trackDialog);
});

function onAnchorDialogClose(): void {
  if (selectedAnchorId.value) selectedAnchorId.value = '';
  restoreFocus();
}

function onTrackDialogClose(): void {
  showTrackDetail.value = false;
  restoreFocus();
}

function openTrack(id: string): void {
  selectTrack(id);
  closeAnchor();
  showTrackDetail.value = true;
}

function locateAll(): void {
  locateTrack();
  closeTrack();
}

function locateAnchor(id: string): void {
  suppressAnchorDialog = true;
  closeTrack();
  selectAnchor(id);
  void nextTick(() => {
    suppressAnchorDialog = false;
  });
}

async function handleImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importError.value = '';
  try {
    await importLibrary(file);
  } catch (err) {
    importError.value = err instanceof Error ? `导入失败：${err.message}` : '导入失败：文件无法解析';
  } finally {
    input.value = '';
  }
}

void load();
</script>
