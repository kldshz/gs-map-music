# 阶段4视觉返修：播放器、左侧个人库与应用壳

实际指定claude-opus-5-5，effort=high。你主导UI/icon/排版/动画，不修改Codex业务服务。保持Vue/Vite，无新增依赖，原神纸面蓝灰金线风格。旧播放器严重偏斜，要求克制整齐居中、真正等重左右和中心控制。必须交付可运行代码；不做中心弹窗。

## 所有权和输出

严格JSON {files:[{path,content}],cssAppend:string,notes:[]}，无围栏。完整输出只允许src/App.vue、src/components/PlayerBar.vue、src/components/PersonalLibrary.vue，以及新增src/components/UiIcon.vue、src/components/UiButton.vue、src/components/TrackActions.vue。不要返回src/style.css整体；仅cssAppend追加使用.s4r前缀或足够优先级覆盖旧规则，Codex审核落盘。上下文src/style.css仅参考，不写业务服务/测试/数据/Git。工具禁用，交付由Codex落盘。所有JSON字符串正确转义。

## Codex业务接口（已实现，请消费勿重写）

- App先const collection=useMusicCollection();再const explorer=useExplorer({favorites:()=>collection.favorites.value});const player=useMusicPlayer(()=>explorer.tracks.value);const libraryPanel=useLibraryPanel(collection,()=>explorer.tracks.value,player)。播放器不因左右栏/地图变化卸载。
- library-panel.ts返回ref/computed，组件可reactive(props.panel)自动解包。props PersonalLibrary需panel/player/collection/tracks；emit show-track(id)。panel.open/tab(favorites|playlists)/query/newName/selectedPlaylistId/pendingTrackId/renameId/renameName/selectedPlaylist/favoriteIds/playlistIds/trackMap；show(tab?,pendingTrackId?)、toggle、close、selectPlaylist(id)、create()（可创建并将pending曲加入列表，成功才清草稿）、addPending(listId)、beginRename/cancelRename/saveRename、removePlaylist、play(id,contextIds)、playAll()。所有业务在service；UI只表单/焦点/触发。
- useExplorer增加favoritesOnly布尔ref，筛选已实现交集；editingEnabled默认false；setEditingEnabled(bool)只有DEV允许。开发用户必须明确勾选“开发关联编辑”后才看到编辑控件，生产不显示该开关。不要创建新安全权限。
- MusicSidebar新增emit open-library({trackId?:string})，App响应libraryPanel.show('playlists',trackId||'')。另props不变。下一工单改Sidebar；此工单只将事件绑定，保证布局。
- TrackActions为通用紧凑歌曲操作：props track:MusicTrack/player/collection/contextIds:string[]；emit open-library({trackId:string})。playTrack(id,contextIds)、enqueue(id)、toggleFavorite(id)、addToPlaylist(listId,id)。每图标aria-label明确如“播放此曲”“加入队列”“收藏/取消收藏”“添加到播放列表”。歌单其实播放列表，可清楚称“播放列表（歌单）”。菜单没有列表时提供“创建播放列表”，emit打开左栏并保留此曲pending；已有菜单可添加指定列表并反馈，业务save失败不可假成功。单个实例属于调用者所在歌曲卡片，禁止全局共享会串曲目的popover。可以提供简短title，加入队列反馈需要明确与当前歌曲关联。
- UiIcon统一SVG线条图标，无emoji字体图标；支持play/pause/previous/next/star/queue/shuffle/repeat/repeat-one/volume/library/chevron-left/right/close/plus/info/search/trash/edit/arrow-up/down等必要名称。
- UiButton复用按钮/图标与真正hover及focus小tooltip（role=tooltip），props label/icon/pressed?/disabled?；透传原生事件/attrs，aria-label必须保留，disable不触发click。tooltip不要被播放器/sidebar overflow裁掉，可Teleport body依trigger getBoundingClientRect定位、scroll/resize关闭或更新，事件清理。触屏不用悬停才能理解功能，键盘focus可见，reduce-motion支持。其他交互按钮/summary也加简短提示，避免所有提示常驻挤页面。

## 产品要求

1. 左侧边栏明确“个人库”，收藏索引搜索，播放列表创建入口**常见即可见**，列表选中/命名/增加当前待添加曲/增删排序/播放；保留localStorage数据。说明一句“播放列表就是你整理的歌单，仅在此浏览器保存”。无prompt/confirm。点击歌曲信息可在右侧显示，不变当前播放。
2. 左右收拢有平滑动画（width/grid/flex或opacity/translate），隐藏内容inert/不可tab焦点，prefers-reduced-motion；手机左右栏不得挤地图至0，不横向溢出，可采用地图旁层叠抽屉但不中心弹窗，有明确关闭/ESC。不要两个sidebar一起过大，保持地图主体。
3. App完全移除音乐JSON导入/导出入口和我的评价搜索文案，无input file；不改保存的历史个人评价数据。header搜索label改“搜索点位、曲目、专辑、地区或细分目录”。开发编辑开关放开发独立区默认关闭，普通浏览连在DEV都没有移除关联按钮。右栏MusicSidebar默认点位目录，保留ref.showAnchor/showTrack和现有事件。
4. 播放器不显示网易公开外链/真实音频等来源，正常播放暂停/随机循环/音量用状态图标/aria-pressed即可。仍必须可见显示**无音源/加载失败/浏览器限制/存储损坏**等实际错误，加载用图标/精简反馈，恢复可简短不挤。隐藏正常source状态只视图层，不改player业务。
5. 播放器中心控制居中，标题和左右工具合理宽度；seek/volume可键盘操作，duration未知--:--，queue含失效ID可移除，来源不显示；队列不能覆盖自己关闭按钮。删除/排序/收藏一致视觉；map attribution保留可在地图内已有来源，不重复挤footer。
6. 不新增路由/账号/昼夜/路线/音频下载/新数据；保持媒体实例与资源服务不变。

notes说明修改和限制，不声称运行检查（由Codex执行）。尽量紧凑、完整，避免庞大不必要代码。
