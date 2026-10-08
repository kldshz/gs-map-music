<template>
  <div class="personal-library">
    <header class="s4r-library-header">
      <h2 class="s4r-library-title" tabindex="-1">个人库</h2>
      <UiButton
        class="s4r-library-close"
        :label="'收起个人库'"
        @click="state.close()"
       icon="close" />
    </header>

    <div class="s4r-library-tabs" role="group" aria-label="个人库切换">
      <button
        type="button"

        :aria-pressed="state.tab === 'favorites'"
        :class="['s4r-tab-btn', { active: state.tab === 'favorites' }]"
        title="检索并播放收藏歌曲" @click="state.tab = 'favorites'"
      >
        收藏 ({{ state.favoriteIds.length }})
      </button>
      <button
        type="button"

        :aria-pressed="state.tab === 'playlists'"
        :class="['s4r-tab-btn', { active: state.tab === 'playlists' }]"
        title="创建与管理自己的歌单" @click="state.tab = 'playlists'"
      >
        播放列表 ({{ collection.playlists.length }})
      </button>
    </div>

    <p class="s4r-library-note">播放列表就是你整理的歌单，仅在此浏览器保存。</p>
    <div class="s4r-library-body">
      <p v-if="collection.message" class="s4r-library-message" role="status" aria-live="polite">{{ collection.message }}</p>

      <div v-if="state.tab === 'favorites'" class="s4r-favorites-view">
        <div class="s4r-search-box">
          <input
            v-model="state.query"
            type="search"
            class="s4r-search-input"
            placeholder="搜索收藏"
            aria-label="搜索收藏"
          />
        </div>
        <p v-if="!collection.favorites.length" class="s4r-empty-state">尚无收藏曲目</p>
        <p v-else-if="!state.favoriteIds.length" class="s4r-empty-state">无匹配结果</p>
        <div v-else class="s4r-track-list">
          <UiButton
            v-if="state.favoriteIds.length > 1"
            class="s4r-play-all"
            label="播放全部收藏"
            icon="play"
            @click="state.playAll()"
          />
          <div v-for="id in state.favoriteIds" :key="id" class="s4r-track-item">
            <div v-if="state.trackMap.has(id)" class="s4r-track-content">
              <div class="s4r-track-info">
                <span class="s4r-track-title">{{ trackTitle(state.trackMap.get(id)!) }}</span>
                <span class="s4r-track-artist">{{ trackArtist(state.trackMap.get(id)!) }}</span>
              </div>
              <div class="s4r-track-actions">
                <TrackActions :track="state.trackMap.get(id)!" :player="props.player" :collection="props.collection" :context-ids="state.favoriteIds" @open-library="state.show('playlists', $event.trackId)" />
                <UiButton label="查看曲目详情" icon="info" @click="$emit('show-track', id)" />

              </div>
            </div>
            <div v-else class="s4r-track-unavailable">
              <span class="s4r-unavailable-label">曲库中已不可用</span>
              <UiButton
                class="s4r-remove-btn"
                label="移除"
                icon="close"
                @click="collection.toggleFavorite(id)"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="state.tab === 'playlists'" class="s4r-playlists-view">
        <div v-if="state.pendingTrackId" class="s4r-pending-track">
          <div class="s4r-pending-info">
            <UiIcon name="queue" />
            <span v-if="state.trackMap.has(state.pendingTrackId)" class="s4r-pending-title">
              {{ trackTitle(state.trackMap.get(state.pendingTrackId)!) }}
            </span>
            <span v-else class="s4r-pending-title">待添加曲目</span>
          </div>
          <UiButton
            class="s4r-cancel-pending"
            :label="'取消'"
            @click="state.pendingTrackId = ''"
           icon="close" />
        </div>

        <div class="s4r-create-playlist">
          <input
            v-model="state.newName"
            type="text"
            class="s4r-playlist-input"
            placeholder="新建播放列表"
            maxlength="100"
            aria-label="新建播放列表名称"
            @keydown.enter="handleCreate"
          />
          <UiButton
            label="创建播放列表" text="创建"
            icon="plus"
            :disabled="!state.newName.trim()"
            @click="handleCreate"
          />
        </div>

        <p v-if="!collection.playlists.length" class="s4r-empty-state">
          尚无播放列表。<br>
          播放列表仅保存在此浏览器中。
        </p>

        <div v-else class="s4r-playlist-list">
          <div v-for="list in collection.playlists" :key="list.id" class="s4r-playlist-item">
            <div class="playlist-summary">
              <button type="button" class="s4r-playlist-name-row" :aria-expanded="state.selectedPlaylistId === list.id" :aria-label="`查看播放列表 ${list.name}`" @click="togglePlaylist(list.id)">
                <UiIcon :name="state.selectedPlaylistId === list.id ? 'chevron-down' : 'chevron-right'" />
                <span class="s4r-playlist-name">{{ list.name }}</span>
                <span class="s4r-playlist-count">({{ list.trackIds.length }})</span>
              </button>
              <UiButton
                v-if="state.pendingTrackId"
                class="s4r-add-to-playlist"
                :label="`添加到 ${list.name}`"
                icon="plus"
                @click.stop="state.addPending(list.id)"
              />
            </div>

            <div v-if="state.selectedPlaylistId === list.id" class="s4r-playlist-detail">
              <div class="s4r-playlist-controls">
                <UiButton
                  v-if="!state.renameId"
                  label="播放全部"
                  icon="play"
                  :disabled="!list.trackIds.length"
                  @click="state.playAll()"
                />
                <UiButton
                  v-if="!state.renameId"
                  label="重命名"
                  icon="edit"
                  @click="state.beginRename(list.id)"
                />
                <UiButton
                  v-if="!state.renameId"
                  label="删除"
                  icon="trash"
                  @click="state.removePlaylist(list.id)"
                />
              </div>

              <div v-if="state.renameId === list.id" class="s4r-rename-form">
                <input
                  v-model="state.renameName"
                  type="text"
                  class="s4r-playlist-input"
                  maxlength="100"
                  aria-label="播放列表新名称"
                  @keydown.enter="state.saveRename()"
                  @keydown.escape.stop.prevent="state.cancelRename()"
                />
                <UiButton
                  label="保存名称" text="保存"
                  icon="plus"
                  :disabled="!state.renameName.trim()"
                  @click="state.saveRename()"
                />
                <UiButton
                  label="取消"
                  icon="close"
                  @click="state.cancelRename()"
                />
              </div>

              <div class="s4r-search-box">
                <input
                  v-model="state.query"
                  type="search"
                  class="s4r-search-input"
                  placeholder="搜索歌单"
                  aria-label="搜索歌单"
                />
              </div>

              <p v-if="!list.trackIds.length" class="playlist-empty">
                播放列表为空。可从右侧面板添加歌曲。
              </p>
              <p v-else-if="!state.playlistIds.length" class="s4r-empty-state">无匹配结果</p>
              <div v-else class="playlist-tracks">
                <div v-for="(trackId, idx) in state.playlistIds" :key="trackId" class="s4r-track-item">
                  <div v-if="state.trackMap.has(trackId)" class="s4r-track-content">
                    <div class="s4r-track-info">
                      <span class="s4r-track-title">{{ trackTitle(state.trackMap.get(trackId)!) }}</span>
                      <span class="s4r-track-artist">{{ trackArtist(state.trackMap.get(trackId)!) }}</span>
                    </div>
                    <div class="s4r-track-actions">
                      <UiButton
                        class="s4r-move-btn"
                        :disabled="list.trackIds.indexOf(trackId) === 0"
                        :label="'上移'"
                        @click="collection.movePlaylistTrack(list.id, trackId, -1)"
                       icon="arrow-up" />
                      <UiButton
                        class="s4r-move-btn"
                        :disabled="list.trackIds.indexOf(trackId) === list.trackIds.length - 1"
                        :label="'下移'"
                        @click="collection.movePlaylistTrack(list.id, trackId, 1)"
                       icon="arrow-down" />
                      <TrackActions :track="state.trackMap.get(trackId)!" :player="props.player" :collection="props.collection" :context-ids="state.playlistIds" @open-library="state.show('playlists', $event.trackId)" />
                <UiButton label="查看曲目详情" icon="info" @click="$emit('show-track', trackId)" />
                <UiButton label="从列表移除" icon="close" @click="collection.removeFromPlaylist(list.id, trackId)" />
                    </div>
                  </div>
                  <div v-else class="s4r-track-unavailable">
                    <span class="s4r-unavailable-label">曲库中已不可用</span>
                    <UiButton
                      class="s4r-remove-btn"
                      :label="'移除'"
                      @click="collection.removeFromPlaylist(list.id, trackId)"
                     icon="close" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import UiIcon from './UiIcon.vue';
import UiButton from './UiButton.vue';
import TrackActions from './TrackActions.vue';
import type { MusicTrack } from '../domain/contracts';
import type { useLibraryPanel } from '../services/library-panel';
import type { useMusicPlayer } from '../services/music-player';
import type { useMusicCollection } from '../services/music-collection';

const props = defineProps<{
  panel: ReturnType<typeof useLibraryPanel>;
  player: ReturnType<typeof useMusicPlayer>;
  collection: ReturnType<typeof useMusicCollection>;
  tracks: MusicTrack[];
}>();

const emit = defineEmits<{
  'show-track': [id: string];
}>();

const state = reactive(props.panel);
const collection = reactive(props.collection);
const player = reactive(props.player);

function trackTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

function trackArtist(track: MusicTrack): string {
  return track.artists.length ? track.artists.join('、') : '未知';
}

function handleCreate(): void {
  state.create();
}

function togglePlaylist(id: string): void {
  if (state.selectedPlaylistId === id) {
    state.selectedPlaylistId = '';
  } else {
    state.selectPlaylist(id);
  }
}
</script>
