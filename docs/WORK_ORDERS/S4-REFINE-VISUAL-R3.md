# 精确CSS返修：不得引入未定义暗色主题

固定claude-opus-5-5/high，禁用工具。R2未落盘，发现关键冲突：未定义--s4r-surface-1的黑色fallback、全局svg尺寸污染、.side-panel优先级仍低于旧.app-main > .side-panel、移动collapsed把父opacity0导致toggle不可见且移到屏外。请给**替代R2**的完整但简短CSS追加，JSON {cssAppend,notes}，<=200行，无源码重写、无新theme var、只使用既有paper/ink/slate/gold及上下文结构。

必须显式覆盖body .app-main > .side-panel(.collapsed/:has(.detail-view):not(.collapsed))比旧specificity高，width/flex/height/max-height/position全部明确。桌面右侧width/flex-basis380→32，flex-direction:row（toggle在DOM先），panel-content hidden/inert已DOM。收起opacity只作用内容，toggle在边缘可见且可点击；手机absolute right0/top0/bottom0，open width:min(360px,calc(100%-32px))，collapsed width32px不挤地图，不translate至屏外。左右open内容平滑opacity/transform，右flex-basis/width动画。左body .app-main>.s4r-library-sidebar desktop position:relative;left/top/bottom:0，width/flex-basis0关320开，不能残留fixed的top60/bottom80；mobile绝对main左沿同高度。app-main仍row，map flex/min-width0，高>=240。

body .app-footer > .player-bar display:block;flex:1;width:100%; grid width100%;左title width100%覆盖旧player-track flex:0 0 200px，控制桌面真居中。player grid桌面等宽 minmax(0,1fr) auto minmax(0,1fr)，三行紧凑而非gap+padding巨大；手机最多3行：title占第一行与右动作配合；中心controls+mode/volume第二行允许合理并列；seek第三行。若现结构secondary是一块可display:contents让modes/volume grid定位。footer map要留下>=240；左个人库trigger不要盖标题，footer可以给grid左侧44px留入口，桌面和手机一致。所有SVG仅.ui-icon，不全局svg。UiButton颜色纸面金线/播放器深蓝灰上金色，不能白button+白icon不可读。

body .player-bar .queue-panel.s4r-queue-panel覆盖旧top:auto;bottom:calc(100%+8px);right0;left:auto;max-width:min(480px,100%);max-height:min(420px,45dvh)，header留close sticky但不额外双scroll，mobile320曲名/动作换行。track-actions-playlist-menu是实际class，小菜单改static流在卡内不裁掉，并且min-width0/max-width100%，保持flow主体。左卡动作换行，不挤title，inputs min-width0，左背景varpaper/文字ink；tabs/create visible；playlist-name-row按钮reset避免框，不all:unset破坏focus。

不要加share button之类不存在功能、大小写.TrackActions等无效选择器。reduced motion覆盖所有transition。notes仅你修改了什么，不能说已查看/测试。旧相关CSS和当前player源码见上下文。
