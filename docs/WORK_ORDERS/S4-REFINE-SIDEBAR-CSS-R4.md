# 左右栏CSS最小返修

claude-opus-5-5/high，禁用工具；综合CSS600秒超时。只返回JSON {cssAppend:string}，最多40行紧凑CSS。你主导UI设计，Codex落盘验证。

App是header/main/footer flexcolumn；main .s4r-library-sidebar左、.map-container中、.side-panel右。body .app-main positionrelative flexrow min-height0 overflowhidden。左旧fixed top60/bottom80无效：desktop body .app-main>.s4r-library-sidebar positionrelative left/top/bottom0 width/flex-basis0关320开.s4r-library-open，width与opacity/transform动画，内容宽320height100%可滚。左背景varpaper文字ink。右旧selector .app-main>.side-panel(:has(.detail-view):not(.collapsed))优先级高，必须body .app-main>.side-panel以及has版本明确width/flex-basis380开/32关、positionrelative,height100%,max-heightnone,flex-directionrow（DOM toggle先content），transitionwidth/flex-basis；content关visibilityhidden/opacity0，inert已有，toggle本体永远可见。

手机<=768：左右absolute贴main边缘top0bottom0,heightauto,max-heightnone，不挤地图，width:min(360px,calc(100% - 32px))，左关translate-100%，右关width32px保留toggle，不给父opacity0/移出屏幕；.panel-toggle宽32height100%positionstatic transformnone，旧after文字清除。map flex1 min-height240min-width0。个人库内容height100%/minheight0和scroll，inputs minwidth0，s4r-track-content上下排标题与动作、动作flexwrap；playlist name buttonreset保留focus，背景浅纸蓝灰金线。真正class .track-actions-playlist-menu改positionstatic/min-width0/max-width100%，卡内flow不裁。按钮SVG沿用UiIcon。减弱动画全关闭。无新暗theme/无全局svg尺寸/无业务改动。
