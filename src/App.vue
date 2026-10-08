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
          <button type="button" title="显示锚点与神像" :class="['filter-btn', { active: explorer.typeFilter.value === 'all' }]" :aria-pressed="explorer.typeFilter.value === 'all'" @click="explorer.typeFilter.value = 'all'">全部</button>
          <button type="button" title="仅显示传送锚点" :class="['filter-btn', { active: explorer.typeFilter.value === 'waypoint' }]" :aria-pressed="explorer.typeFilter.value === 'waypoint'" @click="explorer.typeFilter.value = 'waypoint'">锚点</button>
          <button type="button" title="仅显示神像" :class="['filter-btn', { active: explorer.typeFilter.value === 'statue' }]" :aria-pressed="explorer.typeFilter.value === 'statue'" @click="explorer.typeFilter.value = 'statue'">神像</button>
        </div>
        <input v-model="explorer.query.value" type="search" class="search-input" placeholder="搜索点位、曲目、专辑、地区或细分目录" aria-label="搜索点位、曲目、专辑、地区或细分目录" />
      </div>
    </header>

    <main class="app-main">
      <aside id="personal-library-sidebar" aria-label="个人音乐库" :class="['s4r-library-sidebar', { 's4r-library-open': panel.open.value }]" :inert="!panel.open.value || undefined" :aria-hidden="!panel.open.value">
        <div class="s4r-library-content">
          <PersonalLibrary
            :panel="panel"
            :player="player"
            :collection="collection"
            :tracks="explorer.tracks.value"
            @show-track="handleShowTrack"
          />
        </div>
      </aside>

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

      <aside :class="['side-panel', { collapsed: panelCollapsed }]" >
        <UiButton class="panel-toggle" aria-controls="side-panel-content" :aria-expanded="!panelCollapsed" :label="panelCollapsed ? '展开面板' : '收起面板'" :icon="panelCollapsed ? 'chevron-left' : 'chevron-right'" @click="toggleRightPanel" />
        <div id="side-panel-content" :inert="panelCollapsed || undefined" :aria-hidden="panelCollapsed" class="panel-content">
          <MusicSidebar ref="sidebar" :explorer="explorer" :player="player" :collection="collection" @open-library="handleOpenLibrary" />
          <label v-if="explorer.developmentMode" class="s4r-dev-edit-toggle">
            <input type="checkbox" :checked="explorer.editingEnabled.value" @change="handleEditToggle" />
            开发关联编辑
          </label>
        </div>
      </aside>
    </main>

    <footer class="app-footer">
      <PlayerBar :player="player" :collection="collection" :tracks="explorer.tracks.value" @show-track="handleShowTrack" />
      <UiButton
        class="s4r-library-toggle"
        aria-controls="personal-library-sidebar"
        :label="panel.open.value ? '收起个人库' : '展开个人库'"
        :pressed="panel.open.value"
        icon="library"
        @click="panel.toggle()"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick, onBeforeUnmount, onMounted } from 'vue';
import MapCanvas from './components/MapCanvas.vue';
import MusicSidebar from './components/MusicSidebar.vue';
import PlayerBar from './components/PlayerBar.vue';
import PersonalLibrary from './components/PersonalLibrary.vue';
import UiButton from './components/UiButton.vue';
import { useExplorer } from './services/explorer';
import { useMusicPlayer } from './services/music-player';
import { useMusicCollection } from './services/music-collection';
import { useLibraryPanel } from './services/library-panel';

type Maybe<T> = T | null | undefined;

const collection = useMusicCollection();
const explorer = useExplorer({ favorites: () => collection.favorites.value });
const player = useMusicPlayer(() => explorer.tracks.value);
const panel = useLibraryPanel(collection, () => explorer.tracks.value, player);

const panelCollapsed = ref(false);
const sidebar = ref<InstanceType<typeof MusicSidebar> | null>(null);

const panelState = reactive(panel);
function toggleRightPanel(){panelCollapsed.value=!panelCollapsed.value;if(!panelCollapsed.value&&window.innerWidth<=768)panel.close();}
watch(panel.open,async(open)=>{
  if(open&&window.innerWidth<=768)panelCollapsed.value=true;
  const focusInLibrary=document.activeElement?.closest('#personal-library-sidebar');
  await nextTick();
  if(open)document.querySelector<HTMLElement>('.s4r-library-title')?.focus();
  else if(focusInLibrary)document.querySelector<HTMLElement>('.s4r-library-toggle')?.focus();
});

function handleEditToggle(event: Event): void { explorer.setEditingEnabled((event.target as HTMLInputElement).checked); }

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && !e.defaultPrevented) {
    if (panelState.open) {
      panel.close();
    } else if (!panelCollapsed.value && window.innerWidth <= 768) {
      panelCollapsed.value = true;
      void nextTick(()=>document.querySelector<HTMLElement>('.panel-toggle')?.focus());
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  player.dispose();
  window.removeEventListener('keydown', handleKeydown);
});

function areaLabel(area: { name: string; parentId?: Maybe<number> }): string {
  const parent = area.parentId ? explorer.areas.value.find((a) => a.id === area.parentId)?.name : undefined;
  return parent ? `${parent} · ${area.name}` : area.name;
}

function handleMapSelect(anchorId: string): void {
  panelCollapsed.value = false;
  if(window.innerWidth <= 768) panel.close();
  void nextTick(() => sidebar.value?.showAnchor(anchorId));
}

function handleShowTrack(id: string): void {
  panelCollapsed.value = false;
  void nextTick(() => sidebar.value?.showTrack(id));
}

function handleOpenLibrary(payload: { trackId?: string }): void {
  panel.show('playlists', payload.trackId || '');
  if (window.innerWidth <= 768) {
    panelCollapsed.value = true;
  }
}

void explorer.load();
</script>
