<template>
  <div class="player-bar s4c-player" role="region" aria-label="播放器" :aria-busy="busy">
    <div class="s4c-player-grid">
      <div class="s4c-player-left">
        <div class="s4c-player-art" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 7v17M18 7l8-2v15M18 12l8-2" />
            <ellipse cx="14" cy="24" rx="4" ry="3" /><ellipse cx="22" cy="20" rx="4" ry="3" />
          </svg>
        </div>
        <button class="s4c-player-track" :disabled="!state.currentTrack" aria-label="查看当前曲目详情" :title="displayTitle" @click="showDetail">
          <span class="player-title">{{ displayTitle }}</span>
          <span class="s4c-player-artist" :title="displayArtist">{{ displayArtist || '地图里的旋律，随行而听' }}</span>
        </button>
        <UiButton :label="isFavorite ? '取消收藏当前曲目' : '收藏当前曲目'" icon="star" :pressed="isFavorite" :disabled="!state.currentTrack" @click="favorite" />
      </div>

      <div class="s4c-player-center">
        <div class="s4c-player-controls">
          <UiButton :label="state.shuffle ? '关闭随机播放' : '开启随机播放'" icon="shuffle" :pressed="state.shuffle" @click="state.toggleShuffle()" />
          <UiButton label="上一首" icon="previous" :disabled="!state.queueIds.length" @click="state.previous()" />
          <UiButton class="s4c-play-button" :class="{ 'is-loading': busy }" :label="wantsPause ? '暂停' : '播放'" :icon="wantsPause ? 'pause' : 'play'" :disabled="!state.currentId && !state.queueIds.length" @click="state.toggle()" />
          <UiButton label="下一首" icon="next" :disabled="!state.queueIds.length" @click="state.next()" />
          <UiButton :label="repeatLabel" :icon="state.repeat === 'one' ? 'repeat-one' : 'repeat'" :pressed="state.repeat !== 'off'" @click="state.cycleRepeat()" />
        </div>
        <div class="s4c-player-seek">
          <span class="s4c-player-time">{{ formatTime(state.position) }}</span>
          <input type="range" min="0" :max="state.duration || 0" step="0.1" :value="state.position" :disabled="!canSeek" :style="{ '--range-fill': progressFill }" aria-label="播放进度" :aria-valuetext="`${formatTime(state.position)} / ${formatTime(state.duration)}`" @input="seek" />
          <span class="s4c-player-time">{{ state.duration > 0 ? formatTime(state.duration) : '--:--' }}</span>
        </div>
      </div>

      <div class="s4c-player-right">
        <UiButton class="s4c-queue-toggle" :label="queueOpen ? '收起队列' : '展开队列'" icon="queue" :pressed="queueOpen" :aria-expanded="queueOpen" aria-controls="playback-queue" @click="emit('toggle-queue')" />
        <div class="s4c-player-volume-control">
          <UiButton :label="state.volume === 0 ? '取消静音' : '静音'" :icon="state.volume === 0 ? 'mute' : 'volume'" :pressed="state.volume === 0" @click="state.toggleMute()" />
          <input type="range" min="0" max="100" :value="Math.round(state.volume * 100)" :style="{ '--range-fill': `${state.volume * 100}%` }" aria-label="音量" @input="volume" />
        </div>
      </div>
    </div>
    <span v-if="normalFeedback" class="s4c-player-feedback sr-only" role="status">{{ normalFeedback }}</span>
    <div v-if="errorMessage" class="player-status" role="alert">{{ errorMessage }}</div>
    <div v-if="state.storageMessage" class="s4c-player-storage-error" role="alert">{{ state.storageMessage }}</div>
    <div v-if="collectionError" class="s4c-player-storage-error" role="alert">{{ collectionError }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';
import UiButton from './UiButton.vue';

const props = defineProps<{
  player: ReturnType<typeof useMusicPlayer>;
  collection: ReturnType<typeof useMusicCollection>;
  tracks: MusicTrack[];
  queueOpen: boolean;
}>();
const emit = defineEmits<{ 'show-track': [id: string]; 'toggle-queue': [] }>();
const state = reactive(props.player);
const collection = reactive(props.collection);
const busy = computed(() => state.status === 'resolving' || state.status === 'loading');
const wantsPause = computed(() => state.playing || busy.value);
const canSeek = computed(() => state.duration > 0 && !['error', 'unavailable'].includes(state.status));
const displayTitle = computed(() => {
  const track = state.currentTrack;
  return track ? (track.sceneInfo ? `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}` : track.title) : '尚未选择曲目';
});
const displayArtist = computed(() => state.currentTrack?.artists.join('、') || '');
const isFavorite = computed(() => collection.isFavorite(state.currentId));
const repeatLabel = computed(() => state.repeat === 'all' ? '列表循环' : state.repeat === 'one' ? '单曲循环' : '关闭循环');
const errorMessage = computed(() => ['error', 'unavailable', 'blocked'].includes(state.status) ? state.message : '');
const normalFeedback = computed(() => busy.value || state.message.startsWith('已恢复') ? state.message : '');
const collectionError = computed(() => /失败|无法|损坏|阻止|上限/.test(collection.message) ? collection.message : '');
const progressFill = computed(() => `${state.duration > 0 ? Math.min(100, state.position / state.duration * 100) : 0}%`);

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function seek(event: Event) { state.seek(Number((event.target as HTMLInputElement).value)); }
function volume(event: Event) { state.setVolume(Number((event.target as HTMLInputElement).value) / 100); }
function favorite() { if (state.currentTrack) collection.toggleFavorite(state.currentId); }
function showDetail() { if (state.currentTrack) emit('show-track', state.currentId); }
</script>
