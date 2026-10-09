# S4 紧凑播放器与右栏队列设计

Codex 负责业务与落盘，你负责真实前端视觉/交互设计。本机 CLI 明确请求 claude-opus-5-5 / high，工具禁用；不得提交、访问凭据、改动数据或路线功能。

参考 Spotify 的组织：桌面底部紧凑三分区，左歌曲占位封面/名称/艺人/收藏/详情（长文 title），中第一行随机、上一首、突出播放暂停、下一首、循环，第二行时间/进度/时长（进度限定中部），右队列、静音和音量。保持浅纸/蓝灰/金线现有风格，图标按钮轻量有明显 hover/focus/pressed/disabled。手机另用两行/三行紧凑布局，无横向溢出。普通恢复/缓冲提示用内联短状态或 sr-only，不长期加高；真实错误需可见。现无已核实封面字段，使用 SVG 音符占位，不编造封面接口。

输出两个完整 Vue SFC（包含 scoped CSS），JSON 格式 {"files":[{"path":"src/components/PlayerBar.vue","content":"..."},{"path":"src/components/PlaybackQueue.vue","content":"..."}],"notes":["..."]}，不要围栏，不输出内部推理。

PlayerBar props 保留 player/collection/tracks，增加 queueOpen:boolean；emit show-track(id), toggle-queue()。queueOpen 由 App 管理，组件内不存队列显示状态，删除旧浮动 queue-panel。业务 service 已由 Codex 提供 toggleMute() 与 volume(ref)；volume===0 表示静音，静音按钮使用 volume/mute（Codex补mute图标）。既有方法不改。保留 .player-bar, .player-title, .player-status（只有错误时）、可访问进度/音量标签、播放/循环等现有 label，布局其余统一新 s4c- 前缀避免历史 CSS。root 使用 player-bar s4c-player，scoped CSS 需要抵抗历史 body .app-footer .ui-button 等选择器（使用 :global 或足够 specificity）。桌面高度目标约 82–92px，主要控制居中，左右等宽，两侧不挤中心，最小桌面768以上。

PlaybackQueue props player/tracks，emit close()。供 App 的右栏内容区完整填充，不 absolute 浮出、不含动画（App Transition 负责）。独立滚动，顶标题+关闭，当前曲突出，队列每项播放/上移/下移/移除，清空、无效曲处理保留。root class playback-queue（不要旧 queue-panel），以 s4c- 前缀 CSS，flex height:100% min-height:0；内部 overflow-y:auto。当前曲 title 也包含 wikiTitle/englishTitle。UiButton提供tooltip与aria-pressed。

CSS vars --paper,#f4efe6; --paper-2,#ebe3d5; --ink,#2f3545; --ink-soft,#5b6375; --slate,#3b4255; --slate-2,#4a5366; --gold,#c8ad7f; --gold-soft,#e6d3ad; --gold-line。支持 reduced-motion。不要另造收藏/歌单逻辑，不把个人库入口放底部。
