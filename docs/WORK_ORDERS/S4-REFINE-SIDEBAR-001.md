# 阶段4视觉返修：右侧曲目与点位

指定claude-opus-5-5/effort=high，原神纸面蓝灰金线；你负责右栏UI/排版/图标/tooltip，Codex负责业务、审核与落盘。工具禁用，没有直接文件权限；不改业务/数据/存储/Git。仅src/components/MusicSidebar.vue，src/style.css只cssAppend追加，不返回整体CSS。返回严格JSON {files:[{path,content}],cssAppend:string,notes:[]}，完整MusicSidebar.vue及少量CSS，正确转义无围栏。

## 共享组件契约（另工单交付，可直接使用）

- UiIcon.vue props name，SVG统一图标。
- UiButton.vue props label:string/icon:string/pressed?:boolean/disabled?:boolean，原生attrs和click透传，aria-label=label，hover/focus显示小tooltip；可import。
- TrackActions.vue props track:MusicTrack/player/collection/contextIds:string[]；emit open-library(payload:{trackId:string})；内含播放此曲/加入队列/收藏取消/添加到播放列表。菜单没有歌单时“创建播放列表”emit，由App打开左栏并保留待添加曲。布局紧凑，外层必须属于对应曲目卡片，不插到上下两首之间共享。
- 本MusicSidebar新增emit open-library(payload:{trackId?:string})，直接转发TrackActions emit；App绑定并调用libraryPanel.show('playlists',payload.trackId||'')。props explorer/player/collection仍现有返回值；reactive解包不再.value。
- explorer增加favoritesOnly boolean、editingEnabled默认false、setEditingEnabled()只有DEV真。开发控件必须state.developmentMode && state.editingAvailable && state.editingEnabled三者成立。不能仅DEV就直接露“移除关联”；App有独立开发编辑开关。
- favoritesOnly业务搜索已实现，与文字/专辑/国家一级二级交集。collectionState.isFavorite(trackId)用于星标状态，原收藏数据保留；曲目检索支持“仅收藏”filter/switch可鼠标键盘，空收藏明确。

## 要求

1. 曲目检索结果和锚点关联曲目每首用**有边界/背景/留白的卡片**容纳标题、艺人、原文出处、收藏星标和同卡操作区，必要窄栏换行；动作明确所属track id。列表结果卡片.info点击进详情，按钮不得嵌套button，不串曲。锚点原曲目与出处/曲目—点位关系不改。
2. 两种列表标题旁已收藏星标aria-label“已收藏”，可见图标；单曲详情标题与操作一体。TrackActions重用，无源码服务修改。播放context在锚点使用anchorTracks.map(id)，检索使用state.searchTracks.map(id)，不影响浏览而自动播放。
3. 单曲详情只保留**基本信息（默认展开）**和**关联点位**两大details。删“我的评价”整个编辑/展示/相关草稿与watch；删独立“曲目说明”“歌曲元数据来源”“完整元数据”details。将原完整元数据中的出处原文、主要地区、统一分类路径、细目录等拼在基本信息现有字段之后，保持原数据未知字段/出处。Wiki来源和metadataNotes可在基本信息内原字段展示（用户要求完整数据合并，但不再单列来源下拉），不渲染track.description或单独sourceUrl面板。网易曲目ID可保留普通链接，去“artist字段”等实现注释。不得改数据文件或清除历史评价localStorage。
4. 关联点位仍只说明/类型ID/无坐标提示，不显示关联缘由与统计核实数/资源来源。在地图上定位全部继续保留，与details四周至少12px边距。locateAnchor与全部高亮现有业务保留。默认开发编辑全隐藏，明确启用才见添加/移除/恢复，区块与用户操作视觉隔开。
5. 点位信息/归类证据原有保留，但可将开发性证据只在editingEnabled显示，普通用户地理未知不能假已核实。没有昼夜页面，出处中的时段词保留。
6. 完全取消导出当前曲库按钮和导入界面（App工单已处理），开发保存status仅editor开启显示，不打扰普通浏览。把此前搜索“个人评价”文案去掉，但不改数据库。
7. 为你实现的交互按钮/summary提供hover/focus说明提示，优先UiButton；纯文字tabs可title或简短提示，收藏标记明确。使用已有class .detail-view/.tracks-list/.track-detail/.track-list/.track-item/.location-list/.anchor-info/.origin-text/.geo-scope-list以利回归；每卡添加data-track-id，TrackActions在内。保留defineExpose showAnchor/showTrack、Escape回检索/点位并焦点、各列表的keyboard操作。
8. 390/320手机无横溢出，长内容滚动；无中心modal、prompt、confirm；reduce motion样式另工单负责全局。

保留原候选编辑函数/来源和恢复语义，edit调用由Codex service额外gate。notes只交付说明，不声称已运行构建或测试。
