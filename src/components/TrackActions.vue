<template>
  <div class="track-actions" @keydown="handleKeydown">
    <UiButton
      :label="'播放此曲'"
      icon="play"
      @click="handlePlay"
    />
    <UiButton
      :label="'加入队列'"
      icon="queue"
      @click="handleQueue"
    />
    <UiButton
      :label="isFavorite ? '取消收藏' : '收藏'"
      icon="star"
      :pressed="isFavorite"
      @click="handleFavorite"
    />
    <div class="track-actions-playlist-wrapper">
      <UiButton
        :label="'添加到播放列表'"
        icon="plus"
        :aria-expanded="playlistMenuOpen" @click="playlistMenuOpen = !playlistMenuOpen"
      />
      <div v-if="playlistMenuOpen" class="track-actions-playlist-menu" role="menu">
        <div v-if="collectionState.playlists.length === 0" class="track-actions-menu-section">
          <button
            type="button"
            class="track-actions-menu-item"
            role="menuitem"
            @click="handleCreatePlaylist"
          >
            创建播放列表
          </button>
        </div>
        <div v-else class="track-actions-menu-section">
          <button
            v-for="playlist in collectionState.playlists"
            :key="playlist.id"
            type="button"
            class="track-actions-menu-item"
            role="menuitem"
            @click="handleAddToPlaylist(playlist.id, playlist.name)"
          >
            {{ playlist.name }}
          </button>
        </div>
        <div class="track-actions-menu-section">
          <button
            type="button"
            class="track-actions-menu-item"
            role="menuitem"
            @click="handleManagePlaylists"
          >
            管理播放列表
          </button>
        </div>
      </div>
    </div>
    <div v-if="feedbackMessage" class="track-actions-feedback" role="status" aria-live="polite">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onBeforeUnmount } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';
import UiButton from './UiButton.vue';

const props = defineProps<{
  track: MusicTrack;
  player: ReturnType<typeof useMusicPlayer>;
  collection: ReturnType<typeof useMusicCollection>;
  contextIds: string[];
}>();

const emit = defineEmits<{
  'open-library': [payload: { trackId: string }];
}>();

const playlistMenuOpen = ref(false);
const collectionState = reactive(props.collection);
const feedbackMessage = ref('');
let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
function handleKeydown(event:KeyboardEvent){if(event.key==='Escape'&&playlistMenuOpen.value){event.preventDefault();event.stopPropagation();playlistMenuOpen.value=false;(event.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-expanded]')?.focus();}}
watch(()=>props.track.id,()=>{playlistMenuOpen.value=false;feedbackMessage.value='';if(feedbackTimer)clearTimeout(feedbackTimer);});

const isFavorite = computed(() => props.collection.isFavorite(props.track.id));

function showFeedback(message: string): void {
  feedbackMessage.value = message;
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    feedbackMessage.value = '';
  }, 2000);
}

function handlePlay(): void {
  props.player.playTrack(props.track.id, props.contextIds);
}

function handleQueue(): void {
  props.player.enqueue(props.track.id);
  showFeedback(props.player.queueIds.value.includes(props.track.id)?'已加入队列':'队列已达上限');
}

function handleFavorite(): void {
  props.collection.toggleFavorite(props.track.id);
  showFeedback(props.collection.message.value);
}

function handleCreatePlaylist(): void {
  playlistMenuOpen.value = false;
  emit('open-library', { trackId: props.track.id });
}

function handleAddToPlaylist(playlistId: string, _playlistName: string): void {
  const success = props.collection.addToPlaylist(playlistId, props.track.id);
  if (success) {
    playlistMenuOpen.value = false;
  }
  showFeedback(props.collection.message.value);
}

function handleManagePlaylists(): void {
  playlistMenuOpen.value = false;
  emit('open-library', { trackId: props.track.id });
}

onBeforeUnmount(()=>{if(feedbackTimer)clearTimeout(feedbackTimer);});
</script>

<style scoped>
.track-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex-wrap: wrap;
  position: relative;
}

.track-actions-playlist-wrapper {
  position: relative;
}

.track-actions-playlist-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  min-width: 12rem;
  background: var(--color-bg-menu, #fff);
  border: 1px solid var(--color-border, #ccc);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 16rem;
  overflow-y: auto;
}

.track-actions-menu-section {
  padding: 0.25rem;
}

.track-actions-menu-section + .track-actions-menu-section {
  border-top: 1px solid var(--color-border, #ccc);
}

.track-actions-menu-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 2px;
  font-size: 0.875rem;
}

.track-actions-menu-item:hover {
  background: var(--color-bg-button-hover, #f5f5f5);
}

.track-actions-menu-item:focus-visible {
  outline: 2px solid var(--color-focus, #0066cc);
  outline-offset: -2px;
}

.track-actions-feedback {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-feedback, #333);
  color: var(--color-text-inverse, #fff);
  font-size: 0.75rem;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
}
</style>
