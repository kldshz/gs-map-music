<template>
  <div class="track-actions">
    <UiButton label="播放此曲" icon="play" @click="player.playTrack(track.id, contextIds)" />
    <UiButton label="加入队列" icon="queue" @click="enqueue" />
    <span v-if="feedback" class="track-actions-feedback" role="status" aria-live="polite">{{ feedback }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import UiButton from './UiButton.vue';

const props = defineProps<{ track: MusicTrack; player: ReturnType<typeof useMusicPlayer>; contextIds: string[] }>();
const feedback = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
function resetFeedback() { clearTimeout(timer); feedback.value = ''; }
function enqueue() {
  props.player.enqueue(props.track.id);
  feedback.value = props.player.queueIds.value.includes(props.track.id) ? '已加入队列' : '队列已达上限';
  clearTimeout(timer);
  timer = setTimeout(resetFeedback, 2000);
}
watch(() => props.track.id, resetFeedback);
onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.track-actions { display: flex; gap: .25rem; align-items: center; flex-wrap: wrap; }
.track-actions-feedback { width: 100%; font-size: .75rem; color: var(--ink-soft); }
</style>
