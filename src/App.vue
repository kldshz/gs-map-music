<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { Location, MapPoint, Track, Source } from './domain/contracts'
import { dataset } from './data/demo'

type TimeCondition = 'day' | 'night' | 'any' | 'unknown'

// ── State ──────────────────────────────────────────────
const selectedLocation = ref<string | null>('location-a')
const timeMode = ref<TimeCondition>('day')
const searchQuery = ref('')
const activeView = ref<'music' | 'route'>('music')
const selectedTrack = ref<string | null>(null)
const routeDraft = ref<string[]>([])
const routeSpeed = ref(5)
const showGenshinList = ref(false)

const dialogRef = ref<HTMLDialogElement | null>(null)
const dialogTriggerEl = ref<HTMLButtonElement | null>(null)

// ── Helpers ────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isValidUrl(url: string | null): url is string {
  if (!url) return false
  try { return ['http:', 'https:'].includes(new URL(url).protocol) } catch { return false }
}

// ── Computed ───────────────────────────────────────────
const mapLocations = computed(() =>
  dataset.locations.filter((l): l is Location & { point: MapPoint } => l.point !== null)
)

const filteredTracks = computed(() => {
  if (!selectedLocation.value) return []
  const assocs = dataset.associations.filter((a) =>
    a.locationId === selectedLocation.value &&
    a.evidenceStatus !== 'pending' &&
    (a.timeCondition === timeMode.value || a.timeCondition === 'any')
  )
  return assocs
    .map((a) => dataset.tracks.find((t) => t.id === a.trackId))
    .filter((track): track is Track => track !== undefined)
})

const genshinTracks = computed(() =>
  dataset.tracks.filter((t) => t.origin === 'genshin-catalog')
)

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return dataset.tracks.filter((t) => {
    if (t.title?.toLowerCase().includes(q)) return true
    if (t.artists?.some((a: string) => a.toLowerCase().includes(q))) return true
    if (t.album?.toLowerCase().includes(q)) return true
    if (t.description?.toLowerCase().includes(q)) return true
    if (t.composers?.some((c: string) => c && c.toLowerCase().includes(q))) return true
    return dataset.associations
      .filter((a) => a.trackId === t.id)
      .some((a) => {
        const loc = dataset.locations.find((l) => l.id === a.locationId)
        return loc?.name?.toLowerCase().includes(q)
      })
  })
})

const currentTrackDetail = computed(() => {
  if (!selectedTrack.value) return null
  const track = dataset.tracks.find((t) => t.id === selectedTrack.value)
  if (!track) return null
  const assocs = dataset.associations.filter((a) => a.trackId === track.id)
  const locationEntries = assocs.map((a) => ({
    assoc: a,
    location: dataset.locations.find((l) => l.id === a.locationId) ?? null
  }))
  const sources = ((track.sourceIds ?? []) as string[])
    .map((sid) => dataset.sources.find((s) => s.id === sid))
    .filter((source): source is Source => source !== undefined)
  return { track, assocs, locationEntries, sources }
})

const routePolylinePoints = computed(() =>
  routeDraft.value
    .map((id) => dataset.locations.find((l) => l.id === id))
    .filter((l): l is Location & { point: MapPoint } => l?.point != null)
    .map((l) => `${l.point.x},${l.point.y}`)
    .join(' ')
)

const selectedLocationName = computed(() => {
  if (!selectedLocation.value) return null
  return dataset.locations.find((l) => l.id === selectedLocation.value)?.name ?? null
})

// ── Actions ────────────────────────────────────────────
function handleMapPin(locId: string) {
  if (activeView.value === 'route') {
    routeDraft.value.push(locId)
  } else {
    selectedLocation.value = locId
  }
}

function selectTrack(id: string) {
  selectedTrack.value = id
  nextTick(() => {
    document.getElementById('track-detail')?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  })
}

function clearSearch() {
  searchQuery.value = ''
}

function removeLastFromRoute() {
  routeDraft.value.pop()
}

function clearRoute() {
  routeDraft.value = []
}

