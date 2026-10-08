# 阶段4实际截图后布局返修

继续实际claude-opus-5-5/high，禁用工具/不替换。Codex已修业务契约和Vue解包并build通过；这次只要CSS追加，紧凑JSON {cssAppend:string,notes:[]}，不完整重写源码或业务。

实际1280x720截图：地图正常，播放器全部挤在左侧540px内，右边大量空白，中心控制在x278，原因旧.player-bar display:flex、旧footer规则与新grid冲突。左栏用fixed top60/bottom80假值不能跟实际header/footer，关闭状态曾覆盖map小按钮。右栏旧手机上下叠布局不符合侧栏抽屉，且没有平滑动画。共享按钮颜色fallback黑白而非纸面金线。必须足够specificity覆盖这些冲突，不仅.s4r-player-grid。

请完成：
- .app-footer和.player-bar全宽，player-bar display:block;width:100%;min-width:0，grid真正占满。1280桌面播放器中心控制在屏幕中心，左右等宽、右方工具；seek全宽，modes/volume可放第三行但紧凑。320/390手机尽量3行（标题+动作/中心控制与模式/seek音量可合理安排），footer不过高、剩余地图>=240px。错误展示保留，无假source文本。SVG尺寸统一16~18px，使用既有var paper/ink/slate/gold，边框金线；播放器深蓝灰时文字可读。
- .app-main position:relative;左右栏以main高度作为边界，别用固定header/footer假值。左可桌面flex宽320开/0关+translate opacity，右桌面flex宽380开/32关，两侧动画flex-basis/width与translate opacity。body仍不滚，地图flex至少合理空间。手机左右栏position:absolute贴main左右边，不中央modal，不挤地图，width:min(360px,calc(100% - 32px))；关闭只留右toggle把手，左trigger在footer合理位置不盖标题；inert都在内容（toggle可点击）。不能手机上下旧42dvh布局覆盖。
- .side-panel.collapsed .panel-content保持DOM但opacity0/visibility hidden，动画顺滑且不阻挡toggle；App已有inert内容。保持toggle独立可访问。右旧mobile after文字可去掉用SVG/简短已aria label（Codex改SVG），背景/边框一致。
- .s4r-library-content/.personal-library高度scroll正确，所有inputs min-width0，左曲卡上下分行动作不挤标题，playlist summary按钮native reset，不超过280~320。创建label可见、slot已加入。歌单menu被旧overflow裁掉须处理（popup可在卡内flow而非绝对，窄栏合理）；新.TrackActions class保留。
- .player-bar .queue-panel specificity覆盖old position/right/top/width等，队列在footer上方，不覆盖收起队列，max-height:min(420px,可用空间)有scroll，header close始终可见，320宽队列曲名及4按钮可换行。tooltip位于body fixed已有实现，CSS最大宽合理，不能被overflow裁。
- reduced-motion对所有transition关闭。

上下文提供旧新相关CSS片段+当前App/PlayerBar/PersonalLibrary，已是Codex修过的可运行源码，勿假设旧contract。notes不声称已测试。
