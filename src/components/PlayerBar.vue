<template>
  <div class="player-bar" role="region" aria-label="播放器">
    <div class="s4r-player-grid">
      <div class="s4r-player-left">
        <div class="player-track">
          <span class="player-title">{{ displayTitle }}</span>
          <span v-if="displayArtist" class="s4r-player-artist">{{ displayArtist }}</span>
        </div>
      </div>

      <div class="s4r-player-center">
        <div class="s4r-player-controls-row">
          <UiButton
            label="上一首"
            icon="previous"
            :disabled="!canSkip"
            @click="handlePrevious"
          />
          <UiButton
            :label="wantsPause ? '暂停' : '播放'"
            :icon="wantsPause ? 'pause' : 'play'"
            :disabled="!canToggle"
            class="s4r-play-button"
            @click="handleToggle"
          />
          <UiButton
            label="下一首"
            icon="next"
            :disabled="!canSkip"
            @click="handleNext"
          />
        </div>
      </div>

      <div class="s4r-player-right">
        <UiButton
          :label="isFavorite ? '取消收藏当前曲目' : '收藏当前曲目'"
          icon="star"
          :pressed="isFavorite"
          :disabled="!state.currentId"
          @click="handleFavorite"
        />
        <UiButton
          :label="queueOpen ? '收起队列' : '展开队列'"
          icon="queue"
          :text="String(state.queueIds.length)"
          :pressed="queueOpen"
          @click="queueOpen = !queueOpen"
        />
        <UiButton
          label="查看当前曲目详情"
          icon="info"
          :disabled="!state.currentTrack"
          @click="handleShowDetail"
        />
      </div>

      <div class="s4r-player-seek-row">
        <span class="s4r-player-time">{{ formatTime(state.position) }}</span>
        <input
          type="range"
          class="s4r-player-progress"
          :min="0"
          :max="progressMax"
          :value="state.position"
          :disabled="!canSeek"
          aria-label="播放进度"
          @input="handleSeek"
        />
        <span class="s4r-player-time">{{ state.duration > 0 ? formatTime(state.duration) : '--:--' }}</span>
      </div>

      <div class="s4r-player-secondary">
        <div class="s4r-player-modes">
          <UiButton
            :label="state.shuffle ? '关闭随机播放' : '开启随机播放'"
            icon="shuffle"
            :pressed="state.shuffle"
            @click="handleShuffle"
          />
          <UiButton
            :label="repeatLabel"
            :icon="state.repeat === 'one' ? 'repeat-one' : 'repeat'"
            :pressed="state.repeat !== 'off'"
            @click="handleRepeat"
          />
        </div>
        <div class="s4r-player-volume-control">
          <UiIcon name="volume" />
          <input
            type="range"
            class="s4r-player-volume"
            :min="0"
            :max="100"
            :value="Math.round(state.volume * 100)"
            aria-label="音量"
            @input="handleVolume"
          />
        </div>
      </div>
    </div>

    <div v-if="visibleStatusMessage" class="player-status" role="alert" aria-live="assertive">
      {{ visibleStatusMessage }}
    </div>

    <div v-if="queueOpen" class="queue-panel s4r-queue-panel">
      <div class="s4r-queue-header">
        <h3 class="s4r-queue-title">播放队列</h3>
        <UiButton
          label="收起队列"
          icon="close"
          @click="queueOpen = false"
        />
      </div>

      <div class="queue-content">
        <div v-if="state.currentTrack" class="s4r-queue-current">
          <span class="s4r-queue-label">{{ state.playing ? '正在播放' : '当前曲目' }}</span>
          <div class="s4r-queue-track-info">
            <span class="s4r-queue-track-title">{{ trackTitle(state.currentTrack) }}</span>
            <span class="s4r-queue-track-artist">{{ trackArtist(state.currentTrack) }}</span>
          </div>
        </div>

        <div v-if="state.queueIds.length" class="s4r-queue-list-container">
          <div class="s4r-queue-list-header">
            <span class="s4r-queue-label">队列顺序 ({{ state.queueIds.length }})</span>
            <UiButton
              label="清空队列"
              icon="trash"
              text="清空"
              :disabled="!state.queueIds.length"
              @click="handleClearQueue"
            />
          </div>

          <ul class="s4r-queue-list">
            <li
              v-for="(entry, idx) in queueTracks"
              :key="entry.id"
              class="s4r-queue-item"
              :class="{ 's4r-queue-item-current': state.currentId === entry.id }"
            >
              <div class="s4r-queue-track-info">
                <span class="s4r-queue-track-title">
                  {{ entry.track ? trackTitle(entry.track) : '曲库中已不可用' }}
                </span>
                <span class="s4r-queue-track-artist">
                  {{ entry.track ? trackArtist(entry.track) : entry.id }}
                </span>
              </div>
              <div class="s4r-queue-item-actions">
                <UiButton
                  label="播放队列曲目"
                  icon="play"
                  :disabled="!entry.track"
                  @click="state.playTrack(entry.id, state.queueIds)"
                />
                <UiButton
                  label="上移"
                  icon="arrow-up"
                  :disabled="idx === 0"
                  @click="handleMoveUp(entry.id)"
                />
                <UiButton
                  label="下移"
                  icon="arrow-down"
                  :disabled="idx === queueTracks.length - 1"
                  @click="handleMoveDown(entry.id)"
                />
                <UiButton
                  label="移除"
                  icon="close"
                  @click="handleRemoveFromQueue(entry.id)"
                />
              </div>
            </li>
          </ul>
        </div>
        <p v-else class="s4r-queue-empty">队列为空</p>
      </div>
    </div>

    <div v-if="state.storageMessage" class="player-save-message" role="status" aria-live="polite">
      {{ state.storageMessage }}
    </div>
    <div v-if="collectionState.message && /失败|无法|损坏|阻止|上限/.test(collectionState.message)" class="player-save-message" role="alert">
      {{ collectionState.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';
import UiButton from './UiButton.vue';
import UiIcon from './UiIcon.vue';

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

const displayArtist = computed(() => {
  if (!state.currentTrack) return '';
  return trackArtist(state.currentTrack);
});

const visibleStatusMessage = computed(() => {
  if (!state.message) return '';
  const status = state.status;
  if (status === 'error' || status === 'unavailable' || status === 'blocked') {
    return state.message;
  }
  if (status === 'resolving' || status === 'loading' || state.message.startsWith('已恢复')) {
    return state.message;
  }
  return '';
});

const wantsPause = computed(() =>
  state.playing || state.status === 'resolving' || state.status === 'loading'
);

const canToggle = computed(() => !!state.currentId || state.queueIds.length > 0);
const canSkip = computed(() => state.queueIds.length > 0);
const canSeek = computed(() =>
  state.duration > 0 && !['error', 'unavailable'].includes(state.status)
);
const progressMax = computed(() => state.duration > 0 ? state.duration : 0);

const repeatLabel = computed(() => {
  if (state.repeat === 'all') return '列表循环';
  if (state.repeat === 'one') return '单曲循环';
  return '关闭循环';
});

const isFavorite = computed(() =>
  state.currentId ? collectionState.isFavorite(state.currentId) : false
);

const queueTracks = computed(() =>
  state.queueIds.map(id => ({ id, track: props.tracks.find(t => t.id === id) }))
);

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
