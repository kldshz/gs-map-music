<template>
  <div class="personal-library">
    <div class="library-tabs" role="group" aria-label="个人库切换">
      <button
        type="button"
        :class="['lib-tab-btn', { active: activeTab === 'favorites' }]"
        :aria-pressed="activeTab === 'favorites'"
        @click="activeTab = 'favorites'"
      >收藏 ({{ state.favorites.length }})</button>
      <button
        type="button"
        :class="['lib-tab-btn', { active: activeTab === 'playlists' }]"
        :aria-pressed="activeTab === 'playlists'"
        @click="activeTab = 'playlists'"
      >播放列表 ({{ state.playlists.length }})</button>
    </div>

    <div v-if="activeTab === 'favorites'" class="library-content">
      <p class="library-note">保存在此浏览器</p>
      <p v-if="state.message" class="library-message" role="status" aria-live="polite">{{ state.message }}</p>
      <p v-if="!state.favorites.length" class="library-empty">尚无收藏曲目</p>
      <ul v-else class="library-list">
        <li v-for="id in state.favorites" :key="id" class="library-item">
          <div v-if="getTrack(id)" class="library-track">
            <div class="library-track-info">
              <span class="library-track-title">{{ trackTitle(getTrack(id)!) }}</span>
              <span class="library-track-artist">{{ trackArtist(getTrack(id)!) }}</span>
            </div>
            <div class="library-track-actions">
              <button
                type="button"
                class="library-action-btn"
                aria-label="播放"
                @click="handlePlay(id, state.favorites)"
              >▶</button>
              <button
                type="button"
                class="library-action-btn"
                aria-label="加入队列"
                @click="handleEnqueue(id)"
              >+</button>
              <button
                type="button"
                class="library-action-btn remove-btn"
                aria-label="取消收藏"
                @click="state.toggleFavorite(id)"
              >×</button>
            </div>
          </div>
          <div v-else class="library-track-unavailable">
            <span class="unavailable-label">曲库中已不可用</span>
            <button
              type="button"
              class="library-action-btn remove-btn"
              aria-label="移除"
              @click="state.toggleFavorite(id)"
            >×</button>
          </div>
        </li>
      </ul>
    </div>

    <div v-else-if="activeTab === 'playlists'" class="library-content">
      <p class="library-note">保存在此浏览器</p>
      <p v-if="state.message" class="library-message" role="status" aria-live="polite">{{ state.message }}</p>
      <div class="playlist-create">
        <input
          v-model="newPlaylistName"
          type="text"
          class="playlist-name-input"
          placeholder="新建播放列表"
          maxlength="100"
          aria-label="新建播放列表名称"
          @keydown.enter="handleCreatePlaylist"
        />
        <button
          type="button"
          class="playlist-create-btn"
          :disabled="!newPlaylistName.trim()"
          aria-label="创建播放列表"
          @click="handleCreatePlaylist"
        >创建</button>
      </div>
      <p v-if="!state.playlists.length" class="library-empty">尚无播放列表</p>
      <ul v-else class="playlist-list">
        <li v-for="list in state.playlists" :key="list.id" class="playlist-item">
          <details class="playlist-details">
            <summary class="playlist-summary">
              <span class="playlist-name">{{ list.name }}</span>
              <span class="playlist-count">({{ list.trackIds.length }})</span>
            </summary>
            <div class="playlist-content">
              <div class="playlist-header-actions">
                <button
                  type="button"
                  class="playlist-action-btn"
                  :disabled="!list.trackIds.length"
                  aria-label="播放全部"
                  @click="handlePlayPlaylist(list.id)"
                >播放全部</button>
                <button
                  v-if="renamingPlaylistId !== list.id"
                  type="button"
                  class="playlist-action-btn"
                  aria-label="重命名"
                  @click="handleRenamePlaylist(list.id, list.name)"
                >重命名</button>
                <button
                  type="button"
                  class="playlist-action-btn delete-btn"
                  aria-label="删除播放列表"
                  @click="handleDeletePlaylist(list.id)"
                >删除</button>
              </div>
              <div v-if="renamingPlaylistId === list.id" class="playlist-rename-form">
                <input
                  v-model="renameInputValue"
                  type="text"
                  class="playlist-name-input"
                  maxlength="100"
                  aria-label="播放列表新名称"
                  @keydown.enter="handleSaveRename"
                  @keydown.escape="handleCancelRename"
                />
                <button
                  type="button"
                  class="playlist-action-btn"
                  aria-label="保存名称"
                  :disabled="!renameInputValue.trim()"
                  @click="handleSaveRename"
                >保存</button>
                <button
                  type="button"
                  class="playlist-action-btn"
                  aria-label="取消"
                  @click="handleCancelRename"
                >取消</button>
              </div>
              <p v-if="!list.trackIds.length" class="playlist-empty">播放列表为空</p>
              <ul v-else class="playlist-tracks">
                <li v-for="(trackId, idx) in list.trackIds" :key="trackId" class="playlist-track-item">
                  <div v-if="getTrack(trackId)" class="library-track">
                    <div class="library-track-info">
                      <span class="library-track-title">{{ trackTitle(getTrack(trackId)!) }}</span>
                      <span class="library-track-artist">{{ trackArtist(getTrack(trackId)!) }}</span>
                    </div>
                    <div class="library-track-actions">
                      <button
                        type="button"
                        class="library-action-btn"
                        :disabled="idx === 0"
                        aria-label="上移"
                        @click="state.movePlaylistTrack(list.id, trackId, -1)"
                      >↑</button>
                      <button
                        type="button"
                        class="library-action-btn"
                        :disabled="idx === list.trackIds.length - 1"
                        aria-label="下移"
                        @click="state.movePlaylistTrack(list.id, trackId, 1)"
                      >↓</button>
                      <button
                        type="button"
                        class="library-action-btn"
                        aria-label="播放"
                        @click="handlePlay(trackId, list.trackIds)"
                      >▶</button>
                      <button
                        type="button"
                        class="library-action-btn"
                        aria-label="加入队列"
                        @click="handleEnqueue(trackId)"
                      >+</button>
                      <button
                        type="button"
                        class="library-action-btn remove-btn"
                        aria-label="从列表移除"
                        @click="state.removeFromPlaylist(list.id, trackId)"
                      >×</button>
                    </div>
                  </div>
                  <div v-else class="library-track-unavailable">
                    <span class="unavailable-label">曲库中已不可用</span>
                    <button
                      type="button"
                      class="library-action-btn remove-btn"
                      aria-label="移除"
                      @click="state.removeFromPlaylist(list.id, trackId)"
                    >×</button>
                  </div>
                </li>
              </ul>
            </div>
          </details>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { MusicTrack } from '../domain/contracts';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';

