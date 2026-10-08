# 阶段4拆分返修：播放器与共享控件

S4-REFINE-SHELL-001因900秒超时无交付，现缩小范围。同一真实模型claude-opus-5-5/effort high，stdin、禁用工具；你负责视觉/图标/排版，Codex业务/审核落盘。交付紧凑完整可运行Vue代码，避免过长。

严格JSON {files:[{path,content}],cssAppend:string,notes:[]}，正确转义无围栏。仅src/components/PlayerBar.vue、UiIcon.vue、UiButton.vue、TrackActions.vue完整交付；CSS仅追加(.s4r前缀)，不返回全CSS，不改服务/Git。

UiIcon props name:string，SVG统一图标，无emoji；支持play/pause/previous/next/star/queue/shuffle/repeat/repeat-one/volume/library/chevron-left/right/close/plus/info/search/trash/edit/arrow-up/down，右栏已经引用locate、arrow-left（别漏）。

UiButton props label/icon/pressed?/disabled?，原生attrs/click透传，aria-label=label，disabled不触发click；图标按钮。slot有内容则渲染文字，默认图标为主；右栏play-all-btn/locate-btn/back-to-anchor-btn没有slot，需要按这些class或新增text prop渲染label。真正hover与focus小tooltip(role=tooltip)，可Teleport body按getBoundingClientRect定位，防越屏，scroll/resize清理。无复杂依赖。

TrackActions props track:MusicTrack/player:ReturnType<useMusicPlayer>/collection:ReturnType<useMusicCollection>/contextIds:string[]；emit open-library({trackId:string})。卡片内紧凑图标，aria-label分别播放此曲/加入队列/收藏或取消收藏/添加到播放列表，播放传contextIds，只操作props.track.id；菜单无列表时“创建播放列表”emit打开左栏保留待添加曲，已有列表点击collection.addToPlaylist并仅成功关闭，提供“管理播放列表”打开左栏。失败反馈显示collection.message、加入队列简短feedback不串曲。不用中心dialog/prompt/confirm。播放器当前曲可收藏，两个收藏button aria-label区分。

PlayerBar保持现有props与emit show-track(id)。常驻实例不改音频逻辑。左右等宽grid=minmax(0,1fr) auto minmax(0,1fr)，中心控制真正居中，标题溢出省略；seek第二行全宽，音量/模式/队列在右，手机控制和信息合理折行无横溢出。正常来源/播放状态文字不显示，用icon/aria-pressed；真实error/unavailable/blocked与storageMessage必须可见，loading精简、恢复短提示可见。duration未知--:--；进度与音量键盘可用。queue仅右上展开相邻面板，不能盖自己的收起按钮，可删除失效ID、上下排序、清空。UiButton hover/focus说明，减少常驻长文。无emoji。使用旧.player-bar/.player-title/.player-status/.queue-panel便于回归。reduced motion全局支持。

服务接口由上下文可见，不改服务。不写音源来源（网易外链等）在播放器。notes仅说明交付和实际未运行验证。
