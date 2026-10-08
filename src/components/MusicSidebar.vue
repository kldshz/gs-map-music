<template>
  <div class="music-sidebar">
    <div class="panel-tabs" role="group" aria-label="面板切换">
      <button ref="anchorsTabBtn" type="button" :class="['tab-btn', { active: activeTab === 'anchors' }]" :aria-pressed="activeTab === 'anchors'" @click="switchTab('anchors')">点位目录</button>
      <button ref="tracksTabBtn" type="button" :class="['tab-btn', { active: activeTab === 'tracks' }]" :aria-pressed="activeTab === 'tracks'" @click="switchTab('tracks')">曲目检索</button>
      <button type="button" :class="['tab-btn', { active: activeTab === 'detail' }]" :aria-pressed="activeTab === 'detail'" @click="switchTab('detail')">歌曲信息</button>
    </div>

    <div v-if="activeTab === 'anchors'" class="tab-content" @keydown="handleDetailKeydown">
      <p class="result-count" aria-live="polite">{{ anchorCountText }}</p>
      <p v-if="!state.visibleAnchors.length" class="empty-state">当前筛选无点位</p>
      <ul v-else class="anchor-list" aria-label="点位列表">
        <li v-for="anchor in displayAnchors" :key="anchor.id">
          <button type="button" :class="['anchor-item', { selected: anchor.id === state.selectedAnchorId }]" :aria-current="anchor.id === state.selectedAnchorId ? 'true' : undefined" @click="selectAnchorAndShow(anchor.id)">
            <span class="anchor-kind" :title="kindLabel(anchor.kind)" aria-hidden="true">{{ anchor.kind === 'statue' ? '✦' : '⚓' }}</span>
            <span class="sr-only">{{ kindLabel(anchor.kind) }}</span>
            <span class="anchor-name">{{ anchor.name }}</span>
            <span class="anchor-area anchor-geo-path">{{ geoPath(anchor.geography) }}</span>
            <span class="anchor-id">#{{ anchor.id }}</span>
            <span class="anchor-content">{{ summary(anchor.content) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else-if="activeTab === 'tracks'" class="tab-content" @keydown="handleDetailKeydown">
      <div class="track-filters">
        <select
          v-model="state.albumFilter"
          class="filter-select"
          aria-label="筛选专辑"
        >
          <option value="">全部专辑</option>
          <option v-for="album in state.albumOptions" :key="album" :value="album">{{ album }}</option>
        </select>
        <select
          v-model="state.regionFilter"
          class="filter-select"
          aria-label="筛选音乐地区"
        >
          <option value="">全部地区</option>
          <option v-for="region in state.regionOptions" :key="region.value" :value="region.value">{{ region.label }}</option>
        </select>
      </div>
      <p class="result-count" aria-live="polite">{{ trackCountText }}</p>
      <p v-if="!state.tracks.length" class="empty-state">曲库尚未导入</p>
      <p v-else-if="!state.searchTracks.length" class="empty-state">
        <template v-if="state.query || state.albumFilter || state.regionFilter">
          没有匹配的曲目
          <template v-if="state.query">（搜索："{{ state.query }}"）</template>
          <template v-if="state.albumFilter">（专辑：{{ state.albumFilter }}）</template>
          <template v-if="state.regionFilter">（地区：{{ state.regionOptions.find(r => r.value === state.regionFilter)?.label }}）</template>
        </template>
        <template v-else>没有匹配的曲目</template>
      </p>
      <ul v-else class="track-list" aria-label="曲目列表">
        <li v-for="track in state.searchTracks" :key="track.id">
          <button type="button" class="track-item" @click="selectTrackAndShow(track.id)">
            <span class="track-title">{{ trackDisplayTitle(track) }}</span>
            <span class="track-artists">{{ joinList(track.artists) }}</span>
            <span class="track-origin">{{ track.sceneInfo?.originText?.trim() || '出处尚未提供' }}</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-else-if="activeTab === 'detail' && viewMode === 'anchor' && state.selectedAnchor" class="tab-content detail-view" @keydown="handleDetailKeydown">
      <h2 ref="anchorDetailHeading" tabindex="-1" class="sidebar-detail-title">{{ state.selectedAnchor.name }} · #{{ state.selectedAnchor.sourceId }}</h2>
      <details open class="detail-section">
        <summary class="detail-summary">点位信息</summary>
        <dl class="anchor-info">
          <dt>编号</dt><dd>{{ state.selectedAnchor.id }}</dd>
          <dt>类型</dt><dd>{{ kindLabel(state.selectedAnchor.kind) }}</dd>
          <dt>国家</dt><dd>{{ show(state.selectedAnchor.geography?.country || state.selectedAnchor.country) }}</dd>
          <dt>一级地区</dt><dd>{{ primaryLabel(state.selectedAnchor.geography) }}</dd>
          <dt>二级地点</dt><dd>{{ secondaryLabel(state.selectedAnchor.geography) }}</dd>
          <dt>源地图分组</dt><dd>{{ show(state.selectedAnchor.areaName) }}</dd>
          <dt>坐标</dt><dd>{{ state.selectedAnchor.position ? `x=${state.selectedAnchor.position[0].toFixed(1)}, y=${state.selectedAnchor.position[1].toFixed(1)} (V3图像坐标)` : '待核实' }}</dd>
          <dt>说明</dt><dd>{{ show(state.selectedAnchor.content) }}</dd>
          <dt>来源</dt>
          <dd>
            <a v-if="state.selectedAnchor.sourceUrl" :href="state.selectedAnchor.sourceUrl" target="_blank" rel="noopener">空荧酒馆</a>
            <template v-else>未知</template>
          </dd>
        </dl>
      </details>

      <details v-if="state.selectedAnchor.geography" class="detail-section geography-evidence">
        <summary class="detail-summary">归类证据</summary>
        <p class="context-note">距离候选仅供校对，不代表官方边界</p>
        <dl class="anchor-info">
          <dt>归类方式</dt><dd>{{ geographyMethodLabel(state.selectedAnchor.geography) }}</dd>
          <dt>核实状态</dt><dd>{{ evidenceStatusLabel(state.selectedAnchor.geography) }}</dd>
          <template v-if="geographyDistance(state.selectedAnchor.geography)">
            <dt>距离候选</dt><dd>{{ geographyDistance(state.selectedAnchor.geography) }}</dd>
          </template>
          <dt>归类来源</dt>
          <dd>
            <a v-if="state.selectedAnchor.geography?.sourceUrl" :href="state.selectedAnchor.geography?.sourceUrl" target="_blank" rel="noopener">查看归类来源</a>
            <template v-else>未知</template>
          </dd>
        </dl>
      </details>

      <details open class="detail-section">
        <summary class="detail-summary">关联音乐（{{ anchorTracks.length }}）</summary>
        <button
          v-if="anchorTracks.length"
          type="button"
          class="play-all-btn"
          @click="handlePlayAnchorTracks"
        >播放点位曲库</button>
        <div v-if="state.anchorMusicContexts.length" class="music-contexts">
          <h4>曲库细分目录</h4>
          <p class="context-note">以下为此点位已关联曲目的细分目录标签，不代表该点位的实际地理位置</p>
          <ul class="context-list">
            <li v-for="ctx in state.anchorMusicContexts" :key="ctx">{{ ctx }}</li>
          </ul>
        </div>
        <ul v-if="anchorTracks.length" class="tracks-list">
          <li v-for="track in anchorTracks" :key="track.id" class="track-detail">
            <button type="button" class="track-item" @click="selectTrackAndShow(track.id)">
              <span class="track-title">{{ trackDisplayTitle(track) }}</span>
              <span class="track-artists">艺人：{{ joinList(track.artists) }}</span>
              <span class="track-origin">{{ track.sceneInfo?.originText?.trim() || '出处尚未提供' }}</span>
            </button>
            <div class="track-actions">
              <button type="button" class="track-action-btn" @click.stop="handlePlayTrack(track.id)">播放此曲</button>
              <button type="button" class="track-action-btn" @click.stop="handleEnqueueTrack(track.id)">加入队列</button>
              <button
                type="button"
                class="track-action-btn"
                :aria-pressed="collectionState.isFavorite(track.id)"
                @click.stop="collectionState.toggleFavorite(track.id)"
              >{{ collectionState.isFavorite(track.id) ? '已收藏' : '收藏' }}</button>
              <details class="track-add-playlist">
                <summary class="track-action-btn">添加到播放列表</summary>
                <ul v-if="collectionState.playlists.length" class="playlist-menu">
                  <li v-for="list in collectionState.playlists" :key="list.id">
                    <button
                      type="button"
                      class="playlist-menu-item"
                      @click.stop="collectionState.addToPlaylist(list.id, track.id)"
                    >{{ list.name }}</button>
                  </li>
                </ul>
                <p v-else class="playlist-menu-empty">尚无播放列表</p>
              </details>
            </div>
            <div v-if="state.developmentMode && state.editingAvailable" class="edit-actions">
              <button type="button" class="edit-btn remove-btn" :disabled="state.editBusy" @click="removeFromAnchor(track.id)">移除关联</button>
              <button v-if="anchorTrackCanRestore(track.id)" type="button" class="edit-btn restore-btn" :disabled="state.editBusy" @click="restoreAssociation(track.id, state.selectedAnchor.id)">恢复来源关联</button>
            </div>
          </li>
        </ul>
        <p v-else class="empty-state">尚未补充音乐关系数据</p>

        <div v-if="state.developmentMode && state.editingAvailable && state.selectedAnchor" class="dev-add-track">
          <h4>开发编辑：添加曲目到此点位</h4>
          <p class="dev-hint">仅修改点位关联，歌曲资料保留</p>
          <input v-model="addTrackQuery" type="search" class="search-input" placeholder="搜索全部曲目" aria-label="搜索曲目" />
          <ul v-if="candidateTracks.length" class="candidate-list">
            <li v-for="track in candidateTracks.slice(0, 20)" :key="track.id">
              <div class="candidate-item">
                <span class="track-title">{{ trackDisplayTitle(track) }}</span>
                <button type="button" class="edit-btn add-btn" :disabled="state.editBusy || isAlreadyAdded(track.id)" @click="addToAnchor(track.id)">{{ isAlreadyAdded(track.id) ? '已添加' : '添加到此点位' }}</button>
                <button v-if="anchorCandidateCanRestore(track.id)" type="button" class="edit-btn restore-btn" :disabled="state.editBusy" @click="restoreAssociation(track.id, state.selectedAnchor.id)">恢复来源关联</button>
              </div>
            </li>
          </ul>
          <p v-else-if="addTrackQuery.trim()" class="empty-state">无匹配曲目</p>
        </div>
      </details>

    </div>

    <div v-else-if="activeTab === 'detail' && viewMode === 'track' && state.selectedTrack" class="tab-content detail-view" @keydown="handleDetailKeydown">
      <h2 ref="trackDetailHeading" tabindex="-1" class="sidebar-detail-title">{{ trackDisplayTitle(state.selectedTrack) }}</h2>
        <div class="track-detail-actions">
          <button type="button" class="track-action-btn" @click="handlePlayTrack(state.selectedTrack.id)">播放此曲</button>
          <button type="button" class="track-action-btn" @click="handleEnqueueTrack(state.selectedTrack.id)">加入队列</button>
          <button
            type="button"
            class="track-action-btn"
            :aria-pressed="collectionState.isFavorite(state.selectedTrack.id)"
            @click="collectionState.toggleFavorite(state.selectedTrack.id)"
          >{{ collectionState.isFavorite(state.selectedTrack.id) ? '已收藏' : '收藏' }}</button>
          <details class="track-add-playlist">
            <summary class="track-action-btn">添加到播放列表</summary>
            <ul v-if="collectionState.playlists.length" class="playlist-menu">
              <li v-for="list in collectionState.playlists" :key="list.id">
                <button
                  type="button"
                  class="playlist-menu-item"
                  @click="collectionState.addToPlaylist(list.id, state.selectedTrack.id)"
                >{{ list.name }}</button>
              </li>
            </ul>
            <p v-else class="playlist-menu-empty">尚无播放列表</p>
          </details>
        </div>
      <button v-if="state.selectedAnchor" type="button" class="back-to-anchor-btn" @click="selectAnchorAndShow(state.selectedAnchor.id)">← 返回当前点位曲库</button>
      <details open class="detail-section">
        <summary class="detail-summary">基本信息</summary>
        <dl class="track-metadata">
          <template v-if="state.selectedTrack.sceneInfo">
            <dt>中文名</dt><dd>{{ state.selectedTrack.sceneInfo.wikiTitle }}</dd>
            <dt>英文名</dt><dd>{{ state.selectedTrack.sceneInfo.englishTitle }}</dd>
            <dt>分碟与曲序</dt><dd>{{ state.selectedTrack.sceneInfo.discTitle }} 第{{ state.selectedTrack.sceneInfo.trackNumber }}首</dd>
          </template>
          <dt>艺人</dt><dd>{{ joinList(state.selectedTrack.artists) }}</dd>
          <dt>作曲</dt><dd>{{ joinList(state.selectedTrack.composers) }}</dd>
          <dt>专辑</dt><dd>{{ show(state.selectedTrack.album) }}</dd>
          <dt>发行日期</dt><dd>{{ show(state.selectedTrack.releaseDate) }}</dd>
          <dt>时长</dt><dd>{{ formatDuration(state.selectedTrack.durationSeconds) }}</dd>
          <dt>网易云音乐</dt>
          <dd>
            <template v-if="state.selectedTrack.neteaseId">
              <a :href="neteaseUrl(state.selectedTrack.neteaseId)" target="_blank" rel="noopener">{{ state.selectedTrack.neteaseId }}</a>
              <span class="metadata-note">（元数据来源，artist字段不代表演奏家本人）</span>
            </template>
            <template v-else>未知</template>
          </dd>
        </dl>
      </details>

      <details open v-if="state.selectedTrack.description" class="detail-section">
        <summary class="detail-summary">曲目说明</summary>
        <p class="track-description">{{ state.selectedTrack.description }}</p>
      </details>

      <details v-if="state.selectedTrack.sceneInfo" class="detail-section">
        <summary class="detail-summary">完整元数据</summary>
        <dl class="track-metadata">
          <dt>出处原文</dt><dd class="origin-text">{{ state.selectedTrack.sceneInfo.originText || '未知' }}</dd>
          <dt>主要地区</dt><dd>{{ joinList(state.selectedTrack.sceneInfo.mainRegions) }}</dd>
          <dt>统一分类路径</dt>
          <dd>
            <ul v-if="state.selectedTrack.sceneInfo.geographicScopes?.length" class="location-labels geo-scope-list">
              <li v-for="(scope, idx) in state.selectedTrack.sceneInfo.geographicScopes" :key="idx">{{ geoPath(scope) }}</li>
            </ul>
            <template v-else>统一目录未归类</template>
          </dd>
          <dt>完整细分目录</dt>
          <dd>
            <ul v-if="state.trackLocationLabels(state.selectedTrack.id).length" class="location-labels">
              <li v-for="label in state.trackLocationLabels(state.selectedTrack.id)" :key="label">{{ label }}</li>
            </ul>
            <template v-else>未知</template>
          </dd>
          <dt>Wiki来源</dt>
          <dd>
            <a v-if="state.selectedTrack.sceneInfo.wikiSourceUrl" :href="state.selectedTrack.sceneInfo.wikiSourceUrl" target="_blank" rel="noopener">{{ state.selectedTrack.sceneInfo.wikiSourceUrl }}</a>
            <template v-else>未知</template>
            <span v-if="state.selectedTrack.sceneInfo.wikiRevisionId" class="metadata-note">（修订版本 {{ state.selectedTrack.sceneInfo.wikiRevisionId }}，内容仅供参考）</span>
          </dd>
          <dt v-if="state.selectedTrack.sceneInfo.metadataNotes.length">元数据说明</dt>
          <dd v-if="state.selectedTrack.sceneInfo.metadataNotes.length">
            <ul class="metadata-notes">
              <li v-for="(note, idx) in state.selectedTrack.sceneInfo.metadataNotes" :key="idx">{{ note }}</li>
            </ul>
          </dd>
        </dl>
      </details>

      <details class="detail-section">
        <summary class="detail-summary">歌曲元数据来源</summary>
        <p>
          <a v-if="state.selectedTrack.sourceUrl" :href="state.selectedTrack.sourceUrl" target="_blank" rel="noopener">{{ state.selectedTrack.sourceUrl }}</a>
          <template v-else>未知</template>
        </p>
      </details>

      <details class="detail-section">
        <summary class="detail-summary">关联点位（{{ trackLocationsCount }}）</summary>


        <template v-if="trackLocations.length">
          <button type="button" class="locate-btn" @click="locateAll">在地图上定位全部</button>
          <ul class="location-list">
            <li v-for="anchor in trackLocations" :key="anchor.id" class="location-item">
              <button type="button" class="location-btn" @click="locateAnchor(anchor.id)">
                <span class="location-content">{{ anchor.content?.trim() || '点位说明尚未提供' }}</span>
                <span class="location-area">{{ kindLabel(anchor.kind) }} · #{{ anchor.id }}</span>
                <span v-if="!anchor.position" class="location-pending">坐标待核实</span>
              </button>
              <div v-if="state.developmentMode && state.editingAvailable" class="edit-actions">
                <button type="button" class="edit-btn remove-btn" :disabled="state.editBusy" @click="removeFromTrack(anchor.id)">移除所选关联</button>
                <button v-if="trackAnchorCanRestore(anchor.id)" type="button" class="edit-btn restore-btn" :disabled="state.editBusy" @click="restoreAssociation(state.selectedTrack.id, anchor.id)">恢复所选来源关联</button>
              </div>
            </li>
          </ul>
        </template>
        <p v-else class="empty-state">尚无关联点位</p>

        <div v-if="state.developmentMode && state.editingAvailable && state.selectedTrack" class="dev-add-anchor">
          <h4>开发编辑：添加点位到此曲目</h4>
          <p class="dev-hint">仅修改点位关联，歌曲资料保留</p>
          <div class="anchor-filter">
            <select v-model="addAnchorRegion" class="region-select" aria-label="按地区筛选">
              <option value="">全部地区</option>
              <option v-for="area in state.areaOptions" :key="area.code" :value="area.code">{{ areaLabel(area) }}</option>
            </select>
            <input v-model="addAnchorQuery" type="search" class="search-input" placeholder="搜索点位" aria-label="搜索点位" />
          </div>
          <ul v-if="candidateAnchors.length" class="candidate-list">
            <li v-for="anchor in candidateAnchors.slice(0, 20)" :key="anchor.id">
              <div class="candidate-item">
                <div class="candidate-info">
                  <span class="anchor-content candidate-content">{{ anchor.content?.trim() || '点位说明尚未提供' }}</span>
                  <span class="anchor-meta"><span class="anchor-kind" :title="kindLabel(anchor.kind)" aria-hidden="true">{{ anchor.kind === 'statue' ? '✦' : '⚓' }}</span>{{ kindLabel(anchor.kind) }} · #{{ anchor.id }}</span>
                  <span class="anchor-geo-path">{{ geoPath(anchor.geography) }}</span>
                </div>
                <div class="candidate-actions">
                  <button type="button" class="edit-btn add-btn" :disabled="state.editBusy || isAnchorAdded(anchor.id)" @click="addAnchorToTrack(anchor.id)">{{ isAnchorAdded(anchor.id) ? '已添加' : '添加到所选点位' }}</button>
                  <button v-if="isAnchorAdded(anchor.id)" type="button" class="edit-btn remove-btn" :disabled="state.editBusy" @click="removeFromTrack(anchor.id)">移除所选关联</button>
                  <button v-if="candidateAnchorCanRestore(anchor.id)" type="button" class="edit-btn restore-btn" :disabled="state.editBusy" @click="restoreAssociation(state.selectedTrack.id, anchor.id)">恢复所选来源关联</button>
                </div>
              </div>
            </li>
          </ul>
          <p v-else-if="addAnchorQuery.trim() || addAnchorRegion" class="empty-state">无匹配点位</p>
        </div>
      </details>

      <details open class="detail-section">
        <summary class="detail-summary">我的评价</summary>
        <p class="note-instruction">个人评价内容保存在本机浏览器，支持20000字以内</p>
        <textarea
          v-model="draftPersonalNote"
          class="personal-note-input"
          placeholder="在此输入您对本曲目的个人评价、感想或备注"
          maxlength="20000"
          rows="6"
          aria-label="个人评价输入框"
        ></textarea>
        <div class="note-controls">
          <button type="button" class="note-btn save-btn" @click="saveNote">保存评价</button>
          <button type="button" class="note-btn restore-btn" @click="restoreNote">恢复导入值</button>
          <span class="note-length">{{ draftPersonalNote.length }} / 20000</span>
        </div>
        <p v-if="state.noteMessage" class="note-message" role="status" aria-live="polite">{{ state.noteMessage }}</p>
      </details>


    </div>

    <div v-else-if="activeTab === 'detail'" class="tab-content detail-view">
      <p class="empty-state">请从点位目录或曲目检索选择一项</p>
    </div>
    <div v-if="state.developmentMode" class="dev-section">
      <p class="dev-hint">开发编辑：增删点位关联保存到本机项目，刷新保留；歌曲资料保持，不自动同步MySQL。</p>
      <button v-if="state.editingAvailable" type="button" class="export-btn" :disabled="state.editBusy" @click="state.exportEditedLibrary()">导出当前曲库</button>
      <p v-if="state.editMessage" class="edit-message" :role="state.editMessage.includes('失败') ? 'alert' : 'status'">{{ state.editMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { MusicTrack, Anchor, GeographicScope, AnchorGeography } from '../domain/contracts';
import type { useExplorer } from '../services/explorer';

type Maybe<T> = T | null | undefined;

const props = defineProps<{
  explorer: ReturnType<typeof useExplorer>;
  player: ReturnType<typeof import('../services/music-player').useMusicPlayer>;
  collection: ReturnType<typeof import('../services/music-collection').useMusicCollection>;
}>();

const state = reactive(props.explorer);
const playerState = reactive(props.player);
const collectionState = reactive(props.collection);

type Tab = 'anchors' | 'tracks' | 'detail';
type ViewMode = 'anchor' | 'track' | null;

const activeTab = ref<Tab>('anchors');
const viewMode = ref<ViewMode>(null);
const lastValidViewMode = ref<ViewMode>(null);
const draftPersonalNote = ref('');
const addTrackQuery = ref('');
const addAnchorQuery = ref('');
const addAnchorRegion = ref('');
const anchorDetailHeading = ref<HTMLElement | null>(null);
const trackDetailHeading = ref<HTMLElement | null>(null);
const anchorsTabBtn = ref<HTMLElement | null>(null);
const tracksTabBtn = ref<HTMLElement | null>(null);

const displayAnchors = computed(() => state.visibleAnchors.slice(0, 100));
const anchorCountText = computed(() => {
  const n = state.visibleAnchors.length;
  return n > 100 ? `当前共 ${n} 个点位，显示前 100 个` : `当前共 ${n} 个点位`;
});
const trackCountText = computed(() => {
  const total = state.tracks.length;
  const shown = state.searchTracks.length;
  if (!total) return '0 首曲目';
  const albumInfo = total === 1 ? '1 首曲目' : `${total} 首曲目`;
  return shown === total ? albumInfo : `${shown} / ${albumInfo}`;
});
const anchorTracks = computed(() => state.tracks.filter(t => state.anchorTracks.some(at => at.id === t.id)));
const trackLocations = computed(() => state.anchors.filter(a => state.trackLocations.some(tl => tl.id === a.id)));

const trackLocationsCount = computed(() => trackLocations.value.length);

const candidateTracks = computed(() => {
  if (!addTrackQuery.value.trim()) return [];
  const q = addTrackQuery.value.trim().toLocaleLowerCase();
  return state.tracks.filter(t => {
    const text = [t.title, ...t.artists, t.album, t.sceneInfo?.wikiTitle, t.sceneInfo?.englishTitle].join(' ').toLocaleLowerCase();
    return text.includes(q);
  });
});

const candidateAnchors = computed(() => {
  let list = state.anchors;
  if (addAnchorRegion.value) {
    list = list.filter(a => a.areaCode === addAnchorRegion.value);
  }
  if (addAnchorQuery.value.trim()) {
    const q = addAnchorQuery.value.trim().toLocaleLowerCase();
    list = list.filter(a => {
      const text = [a.name, a.content, a.areaName, a.country, a.id, a.geography?.country, a.geography?.primary, a.geography?.secondary].join(' ').toLocaleLowerCase();
      return text.includes(q);
    });
  }
  return list;
});

function areaLabel(area: { name: string; parentId?: Maybe<number> }): string {
  const parent = area.parentId ? state.areas.find((a) => a.id === area.parentId)?.name : undefined;
  return parent ? `${parent} · ${area.name}` : area.name;
}

function kindLabel(kind: string): string {
  if (kind === 'statue') return '神像';
  if (kind === 'waypoint') return '传送锚点';
  return '点位';
}

function primaryLabel(scope: Maybe<GeographicScope>): string {
  return scope?.primary?.trim() || '未确定';
}

function secondaryLabel(scope: Maybe<GeographicScope>): string {
  return scope?.secondary?.trim() || '未细分';
}

function geoPath(scope: Maybe<GeographicScope>): string {
  if (!scope) return '统一目录未归类';
  return [scope.country?.trim() || '未知', primaryLabel(scope), secondaryLabel(scope)].join(' / ');
}

function geographyMethodLabel(geo: Maybe<AnchorGeography>): string {
  if (geo?.method === 'source-header') return '来源标题归类';
  if (geo?.method === 'landmark-distance') return '地标距离候选';
  return '未解析';
}

function evidenceStatusLabel(geo: Maybe<AnchorGeography>): string {
  return geo?.evidenceStatus === 'pending' ? '待核实' : '未知';
}

function geographyDistance(geo: Maybe<AnchorGeography>): string | null {
  const d = geo?.distance;
  return typeof d === 'number' && Number.isFinite(d) ? `${d.toFixed(1)} V3图像单位（非米）` : null;
}

function show(value: Maybe<string | number>): string {
  return value === null || value === undefined || value === '' ? '未知' : String(value);
}

function joinList(values: Maybe<readonly string[]>): string {
  return values && values.length ? values.join('、') : '未知';
}

function summary(value: Maybe<string>, max = 36): string {
  const text = value ? value.trim() : '';
  if (!text) return '暂无说明';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatDuration(seconds: Maybe<number>): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '未知';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function neteaseUrl(id: string | number): string {
  return `https://music.163.com/#/song?id=${encodeURIComponent(String(id))}`;
}

function trackDisplayTitle(track: MusicTrack): string {
  if (track.sceneInfo) {
    return `${track.sceneInfo.wikiTitle} / ${track.sceneInfo.englishTitle}`;
  }
  return track.title;
}

function switchTab(tab: Tab): void {
  activeTab.value = tab;
  if (tab === 'detail') {
    if (lastValidViewMode.value === 'track' && state.selectedTrack) {
      viewMode.value = 'track';
    } else if (lastValidViewMode.value === 'anchor' && state.selectedAnchor) {
      viewMode.value = 'anchor';
    } else if (state.selectedTrack) {
      viewMode.value = 'track';
    } else if (state.selectedAnchor) {
      viewMode.value = 'anchor';
    } else {
      viewMode.value = null;
    }
  }
}

function selectAnchorAndShow(id: string): void {
  state.selectAnchor(id);
  viewMode.value = 'anchor';
  lastValidViewMode.value = 'anchor';
  activeTab.value = 'detail';
  void nextTick(() => {
    anchorDetailHeading.value?.focus();
  });
}

function selectTrackAndShow(id: string): void {
  state.selectTrack(id);
  viewMode.value = 'track';
  lastValidViewMode.value = 'track';
  activeTab.value = 'detail';
  draftPersonalNote.value = state.personalNoteFor(id, state.selectedTrack?.personalNote ?? '');
  void nextTick(() => {
    trackDetailHeading.value?.focus();
  });
}

function locateAll(): void {
  state.locateTrack();
}

function locateAnchor(id: string): void {
  state.selectAnchor(id);
  viewMode.value = 'anchor';
  lastValidViewMode.value = 'anchor';
  activeTab.value = 'detail';
  void nextTick(() => {
    anchorDetailHeading.value?.focus();
  });
}

function saveNote(): void {
  if (!state.selectedTrack) return;
  state.savePersonalNote(state.selectedTrack.id, draftPersonalNote.value);
}

function restoreNote(): void {
  if (!state.selectedTrack) return;
  if (state.clearPersonalNote(state.selectedTrack.id)) {
    draftPersonalNote.value = state.personalNoteFor(state.selectedTrack.id, state.selectedTrack.personalNote ?? '');
  }
}

function isAlreadyAdded(trackId: string): boolean {
  return state.anchorTracks.some(t => t.id === trackId);
}

function isAnchorAdded(anchorId: string): boolean {
  return state.trackLocations.some(a => a.id === anchorId);
}

async function addToAnchor(trackId: string): Promise<void> {
  if (!state.selectedAnchor) return;
  await state.addTrackToAnchor(trackId, state.selectedAnchor.id);
}

async function removeFromAnchor(trackId: string): Promise<void> {
  if (!state.selectedAnchor) return;
  await state.removeTrackFromAnchor(trackId, state.selectedAnchor.id);
}

async function addAnchorToTrack(anchorId: string): Promise<void> {
  if (!state.selectedTrack) return;
  await state.addTrackToAnchor(state.selectedTrack.id, anchorId);
}

async function removeFromTrack(anchorId: string): Promise<void> {
  if (!state.selectedTrack) return;
  await state.removeTrackFromAnchor(state.selectedTrack.id, anchorId);
}

async function restoreAssociation(trackId: string, anchorId: string): Promise<void> {
  await state.restoreTrackAnchor(trackId, anchorId);
}

function trackAnchorCanRestore(anchorId: string): boolean {
  return !!state.selectedTrack && state.hasManualEdit(state.selectedTrack.id, anchorId);
}

function candidateAnchorCanRestore(anchorId: string): boolean {
  return !!state.selectedTrack && state.hasManualEdit(state.selectedTrack.id, anchorId);
}

function anchorTrackCanRestore(trackId: string): boolean {
  return !!state.selectedAnchor && state.hasManualEdit(trackId, state.selectedAnchor.id);
}

function anchorCandidateCanRestore(trackId: string): boolean {
  return !!state.selectedAnchor && state.hasManualEdit(trackId, state.selectedAnchor.id);
}

function handleDetailKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (viewMode.value === 'anchor') {
      activeTab.value = 'anchors';
      void nextTick(() => {
        anchorsTabBtn.value?.focus();
      });
    } else if (viewMode.value === 'track') {
      activeTab.value = 'tracks';
      void nextTick(() => {
        tracksTabBtn.value?.focus();
      });
    }
  }
}

watch(() => state.selectedAnchorId, (newId) => {
  if (newId) {
    viewMode.value = 'anchor';
    lastValidViewMode.value = 'anchor';
    activeTab.value = 'detail';
    void nextTick(() => {
      anchorDetailHeading.value?.focus();
    });
  }
});

watch(() => [state.selectedTrack?.id, state.selectedTrack?.personalNote], () => {
  const track=state.selectedTrack;
  if(track) draftPersonalNote.value = state.personalNoteFor(track.id, track.personalNote ?? '');
});

watch(() => state.selectedTrack?.id, () => {
  addTrackQuery.value = '';
  addAnchorQuery.value = '';
  addAnchorRegion.value = '';
});

watch(() => state.selectedAnchorId, () => {
  addTrackQuery.value = '';
  addAnchorQuery.value = '';
  addAnchorRegion.value = '';
});

async function handlePlayAnchorTracks(): Promise<void> {
  if (!anchorTracks.value.length) return;
  const ids = anchorTracks.value.map(t => t.id);
  await playerState.playTrack(ids[0], ids);
}

async function handlePlayTrack(id: string): Promise<void> {
  const context = viewMode.value === "anchor" ? anchorTracks.value.map(t=>t.id) : state.searchTracks.map(t=>t.id);
  await playerState.playTrack(id, context.includes(id) ? context : [id]);
}

function handleEnqueueTrack(id: string): void {
  playerState.enqueue(id);
}

defineExpose({ showAnchor: selectAnchorAndShow, showTrack: selectTrackAndShow });
</script>
