<template>
  <div class="player-bar" role="region" aria-label="播放器">
    <div class="player-track">
      <span class="player-title">{{ displayTitle }}</span>
      <span class="player-status" role="status" aria-live="polite">{{ statusMessage }}</span>
    </div>
    <div class="player-controls">
      <button
        type="button"
        class="player-btn"
        :disabled="!canSkip"
        aria-label="上一首"
        @click="handlePrevious"
      >⏮</button>
      <button
        type="button"
        class="player-btn play-btn"
        :disabled="!canToggle"
        :aria-label="wantsPause ? '暂停' : '播放'"
        @click="handleToggle"
      >{{ wantsPause ? '⏸' : '▶' }}</button>
      <button
        type="button"
        class="player-btn"
        :disabled="!canSkip"
        aria-label="下一首"
        @click="handleNext"
      >⏭</button>
      <span class="player-time">{{ formatTime(state.position) }}</span>
      <input
        type="range"
        class="player-progress"
        :min="0"
        :max="progressMax"
        :value="state.position"
        :disabled="!canSeek"
        aria-label="播放进度"
        @input="handleSeek"
      />
      <span class="player-time">{{ state.duration > 0 ? formatTime(state.duration) : '--:--' }}</span>
      <input
        type="range"
        class="player-volume"
        :min="0"
        :max="100"
        :value="Math.round(state.volume * 100)"
        aria-label="音量"
        @input="handleVolume"
      />
      <button
        type="button"
        class="player-btn"
        :aria-label="state.shuffle ? '关闭随机播放' : '开启随机播放'"
        :aria-pressed="state.shuffle"
        @click="handleShuffle"
      >⇄</button>
      <button
        type="button"
        class="player-btn"
        :aria-label="repeatLabel"
        :aria-pressed="state.repeat !== 'off'"
        @click="handleRepeat"
      >{{ repeatIcon }}</button>
    </div>
    <div class="player-actions">
      <button
        type="button"
        class="action-btn"
        :disabled="!state.currentId"
        :aria-pressed="isFavorite"
        :aria-label="isFavorite ? '取消收藏' : '收藏当前曲目'"
        @click="handleFavorite"
      >{{ isFavorite ? '★' : '☆' }}</button>
      <button
        type="button"
        class="action-btn queue-btn"
        :aria-label="queueOpen ? '收起队列' : '展开队列'"
        :aria-expanded="queueOpen"
        @click="queueOpen = !queueOpen"
      >队列 ({{ state.queueIds.length }})</button>
      <button
        type="button"
        class="action-btn"
        :disabled="!state.currentTrack"
        aria-label="查看当前曲目详情"
        @click="handleShowDetail"
      >详情</button>
    </div>

    <details v-if="queueOpen" class="queue-panel" open>
      <summary class="queue-summary">播放队列</summary>
      <div class="queue-content">
        <div v-if="state.currentTrack" class="queue-current">
          <span class="queue-label">{{ state.playing ? '正在播放' : '当前曲目' }}</span>
          <div class="queue-track-info">
            <span class="queue-track-title">{{ trackTitle(state.currentTrack) }}</span>
            <span class="queue-track-artist">{{ trackArtist(state.currentTrack) }}</span>
          </div>
        </div>
        <div v-if="state.queueIds.length" class="queue-list-container">
          <div class="queue-header">
            <span class="queue-label">队列顺序 ({{ state.queueIds.length }})</span>
            <button
              type="button"
              class="queue-clear-btn"
              :disabled="!state.queueIds.length"
              aria-label="清空队列"
              @click="handleClearQueue"
            >清空</button>
          </div>
          <ul class="queue-list">
            <li v-for="(entry, idx) in queueTracks" :key="entry.id" class="queue-item" :aria-current="state.currentId === entry.id ? 'true' : undefined">
              <div class="queue-track-info">
                <span class="queue-track-title">{{ entry.track ? trackTitle(entry.track) : '曲库中已不可用' }}</span>
                <span class="queue-track-artist">{{ entry.track ? trackArtist(entry.track) : entry.id }}</span>
              </div>
              <div class="queue-item-actions">
                <button type="button" class="queue-move-btn" :disabled="!entry.track" aria-label="播放队列曲目" @click="state.playTrack(entry.id, state.queueIds)">▶</button>
                <button
                  type="button"
                  class="queue-move-btn"
                  :disabled="idx === 0"
                  aria-label="上移"
                  @click="handleMoveUp(entry.id)"
                >↑</button>
                <button
                  type="button"
                  class="queue-move-btn"
                  :disabled="idx === queueTracks.length - 1"
                  aria-label="下移"
                  @click="handleMoveDown(entry.id)"
                >↓</button>
                <button
                  type="button"
                  class="queue-remove-btn"
                  aria-label="移除"
                  @click="handleRemoveFromQueue(entry.id)"
                >×</button>
              </div>
            </li>
          </ul>
        </div>
        <p v-else class="queue-empty">队列为空</p>
      </div>
    </details>
    <p v-if="state.storageMessage" class="player-save-message" role="status">{{ state.storageMessage }}</p>
    <p v-if="collectionState.message" class="player-save-message" role="status">{{ collectionState.message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';

const props = defineProps<{
  player: ReturnType<typeof useMusicPlayer>;
  collection: ReturnType<typeof useMusicCollection>;
  tracks: MusicTrack[];
}>();

const emit = defineEmits<{
  'show-track': [id: string];
}>();

const state = reactive(props.player);
const collectionState = reactive(props.collection);
const queueOpen = ref(false);

const displayTitle = computed(() => {
  if (!state.currentTrack) return '尚未选择曲目';
  return trackTitle(state.currentTrack);
});

const statusMessage = computed(() => state.message);
const wantsPause=computed(()=>state.playing||state.status==='resolving'||state.status==='loading');

const canToggle = computed(() => {
  return !!state.currentId || state.queueIds.length > 0;
});

const canSkip = computed(() => {
  return state.queueIds.length > 0;
});

const canSeek = computed(() => {
  return state.duration > 0 && !['error','unavailable'].includes(state.status);
});

const progressMax = computed(() => {
  return state.duration > 0 ? state.duration : 0;
});

const repeatLabel = computed(() => {
  if (state.repeat === 'all') return '列表循环';
  if (state.repeat === 'one') return '单曲循环';
  return '关闭循环';
});

const repeatIcon = computed(() => {
  if (state.repeat === 'all') return '🔁';
  if (state.repeat === 'one') return '🔂';
  return '↻';
});

const isFavorite = computed(() => {
  return state.currentId ? collectionState.isFavorite(state.currentId) : false;
});

const queueTracks = computed(() => {
  return state.queueIds
    .map(id => ({id,track:props.tracks.find(t => t.id === id)}));
});

function trackTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

function trackArtist(track: MusicTrack): string {
  return track.artists.length ? track.artists.join('、') : '未知';
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function handleToggle(): Promise<void> {
  await state.toggle();
}

async function handlePrevious(): Promise<void> {
  await state.previous();
}

async function handleNext(): Promise<void> {
  await state.next();
}

function handleSeek(event: Event): void {
  const input = event.target as HTMLInputElement;
  state.seek(parseFloat(input.value));
}

function handleVolume(event: Event): void {
  const input = event.target as HTMLInputElement;
  state.setVolume(parseInt(input.value, 10) / 100);
}

function handleShuffle(): void {
  state.toggleShuffle();
}

function handleRepeat(): void {
  state.cycleRepeat();
}

function handleFavorite(): void {
  if (state.currentId) {
    collectionState.toggleFavorite(state.currentId);
  }
}

function handleShowDetail(): void {
  if (state.currentTrack) {
    emit('show-track', state.currentTrack.id);
  }
}

function handleMoveUp(id: string): void {
  state.moveInQueue(id, -1);
}

function handleMoveDown(id: string): void {
  state.moveInQueue(id, 1);
}

function handleRemoveFromQueue(id: string): void {
  state.removeFromQueue(id);
}

function handleClearQueue(): void {
  state.clearQueue();
}
</script>