const props = defineProps<{
  player: ReturnType<typeof useMusicPlayer>;
  collection: ReturnType<typeof useMusicCollection>;
  tracks: MusicTrack[];
}>();

const state = reactive(props.collection);
const playerState = reactive(props.player);
const activeTab = ref<'favorites' | 'playlists'>('favorites');
const newPlaylistName = ref('');
const renamingPlaylistId = ref<string | null>(null);
const renameInputValue = ref('');

function getTrack(id: string): MusicTrack | undefined {
  return props.tracks.find(t => t.id === id);
}

function trackTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

function trackArtist(track: MusicTrack): string {
  return track.artists.length ? track.artists.join('、') : '未知';
}

async function handlePlay(id: string, contextIds?: string[]): Promise<void> {
  await playerState.playTrack(id, contextIds);
}

function handleEnqueue(id: string): void {
  playerState.enqueue(id);
}

async function handlePlayPlaylist(listId: string): Promise<void> {
  const list = state.playlists.find(p => p.id === listId);
  if (!list || !list.trackIds.length) return;
  const validIds = list.trackIds.filter(id => props.tracks.some(t => t.id === id));
  if (!validIds.length) return;
  await playerState.playTrack(validIds[0], validIds);
}

async function handleCreatePlaylist(): Promise<void> {
  const name = newPlaylistName.value.trim();
  if (!name) return;
  const result = await state.createPlaylist(name);
  if (result) {
    newPlaylistName.value = '';
  }
}

function handleRenamePlaylist(listId: string, currentName: string): void {
  renamingPlaylistId.value = listId;
  renameInputValue.value = currentName;
}

function handleSaveRename(): void {
  const name = renameInputValue.value.trim();
  if (name && renamingPlaylistId.value) {
    if (!state.renamePlaylist(renamingPlaylistId.value, name)) return;
  }
  renamingPlaylistId.value = null;
  renameInputValue.value = '';
}

function handleCancelRename(): void {
  renamingPlaylistId.value = null;
  renameInputValue.value = '';
}

function handleDeletePlaylist(listId: string): void {
  state.deletePlaylist(listId);
}
</script>