function openResourceDialog(e: MouseEvent) {
  dialogTriggerEl.value = e.currentTarget as HTMLButtonElement
  dialogRef.value?.showModal()
}

function closeResourceDialog() {
  dialogRef.value?.close()
}

function handleDialogClose() {
  dialogTriggerEl.value?.focus()
}

// ── Init ───────────────────────────────────────────────
onMounted(() => {
  const carefree = dataset.tracks.find((t) =>
    t.id === 'carefree' || t.title?.toLowerCase().includes('carefree')
  )
  if (carefree) selectedTrack.value = carefree.id
})
</script>

<template>
  <div class="app">
    <a href="#main" class="skip-link">跳至主内容</a>

    <!-- ── 顶栏 ── -->
    <header class="topbar">
      <div class="brand">
        <h1>声音地图</h1>
        <span class="brand-sub">阶段 2 示例</span>
      </div>
      <div class="search-box">
        <label for="search-input" class="sr-only">搜索音乐</label>
        <input
          id="search-input"
          v-model="searchQuery"
          type="search"
          placeholder="搜索曲目、艺术家、地点…"
          aria-label="搜索音乐"
          autocomplete="off"
        />
        <button v-if="searchQuery" @click="clearSearch" aria-label="清除搜索" class="btn-icon">✕</button>
      </div>
      <div class="topbar-actions">
        <button
          @click="timeMode = timeMode === 'day' ? 'night' : 'day'"
          :aria-label="'切换到' + (timeMode === 'day' ? '夜晚' : '白天') + '模式'"
          class="btn-time"
        >
          <span aria-hidden="true">{{ timeMode === 'day' ? '☀' : '🌙' }}</span>
          {{ timeMode === 'day' ? '白天' : '夜晚' }}
        </button>
      </div>
    </header>

    <!-- ── 主内容 ── -->
    <main id="main" class="main-content">

      <!-- 地图区域 -->
      <section class="map-section" aria-label="示例地图区域">
        <div class="map-header">
          <span class="map-title">示意地形图</span>
          <span class="map-disclaimer">合成示意地图 · 非实际游戏地图 · 真实地图未接入</span>
        </div>

        <div class="map-frame" :class="{ 'route-active': activeView === 'route' }">
          <!-- 地形 SVG（纯装饰） -->
          <svg
            class="map-svg"
            viewBox="0 0 1024 768"
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="map-clip"><rect width="1024" height="768"/></clipPath>
            </defs>
            <g clip-path="url(#map-clip)">
              <!-- 底色 -->
              <rect width="1024" height="768" fill="var(--map-bg)"/>

              <!-- 区域 A：西部林地 -->
              <path d="M0,0 L340,0 L340,768 L0,768 Z"
                fill="var(--region-a)" opacity="0.55"/>
              <!-- 区域 B：中部平原 -->
              <path d="M340,0 L680,0 L680,768 L340,768 Z"
                fill="var(--region-b)" opacity="0.45"/>
              <!-- 区域 C：东部海湾 -->
              <path d="M680,0 L1024,0 L1024,768 L680,768 Z"
                fill="var(--region-c)" opacity="0.45"/>

              <!-- 区域边界参考线 -->
              <line x1="340" y1="0" x2="340" y2="768" stroke="var(--border-strong)" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.4"/>
              <line x1="680" y1="0" x2="680" y2="768" stroke="var(--border-strong)" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.4"/>

              <!-- 等高线 -->
              <g stroke="var(--contour)" fill="none" stroke-width="1" opacity="0.5">
                <path d="M20,100 Q80,80 140,110 Q200,140 260,95 Q310,60 360,90 Q410,120 460,85 Q520,50 580,80 Q640,110 700,70 Q760,30 820,60 Q880,90 950,50 Q990,30 1020,45"/>
                <path d="M10,180 Q70,155 130,185 Q200,215 270,170 Q330,130 390,165 Q450,200 510,155 Q575,110 635,145 Q700,180 760,135 Q830,90 900,120 Q960,150 1010,120"/>
                <path d="M5,270 Q60,240 120,265 Q190,290 260,250 Q330,210 400,245 Q465,280 530,235 Q600,190 665,225 Q730,260 800,215 Q870,170 940,200 Q990,225 1024,205"/>
                <path d="M0,360 Q55,330 115,355 Q185,380 255,340 Q325,300 395,330 Q460,360 530,320 Q600,280 670,310 Q740,340 810,300 Q880,260 950,285 Q1000,305 1024,290"/>
                <path d="M0,450 Q50,420 110,445 Q180,470 250,430 Q320,390 390,420 Q460,450 530,410 Q600,370 670,400 Q740,430 810,395 Q875,360 940,385 Q990,405 1024,390"/>
                <path d="M0,545 Q55,518 115,540 Q185,562 255,525 Q325,488 395,515 Q462,542 533,505 Q602,468 672,495 Q742,522 812,488 Q878,455 945,478 Q992,495 1024,480"/>
                <path d="M0,640 Q58,615 118,637 Q188,659 258,622 Q328,585 398,610 Q465,635 535,600 Q604,565 674,590 Q744,615 814,582 Q882,549 950,570 Q1000,585 1024,572"/>
                <path d="M0,720 Q60,698 120,718 Q190,738 260,704 Q330,670 400,694 Q468,718 538,685 Q607,652 677,675 Q747,698 817,667 Q884,637 952,656 Q1000,668 1024,658"/>
              </g>

              <!-- 主河流 -->
              <path d="M820,0 Q780,80 740,150 Q700,220 720,300 Q740,380 680,450 Q620,520 580,600 Q540,680 520,768"
                stroke="var(--river)" stroke-width="10" fill="none" opacity="0.7" stroke-linecap="round"/>
              <path d="M820,0 Q780,80 740,150 Q700,220 720,300 Q740,380 680,450 Q620,520 580,600 Q540,680 520,768"
                stroke="var(--river-light)" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>
              <!-- 支流 -->
              <path d="M400,200 Q480,250 540,290 Q600,330 660,350"
                stroke="var(--river)" stroke-width="5" fill="none" opacity="0.45" stroke-linecap="round"/>
              <path d="M200,500 Q300,490 380,510 Q460,530 520,560"
                stroke="var(--river)" stroke-width="4" fill="none" opacity="0.4" stroke-linecap="round"/>

              <!-- 路径/道路 -->
              <path d="M50,384 Q200,350 380,384 Q560,418 730,384 Q850,360 970,384"
                stroke="var(--road)" stroke-width="3" fill="none" stroke-dasharray="12 6" opacity="0.6"/>
              <path d="M370,100 Q390,250 380,384 Q370,520 350,680"
                stroke="var(--road)" stroke-width="2" fill="none" stroke-dasharray="8 5" opacity="0.4"/>
              <path d="M680,80 Q695,230 680,384 Q665,540 650,700"
                stroke="var(--road)" stroke-width="2" fill="none" stroke-dasharray="8 5" opacity="0.4"/>

              <!-- 区域标签 -->
              <text x="170" y="680" text-anchor="middle" font-size="18" font-weight="600"
                fill="var(--region-a-text)" opacity="1">示例区域 A</text>
              <text x="510" y="680" text-anchor="middle" font-size="18" font-weight="600"
                fill="var(--region-b-text)" opacity="1">示例区域 B</text>
              <text x="852" y="680" text-anchor="middle" font-size="18" font-weight="600"
                fill="var(--region-c-text)" opacity="1">示例区域 C</text>

              <!-- 比例尺 -->
              <g transform="translate(40, 720)">
                <rect x="0" y="0" width="80" height="8" fill="var(--scale-a)"/>
                <rect x="80" y="0" width="80" height="8" fill="var(--scale-b)"/>
                <text x="0" y="22" font-size="11" fill="var(--map-label)">0</text>
                <text x="75" y="22" font-size="11" fill="var(--map-label)">80</text>
                <text x="155" y="22" font-size="11" fill="var(--map-label)">160 图像单位</text>
              </g>

              <!-- 指南针 -->
              <g transform="translate(960, 60)">
                <circle cx="0" cy="0" r="22" fill="var(--map-bg)" stroke="var(--border)" stroke-width="1.5"/>
                <polygon points="0,-16 5,8 0,4 -5,8" fill="var(--compass-n)" opacity="0.9"/>
                <polygon points="0,16 5,-8 0,-4 -5,-8" fill="var(--compass-s)" opacity="0.55"/>
                <text x="0" y="-18" text-anchor="middle" font-size="9" font-weight="700"
                  fill="var(--compass-n)">N</text>
              </g>

              <!-- 路线草稿 polyline -->
              <polyline
                v-if="activeView === 'route' && routePolylinePoints"
                :points="routePolylinePoints"
                stroke="var(--accent)"
                stroke-width="4"
                fill="none"
                stroke-dasharray="10 5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <!-- 路线起点标记 -->
              <template v-if="activeView === 'route' && routeDraft.length > 0">
                <circle
                  v-for="(id, i) in routeDraft"
                  :key="i"
                  :cx="dataset.locations.find((l) => l.id === id)?.point?.x ?? 0"
                  :cy="dataset.locations.find((l) => l.id === id)?.point?.y ?? 0"
                  :r="i === 0 ? 10 : 6"
                  :fill="i === 0 ? 'var(--accent)' : 'var(--accent-muted)'"
                  stroke="white"
                  stroke-width="2"
                  pointer-events="none"
                />
              </template>
            </g>
          </svg>

          <!-- HTML 按钮叠加：地图位置点 -->
          <button
            v-for="loc in mapLocations"
            :key="loc.id"
            class="map-pin"
            :class="{
              selected: selectedLocation === loc.id && activeView !== 'route',
              'route-pin': activeView === 'route'
            }"
            :style="{
              left: (loc.point.x / 1024 * 100) + '%',
              top: (loc.point.y / 768 * 100) + '%'
            }"
            :aria-label="(
              activeView === 'route'
                ? '将 ' + loc.name + ' 加入路线'
                : loc.name + (selectedLocation === loc.id ? '，已选中' : '')
            )"
            :aria-pressed="activeView !== 'route' ? selectedLocation === loc.id : undefined"
            @click="handleMapPin(loc.id)"
          >
            <span class="pin-letter" aria-hidden="true">{{
              loc.id === 'location-a' ? 'A' : loc.id === 'location-b' ? 'B' : 'C'
            }}</span>
          </button>
        </div>

        <!-- 图例 -->
        <div class="map-legend" aria-label="地图图例">
          <span class="legend-dot region-a-dot" aria-hidden="true"></span><span>示例区域 A</span>
          <span class="legend-dot region-b-dot" aria-hidden="true"></span><span>示例区域 B</span>
          <span class="legend-dot region-c-dot" aria-hidden="true"></span><span>示例区域 C</span>
          <span v-if="activeView === 'route'" class="legend-route">路线草稿模式：点击地图位置添加路点</span>
        </div>
      </section>

      <!-- ── 侧栏 ── -->
      <aside class="sidebar" aria-label="音乐与路线面板">
        <nav class="tab-nav" aria-label="面板导航">
          <button
            @click="activeView = 'music'"
            :class="{ active: activeView === 'music' }"
            :aria-current="activeView === 'music' ? 'page' : undefined"
          >音乐</button>
          <button
            @click="activeView = 'route'"
            :class="{ active: activeView === 'route' }"
            :aria-current="activeView === 'route' ? 'page' : undefined"
          >路线</button>
          <button
            ref="dialogTriggerEl"
            @click="openResourceDialog"
            class="tab-about"
          >资源说明</button>
        </nav>

        <!-- 音乐面板 -->
        <div v-if="activeView === 'music'" class="panel music-panel">

          <!-- 搜索结果 -->
          <section v-if="searchQuery.trim()" class="panel-section">
            <h2 class="panel-heading">搜索结果</h2>
            <ul v-if="searchResults.length" class="track-list">
              <li v-for="track in searchResults" :key="track.id">
                <button
                  class="track-btn"
                  :class="{ active: selectedTrack === track.id }"
                  @click="selectTrack(track.id)"
                >
                  <span class="track-title">{{ track.title }}</span>
                  <span class="track-meta">{{ track.artists?.join(', ') }}</span>
                  <span v-if="track.origin === 'genshin-catalog'" class="badge badge-catalog">原神目录</span>
                </button>
              </li>
            </ul>
            <div v-else class="empty-state">
              <p>未找到匹配曲目</p>
              <button class="btn-link" @click="clearSearch">清除搜索</button>
            </div>
          </section>

          <!-- 无搜索：地点曲目 + 原神目录 -->
          <template v-else>
            <section v-if="selectedLocation" class="panel-section">
              <h2 class="panel-heading">
                {{ selectedLocationName }} · {{ timeMode === 'day' ? '白天' : '夜晚' }}
              </h2>
              <ul v-if="filteredTracks.length" class="track-list">
                <li v-for="track in filteredTracks" :key="track.id">
                  <button
                    class="track-btn"
                    :class="{ active: selectedTrack === track.id }"
                    @click="selectTrack(track.id)"
                  >
                    <span class="track-title">{{ track.title }}</span>
                    <span class="track-meta">{{ track.artists?.join(', ') }}</span>
                  </button>
                </li>
              </ul>
              <p v-else class="empty-state">当前时段该位置暂无可用曲目</p>
            </section>
            <section v-else class="panel-section empty-state">
              <p>点击地图上的位置点查看关联音乐</p>
            </section>

            <!-- 原神目录折叠 -->
            <section class="panel-section genshin-section">
              <button
                class="section-toggle"
                :aria-expanded="showGenshinList"
                @click="showGenshinList = !showGenshinList"
              >
                <span>原神目录（待核实）</span>
                <span class="toggle-icon" aria-hidden="true">{{ showGenshinList ? '▲' : '▼' }}</span>
              </button>
              <p class="section-note">原神条目无音源 · 地点待核实 · 作为目录参考收录</p>
              <ul v-if="showGenshinList" class="track-list">
                <li v-for="track in genshinTracks" :key="track.id">
                  <button
                    class="track-btn"
                    :class="{ active: selectedTrack === track.id }"
                    @click="selectTrack(track.id)"
                  >
                    <span class="track-title">{{ track.title }}</span>
                    <span class="track-meta">{{ track.artists?.join(', ') }}</span>
                    <span class="badge badge-catalog">目录条目</span>
                  </button>
                </li>
              </ul>
            </section>

            <!-- 收藏/列表入口（阶段4占位） -->
            <section class="panel-section stage-placeholders">
              <p class="section-label">阶段 4 功能入口（当前不可用）</p>
              <div class="placeholder-row">
                <button disabled class="btn-placeholder" aria-describedby="stage4-note">⭐ 收藏</button>
                <button disabled class="btn-placeholder" aria-describedby="stage4-note">📋 播放列表</button>
                <button disabled class="btn-placeholder" aria-describedby="stage4-note">✏️ 编辑简介</button>
                <button disabled class="btn-placeholder" aria-describedby="stage4-note">⬆ 导入</button>
              </div>
              <p id="stage4-note" class="notice-text">上述功能将在阶段 4 接入，暂不存储本地数据</p>
            </section>
          </template>

          <!-- 曲目详情 -->
          <section
            v-if="currentTrackDetail"
            id="track-detail"
            class="track-detail"
            aria-label="选中曲目详情"
          >
            <h3 class="detail-title">{{ currentTrackDetail.track.title }}</h3>

            <!-- 许可标识 -->
            <div class="badge-row">
              <span
                v-if="currentTrackDetail.track.origin === 'licensed-demo'"
                class="badge badge-licensed"
              >非原神许可示例</span>
              <template v-if="currentTrackDetail.track.origin === 'genshin-catalog'">
                <span class="badge badge-catalog">目录条目</span>
                <span class="badge badge-no-audio">无音源</span>
                <span
                  v-if="currentTrackDetail.locationEntries.every((e) => !e.location?.point)"
                  class="badge badge-warn"
                >地点待核实</span>
                <span
                  v-if="currentTrackDetail.assocs.some((a) => a.timeCondition === 'unknown')"
                  class="badge badge-warn"
                >昼夜未知</span>
              </template>
            </div>

            <dl class="detail-list">
              <dt>艺术家</dt>
              <dd>{{ currentTrackDetail.track.artists?.join(', ') || '未知' }}</dd>
              <dt>作曲</dt>
              <dd>{{ currentTrackDetail.track.composers?.filter(Boolean).join(', ') || '未知' }}</dd>
              <dt>专辑</dt>
              <dd>{{ currentTrackDetail.track.album || '未知' }}</dd>
              <dt>发行</dt>
              <dd>{{ currentTrackDetail.track.releaseDate || '未知' }}</dd>
              <template v-if="currentTrackDetail.track.durationSeconds">
                <dt>原作品时长</dt>
                <dd>{{ formatTime(currentTrackDetail.track.durationSeconds) }}</dd>
              </template>
              <template v-if="currentTrackDetail.track.origin === 'licensed-demo'">
                <dt>许可片段</dt>
                <dd>12 秒片段（开头 0–12 秒）</dd>
              </template>
            </dl>

            <p v-if="currentTrackDetail.track.description" class="detail-desc">
              {{ currentTrackDetail.track.description }}
            </p>

            <!-- 关联地点列表 -->
            <div class="detail-locations">
              <h4>关联地点</h4>
              <ul class="location-list">
                <li v-for="entry in currentTrackDetail.locationEntries" :key="entry.assoc.trackId + entry.assoc.locationId">
                  <span class="loc-name">{{ entry.location?.name ?? entry.assoc.locationId }}</span>
                  <span class="loc-time">
                    {{ entry.assoc.timeCondition === 'day' ? '白天'
                      : entry.assoc.timeCondition === 'night' ? '夜晚'
                      : entry.assoc.timeCondition === 'any' ? '全天'
                      : '时段未知' }}
                  </span>
                  <span v-if="entry.assoc.evidenceStatus === 'pending'" class="badge badge-warn">候选·待确认</span>
                  <span v-if="!entry.location?.point" class="badge badge-muted">无坐标</span>
                  <button
                    v-if="entry.location?.point && activeView === 'music'"
                    class="btn-link"
                    @click="selectedLocation = entry.location.id"
                    :aria-label="'在地图定位 ' + entry.location.name"
                  >定位 ↗</button>
                </li>
              </ul>
            </div>

            <!-- 来源链接 -->
            <div v-if="currentTrackDetail.sources.length" class="detail-sources">
              <h4>来源</h4>
              <ul class="source-list">
                <li v-for="src in currentTrackDetail.sources" :key="src.id">
                  <a
                    v-if="isValidUrl(src.url)"
                    :href="src.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ src.description || src.id }}</a>
                  <span v-else>{{ src.description || src.id }}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <!-- 路线面板 -->
        <div v-else-if="activeView === 'route'" class="panel route-panel">
          <h2 class="panel-heading">路线草稿</h2>
          <p class="notice-text">路线模式：点击地图上的位置添加路点（允许重复进入）</p>

          <div class="route-controls">
            <button
              @click="removeLastFromRoute"
              :disabled="!routeDraft.length"
              class="btn-secondary"
            >撤销最后一点</button>
            <button
              @click="clearRoute"
              :disabled="!routeDraft.length"
              class="btn-secondary"
            >清除全部</button>
          </div>

          <ol v-if="routeDraft.length" class="route-list" aria-label="路线草稿">
            <li v-for="(id, i) in routeDraft" :key="i" class="route-item">
              <span class="route-step-marker" aria-hidden="true">{{ i === 0 ? '▶' : '●' }}</span>
              {{ dataset.locations.find((l) => l.id === id)?.name ?? id }}
              <span v-if="i === 0" class="badge badge-start">起点</span>
            </li>
          </ol>
          <p v-else class="empty-state">尚未添加任何路点</p>

          <div class="route-settings">
            <label class="setting-label">
              移动速度
              <div class="setting-input-row">
                <input
                  v-model.number="routeSpeed"
                  type="number"
                  min="1"
                  max="20"
                  class="speed-input"
                  aria-label="路线移动速度，图像单位每秒"
                />
                <span class="unit-label">图像单位/秒</span>
              </div>
              <span class="notice-text">仅作未来设置预览，不可用于实际模拟</span>
            </label>
          </div>

          <div class="stage-notice" role="note">
            <div class="stage-notice-buttons">
              <button disabled aria-disabled="true" class="btn-disabled">开始模拟</button>
              <button disabled aria-disabled="true" class="btn-disabled">暂停</button>
            </div>
            <p class="notice-text">路线模拟移动将在阶段 5 接入</p>
          </div>

          <p class="notice-text route-search-note">搜索音乐请切换到「音乐」面板</p>
        </div>
      </aside>
    </main>

    <!-- ── 播放器底栏 ── -->
    <footer class="player-bar" aria-label="播放器（播放引擎阶段 4 接入）">
      <div class="player-info">
        <span class="player-title">{{
          currentTrackDetail?.track.title ?? (selectedTrack ? dataset.tracks.find((t) => t.id === selectedTrack)?.title : '未选择曲目')
        }}</span>
        <span class="player-artist" v-if="currentTrackDetail">{{
          currentTrackDetail.track.artists?.join(', ')
        }}</span>
      </div>
      <div class="player-center">
        <div class="player-controls">
          <button disabled aria-label="上一曲" title="上一曲">⏮</button>
          <button disabled aria-label="播放/暂停" title="播放（未接入）" class="play-btn">▶</button>
          <button disabled aria-label="下一曲" title="下一曲">⏭</button>
        </div>
        <div class="player-progress">
          <span class="time-label">0:00</span>
          <input
            type="range" min="0" max="100" value="0"
            disabled
            aria-label="播放进度（未接入）"
            class="progress-bar"
          />
          <span class="time-label" title="尚未加载音频；原作品时长见曲目详情">--:--</span>
        </div>
      </div>
      <div class="player-extra">
        <button disabled aria-label="随机播放" title="随机播放">🔀</button>
        <button disabled aria-label="循环播放" title="循环播放">🔁</button>
        <input
          type="range" min="0" max="100" value="80"
          disabled
          aria-label="音量（未接入）"
          class="volume-slider"
        />
        <button disabled aria-label="播放队列" title="播放队列">≡</button>
      </div>
      <span class="player-status">播放引擎阶段 4 接入</span>
    </footer>

    <!-- ── 资源说明 dialog ── -->
    <dialog
      ref="dialogRef"
      class="resource-dialog"
      aria-labelledby="dialog-title"
      @close="handleDialogClose"
    >
      <div class="dialog-inner">
        <h2 id="dialog-title" class="dialog-heading">资源说明</h2>

        <section class="dialog-section">
          <h3>开发阶段</h3>
          <ul class="stage-list">
            <li><strong>阶段 2（当前）：</strong>地图界面、音乐检索、路线草稿</li>
            <li><strong>阶段 3：</strong>地图与双向检索接入</li>
            <li><strong>阶段 4：</strong>播放引擎、收藏列表、本地导入、编辑功能</li>
            <li><strong>阶段 5：</strong>按区域切歌、路线模拟移动</li>
          </ul>
        </section>

        <section class="dialog-section">
          <h3>资源状态</h3>
          <ul class="status-list">
            <li>真实地图 <strong>未接入</strong>（阶段 3）</li>
            <li>原神条目 <strong>无音源</strong>，地点待核实，仅作目录参考</li>
          </ul>
        </section>

        <section class="dialog-section">
          <h3>许可样本音源</h3>
          <p><strong>Carefree</strong> 和 <strong>Brittle Rille</strong></p>
          <p>作者：Kevin MacLeod (incompetech.com)</p>
          <p>
            许可：<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons CC BY 4.0</a>
          </p>
          <p class="small-text">使用开头 0–12 秒剪辑，转 PCM 格式，非原神 OST</p>
        </section>

        <button @click="closeResourceDialog" class="btn-primary dialog-close" autofocus>
          关闭
        </button>
      </div>
    </dialog>
  </div>
</template>
