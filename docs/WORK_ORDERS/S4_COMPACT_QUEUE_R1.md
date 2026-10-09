# 完整右栏队列 UI（拆小工单）

实际CLI请求claude-opus-5-5/high，禁工具、不提交、不碰凭据数据。只返回JSON {"files":[{"path":"src/components/PlaybackQueue.vue","content":"完整Vue SFC含scoped CSS"}],"notes":[]}。不输出推理/围栏。简洁约130行以内。

参考Spotify队列清晰组织，保留浅纸/蓝灰/金线。root .playback-queue id=playback-queue role=region aria-label=播放队列，供App右栏完整填充，height100% min-height0 display:flex column，不浮出地图。App已给root position:absolute inset0在右栏内，负责220ms过渡。顶header h2.s4c-queue-title tabindex=-1便于Appfocus，关闭UiButton label=收起队列 icon=close emit close()。当前曲突出文本/title、artist，label当前曲目/正在播放。下面.s4c-queue-scroll flex1 min-height0 overflow-y:auto独立滚动。清空button，队列每项title/artist，当前项 aria-current=true和金色侧线。每项操作play/up/down/remove，明确按钮与同曲目绑定。无效ID显示曲库中已不可用和id，不可play但可remove。空队列显示队列为空。不展示来源或普通播放统计。

imports reactive/computed；MusicTrack ../domain/contracts；useMusicPlayer仅类型导入../services/music-player；UiButton本目录。props player:ReturnType<typeof useMusicPlayer>,tracks:MusicTrack[]；emit close()。state=reactive(props.player)自动解包，字段 currentTrack,currentId,queueIds,playing；methods playTrack(id,queueIds),moveInQueue(id,-1|1),removeFromQueue(id),clearQueue()。title sceneInfo?`${wikiTitle} / ${englishTitle}`:title；artists.join('、')；computed Map性能。UiButton props label,icon,text?,pressed?,disabled?，emit click，attrs透传及hover/focus tooltip已有。label播放队列曲目/上移/下移/移除/清空队列，排序边界disabled。

轻量图标button不要厚重方框，hover浅金、focus清楚，padding充足，title溢出ellipsis/title，320手机右内容约240px需适配，动作可第二行。vars --paper #f4efe6,--paper-2 #ebe3d5,--ink #2f3545,--ink-soft #5b6375,--slate #3b4255,--gold #c8ad7f,--gold-soft #e6d3ad,--gold-line。用s4c-内部类，不使用旧queue-panel。尊重reduced-motion。
