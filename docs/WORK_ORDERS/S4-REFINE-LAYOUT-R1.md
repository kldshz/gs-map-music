# 阶段4拆分返修：应用壳与左侧个人库

大工单900秒超时无可用交付；固定claude-opus-5-5/effort high，stdin禁用工具。你主导UI排版/交互/CSS，Codex负责业务服务；紧凑完整交付可运行代码。

严格JSON {files:[{path,content}],cssAppend:string,notes:[]}，正确转义无围栏。只src/App.vue和src/components/PersonalLibrary.vue完整文件；CSS追加.s4r前缀，不全量返回，不改服务/数据/Git。共享UiIcon/UiButton/TrackActions正在独立工单交付，可以引用。UiButton props label/icon/pressed?/disabled?，图标+tooltip，slot可见文字，native attrs/click透传；UiIcon name统一SVG。

Codex既有业务接口必须使用：App先collection=useMusicCollection，再explorer=useExplorer({favorites:()=>collection.favorites.value})，player=useMusicPlayer(()=>explorer.tracks.value)，libraryPanel=useLibraryPanel(collection,()=>explorer.tracks.value,player)。libraryPanel接口详见上下文，不重写业务；可reactive(props.panel)解包。PersonalLibrary props panel/player/collection/tracks，emit show-track(id)。左栏open默认false，tab收藏/播放列表；清晰创建入口newName，create成功可自动添加pending曲，failed保留。待添加曲显示标题与取消，已有歌单addPending(listId)；选择歌单selectPlaylist，搜索query作用收藏/选中歌单，playAll，play(id,contextIds)，rename/save/cancel/delete，collection.movePlaylistTrack/removeFromPlaylist。列表排序边界按原selectedPlaylist.trackIds而不是过滤后位置。失效ID不可播放但可删除。无prompt/confirm中心弹窗。说明播放列表就是歌单，仅此浏览器保存。创建空列表时明显说明可从右栏添加歌曲；左栏收藏每曲可看详情与收藏取消。使用.personal-library/.playlist-summary/.playlist-tracks/.playlist-empty等class便于测试。

App地图和PlayerBar始终挂载，左右栏是侧边，不中心modal。左栏个人库，右栏MusicSidebar；左右收拢width/grid/flex + opacity/transform动画，内容关闭inert隐藏不可tab。移动320/390不能挤地图至0或横溢出，可叠在地图边缘的侧抽屉，明确关闭与Esc，焦点返回触发按钮；打开一侧时手机另一侧可收起。右栏默认开，左默认关。播放器footer保持可见。

MusicSidebar新增emit open-library({trackId?:string})，App libraryPanel.show('playlists',payload.trackId||'')；PersonalLibrary show-track→sidebar.showTrack并展开右栏。PlayerBar show-track同理。左右栏按钮aria-label展开个人库/收起个人库、展开面板/收起面板；开发开关仅DEV=explorer.developmentMode出现checkbox label精确“开发关联编辑”，调用setEditingEnabled，默认关闭。不因切地图而自动播放。

删App所有导入导出音乐库入口/评价搜索label/旧右栏个人库；header搜索aria-label和placeholder精确“搜索点位、曲目、专辑、地区或细分目录”。header filter/select保持。地图source attribution已有，不需footer挤文字。布局原神浅纸蓝灰金线、统一SVG，不emoji；所有交互按钮可UiButton tooltip或简短title，prefers-reduced-motion。不改媒体/数据契约，不新增路线/账号/音频功能，notes不声称运行验证。
