# 播放器CSS最小返修

同claude-opus-5-5/high；前份综合CSS600秒超时无交付。只返回JSON {cssAppend:string}，最多40行紧凑CSS。不给大上下文，你负责布局设计，Codex落盘验证。

当前footer结构：.app-footer > .player-bar > .s4r-player-grid（left title/artist、center previous/play/next、right star/queue/info、seek-row time+range+time、secondary含modes随机循环和volume-control）。.app-footer还有独立.s4r-library-toggle按钮。旧.player-bar是flex导致grid仅左侧540px；必须body .app-footer > .player-bar display:block;width100%、grid fullwidth；desktop minmax(0,1fr) auto minmax(0,1fr)，中心在屏幕中线。左标题/艺人min-width0溢出省略。footer给个人库button左44px和右44px对称留白，其positionabsolute left8 top8，不要盖标题。移动320/390布局三行：left/right第一行可合理放；center/modes/volume第二行（secondary displaycontents可拆）；seek第三行。svg只.ui-icon16px。风格varpaper/ink/slate/gold，footer深蓝灰上金线、文字浅纸，UiButton图标/底色对比清楚，无白底白图标。紧凑高度约130手机，desktop110。

队列是.player-bar > .queue-panel.s4r-queue-panel：旧top/bottom/width残留，body .player-bar .queue-panel.s4r-queue-panel positionabsolute topauto bottomcalc(100%+8px) right0 leftauto width:min(480px,100%) max-height:min(420px,45dvh)，scrollheader/close可见，320曲名操作换行。tooltip body已有fixed实现无需改。不要任何未定义s4r暗主题变量。notes不需要。
