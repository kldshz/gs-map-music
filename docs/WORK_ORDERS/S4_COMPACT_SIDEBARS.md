# S4 左栏图标导航及完整右栏队列设计

你主导 UI，Codex 已实现 App 状态逻辑与导航结构。实际 CLI 请求 claude-opus-5-5/high；禁工具、不得改数据、凭据、路线、提交。输出 JSON {"files":[{"path":"src/compact-layout.css","content":"完整CSS"}],"notes":["..."]}，不要内部推理/围栏。只输出该 CSS，Codex 在 style.css 后引入。不要改 App 的业务代码。

任务：保留浅纸/蓝灰/克制金线，参考 Spotify 的组织，不复制品牌。请设计现有 App 新增 .s4c-library/.s4c-library-rail/.s4c-side-panel/.s4c-explorer-view/.s4c-footer 和 queue transition。左栏默认收拢为一列约52px图标导航（library/star/queue），展开为 rail+个人库内容，收藏/歌单入口 tooltip 由 UiButton 实现。个人库内容沿用 PersonalLibrary，不另造管理入口。收拢内容 inert，rail始终可用。桌面地图自动占释放空间，左右栏有平滑 width/flex-basis transition；内容不要压缩排版，固定内宽 clip。手机左rail约44px始终保留，展开抽屉占 main 内（不覆盖header/footer），右栏使用现有抽屉，宽度应给左rail留空间。320px不得横向溢出，map至少240px高，左右抽屉不会同时打开（Codex状态逻辑），无中心弹窗。

右panel-content完整内容，MusicSidebar 始终挂载 .s4c-explorer-view v-show，队列组件 .playback-queue v-if Transition name=s4c-queue，根需 full area、height:100% min-height:0；队列内部滚动由该组件CSS负责。动画 enter/leave opacity + translateY(12px), 220ms。关闭过程中 explorer已显示可被队列覆盖，仅覆盖右栏范围。尊重 prefers-reduced-motion。

重要：src/style.css 存在历史高specificity覆盖，必须以 body .app-main > .s4r-library-sidebar.s4c-library 等更强selector定向重置。不改无关地图、歌曲卡、头部。底部播放器将独立新组件 scoped CSS根 .player-bar.s4c-player，布局 .s4c-player-grid / .s4c-player-left / .s4c-player-center / .s4c-player-right。在本文件清掉历史footer min-height:110/130px、padding:8px 44px、flex以致过高，footer稳定由新播放器内容定高。旧播放器内部历史s4r-class不用再写。UiButton本身scoped背景浅纸，rail可使用浅纸可辨识图标，开关金色对比，hover/focus/disabled不同。已有右栏 380px，收拢32px，不用放大。桌面默认左52px/右380px，中间地图。展开左约340px含rail，剩余地图仍正常。root body height:100dvh overflow:hidden。

变量 --paper:#f4efe6;--paper-2:#ebe3d5;--ink:#2f3545;--ink-soft:#5b6375;--slate:#3b4255;--slate-2:#4a5366;--gold:#c8ad7f;--gold-soft:#e6d3ad;--gold-line:rgba(200,173,127,.55)。输出尽量清晰简练，无undefined vars。
