<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { MusicTrack } from '../domain/contracts'
import type { useMusicPlayer } from '../services/music-player'
import UiButton from './UiButton.vue'

const props = defineProps<{
  player: ReturnType<typeof useMusicPlayer>
  tracks: MusicTrack[]
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

// reactive 包装 player 后顶层 ref 自动解包，直接读 state.currentId / state.queueIds
const state = reactive(props.player)

const trackMap = computed(() => {
  const map = new Map<string, MusicTrack>()
  for (const track of props.tracks) map.set(track.id, track)
  return map
})

const queue = computed(() =>
  state.queueIds.map((id) => ({ id, track: trackMap.value.get(id) ?? null })),
)

const titleOf = (track: MusicTrack) =>
  track.sceneInfo ? `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}` : track.title

function play(id: string) {
  if (!trackMap.value.has(id)) return
  props.player.playTrack(id, [...state.queueIds])
}

function move(id: string, step: -1 | 1) {
  props.player.moveInQueue(id, step)
}

function remove(id: string) {
  props.player.removeFromQueue(id)
}

function clear() {
  props.player.clearQueue()
}
</script>

<template>
  <section id="playback-queue" class="playback-queue" role="region" aria-label="播放队列">
    <header class="s4c-queue-header">
      <h2 class="s4c-queue-title" tabindex="-1">播放队列</h2>
      <UiButton label="收起队列" icon="close" @click="emit('close')" />
    </header>

    <div class="s4c-queue-scroll">
      <div v-if="state.currentTrack && !state.queueIds.includes(state.currentId)" class="s4c-queue-item is-current">
        <p class="s4c-queue-name" :title="titleOf(state.currentTrack)">{{ titleOf(state.currentTrack) }}</p>
        <p class="s4c-queue-artist">{{ state.currentTrack.artists.join('、') }}</p>
        <p class="s4c-queue-flag">{{ state.playing ? '正在播放' : '当前曲目' }}</p>
      </div>
      <p v-if="!queue.length" class="s4c-queue-empty">队列为空</p>
      <ul v-else class="s4c-queue-list">
        <li
          v-for="(item, index) in queue"
          :key="item.id"
          class="s4c-queue-item"
          :class="{ 'is-current': item.id === state.currentId, 'is-missing': !item.track }"
          :aria-current="item.id === state.currentId ? 'true' : undefined"
        >
          <div class="s4c-queue-meta">
            <p class="s4c-queue-name" :title="item.track ? titleOf(item.track) : item.id">
              {{ item.track ? titleOf(item.track) : '曲库中已不可用' }}
            </p>
            <p class="s4c-queue-artist">
              {{ item.track ? item.track.artists.join('、') : item.id }}
            </p>
            <p v-if="item.id === state.currentId" class="s4c-queue-flag">
              {{ state.playing ? '正在播放' : '当前曲目' }}
            </p>
          </div>
          <div class="s4c-queue-actions">
            <UiButton label="播放队列曲目" icon="play" :disabled="!item.track" @click="play(item.id)" />
            <UiButton label="上移" icon="arrow-up" :disabled="index === 0" @click="move(item.id, -1)" />
            <UiButton label="下移" icon="arrow-down" :disabled="index === queue.length - 1" @click="move(item.id, 1)" />
            <UiButton label="移除" icon="close" @click="remove(item.id)" />
          </div>
        </li>
      </ul>
      <div class="s4c-queue-footer">
        <UiButton label="清空队列" text="清空" :disabled="!queue.length" @click="clear" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.playback-queue {
  --paper: #f4efe6; --paper-2: #ebe3d5; --ink: #2f3545; --ink-soft: #5b6375;
  --slate: #3b4255; --gold: #c8ad7f; --gold-soft: #e6d3ad; --gold-line: rgba(200, 173, 127, 0.5);
  height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;
  background: var(--paper); color: var(--ink); font-size: 13px; line-height: 1.4;
}
.s4c-queue-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 6px 6px 14px; border-bottom: 1px solid var(--gold-line);
}
.s4c-queue-title { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: var(--slate); }
.s4c-queue-title:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.s4c-queue-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 6px 6px 10px; }
.s4c-queue-list { margin: 0; padding: 0; list-style: none; }
.s4c-queue-item {
  position: relative; padding: 8px 6px 6px 12px; border-radius: 6px;
  transition: background-color 140ms ease;
}
.s4c-queue-item::before {
  content: ''; position: absolute; left: 2px; top: 8px; bottom: 8px; width: 2px; border-radius: 2px;
}
.s4c-queue-item:hover { background: var(--paper-2); }
.s4c-queue-item.is-current::before { background: var(--gold); }
.s4c-queue-item.is-current .s4c-queue-name { color: var(--slate); font-weight: 600; }
.s4c-queue-item.is-missing { opacity: 0.62; }
.s4c-queue-meta { min-width: 0; }
.s4c-queue-name { margin: 0; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s4c-queue-artist,
.s4c-queue-flag {
  margin: 0; font-size: 11px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.s4c-queue-flag { color: var(--ink-soft); }
.s4c-queue-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-top: 2px; }
.s4c-queue-actions :deep(button) { padding: 4px 6px; border: 0; background: transparent; box-shadow: none; color: var(--ink-soft); }
.s4c-queue-actions :deep(button:hover:not(:disabled)) { background: var(--gold-soft); color: var(--slate); }
.s4c-queue-actions :deep(button:focus-visible) { outline: 2px solid var(--gold); outline-offset: 1px; }
.s4c-queue-actions :deep(button:disabled) { opacity: 0.4; }
.s4c-queue-empty { margin: 16px 6px; font-size: 12px; color: var(--ink-soft); text-align: center; }
.s4c-queue-footer { display: flex; justify-content: flex-end; padding: 4px 6px 0; }
@media (max-width: 380px) { .s4c-queue-item { padding: 8px 4px 6px 10px; } .s4c-queue-actions { gap: 0; } }
@media (prefers-reduced-motion: reduce) { .s4c-queue-item { transition: none; } }
</style>
