<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">原神锚点音乐库</h1>
      <div class="header-controls">
        <select v-model="explorer.areaCode.value" class="area-select" aria-label="选择地区" @change="explorer.selectArea(explorer.areaCode.value)">
          <option v-for="area in explorer.areaOptions.value" :key="area.code" :value="area.code">{{ areaLabel(area) }}</option>
        </select>
        <select v-model="explorer.layerFilter.value" class="area-select layer-select" aria-label="地图分层">
          <option v-for="opt in explorer.layerOptions.value" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="type-filter" role="group" aria-label="点位类型">
          <button type="button" :class="['filter-btn', { active: explorer.typeFilter.value === 'all' }]" :aria-pressed="explorer.typeFilter.value === 'all'" @click="explorer.typeFilter.value = 'all'">全部</button>
          <button type="button" :class="['filter-btn', { active: explorer.typeFilter.value === 'waypoint' }]" :aria-pressed="explorer.typeFilter.value === 'waypoint'" @click="explorer.typeFilter.value = 'waypoint'">锚点</button>
          <button type="button" :class="['filter-btn', { active: explorer.typeFilter.value === 'statue' }]" :aria-pressed="explorer.typeFilter.value === 'statue'" @click="explorer.typeFilter.value = 'statue'">神像</button>
        </div>
        <input v-model="explorer.query.value" type="search" class="search-input" placeholder="搜索点位、曲目、专辑、地区、细分目录或个人评价" aria-label="搜索点位、曲目、专辑、地区、细分目录或个人评价" />
      </div>
    </header>

    <main class="app-main">
      <div class="map-container">
        <MapCanvas
          class="map-canvas"
          :config="explorer.mapConfig.value"
          :anchors="explorer.visibleAnchors.value"
          :selected-id="explorer.selectedAnchorId.value"
          :highlighted-ids="explorer.highlightedIds.value"
          :focus-request="explorer.focusRequest.value"
          :layer-filter="explorer.layerFilter.value"
          @select="handleMapSelect"
          @status="explorer.mapStatus.value = $event"
        />
        <div v-if="explorer.loading.value" class="map-overlay" role="status">加载中...</div>
        <div v-if="explorer.error.value" class="map-overlay error" role="alert">
          <p>{{ explorer.error.value }}</p>
          <button type="button" class="retry-btn" @click="explorer.load()">重试加载</button>
        </div>
        <div v-if="explorer.mapStatus.value" class="map-status" role="status" aria-live="polite">{{ explorer.mapStatus.value }}</div>
      </div>

      <aside :class="['side-panel', { collapsed: panelCollapsed }]">
        <button type="button" class="panel-toggle" aria-controls="side-panel-content" :aria-expanded="!panelCollapsed" :aria-label="panelCollapsed ? '展开面板' : '收起面板'" @click="panelCollapsed = !panelCollapsed">
          {{ panelCollapsed ? '◀' : '▶' }}
        </button>
        <div v-show="!panelCollapsed" id="side-panel-content" class="panel-content">
          <MusicSidebar ref="sidebar" :explorer="explorer" />

          <section class="import-section" aria-labelledby="import-title">
            <h3 id="import-title">导入音乐库</h3>
            <p class="import-hint">曲目与关联JSON；仅元数据，不含音频文件。仅本次会话有效。</p>
            <label class="import-label">
              <input type="file" accept="application/json,.json" class="import-input" @change="handleImport" />
              <span class="import-btn">{{ explorer.tracks.value.length ? '替换导入' : '选择文件' }}</span>
            </label>
            <p v-if="explorer.importMessage.value" class="import-message" role="status" aria-live="polite">{{ explorer.importMessage.value }}</p>
            <p v-if="importError" class="import-message error" role="alert">{{ importError }}</p>
          </section>
        </div>
      </aside>
    </main>

    <footer class="app-footer">
      <div class="player-stub" role="region" aria-label="播放器">
        <div class="player-track">
          <span class="player-title">{{ explorer.selectedTrack.value ? trackDisplayTitle(explorer.selectedTrack.value) : '尚未选择曲目' }}</span>
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
import { ref, nextTick } from 'vue';
import MapCanvas from './components/MapCanvas.vue';
import MusicSidebar from './components/MusicSidebar.vue';
import { useExplorer } from './services/explorer';
import type { MusicTrack } from './domain/contracts';

type Maybe<T> = T | null | undefined;

const explorer = useExplorer();
const panelCollapsed = ref(false);
const sidebar = ref<InstanceType<typeof MusicSidebar> | null>(null);
const importError = ref('');

function areaLabel(area: { name: string; parentId?: Maybe<number> }): string {
  const parent = area.parentId ? explorer.areas.value.find((a) => a.id === area.parentId)?.name : undefined;
  return parent ? `${parent} · ${area.name}` : area.name;
}

function trackDisplayTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

async function handleImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importError.value = '';
  try {
    await explorer.importLibrary(file);
  } catch (err) {
    importError.value = err instanceof Error ? `导入失败：${err.message}` : '导入失败：文件无法解析';
  } finally {
    input.value = '';
  }
}

function handleMapSelect(anchorId: string): void {
  panelCollapsed.value = false;
  void nextTick(() => sidebar.value?.showAnchor(anchorId));
}

void explorer.load();
</script>
