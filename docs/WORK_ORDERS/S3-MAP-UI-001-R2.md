# S3-MAP-UI-001-R2：最终样式整合

2026-10-07，真实本机CLI claude-opus-5-5/high，不换模型。只允许src/style.css一个文件。App由你R1主导完成；Codex仅已修正Area.parentId number类型。此次不要返回App，不增依赖，约200-300行清晰CSS，返回纯JSON {"ticket":"S3-MAP-UI-001-R2","files":[{"path":"src/style.css","content":"完整CSS"}],"notes":[]}。

此前原CSS与R1 App有冲突：import-section依然position:fixed会盖地图，import-input display:none不能键盘焦点；手机side-panel固定覆盖整个地图，desktop collapsed transform之后占320px空位/无法展开；dialog需要原生居中且320屏内滚动；地图状态z50在leaflet z400之后会被盖。请整体整理你的CSS，使其适配给出的实际App类名。保留原神浅纸/蓝灰/克制金线风格，不用emoji/高饱和黄色大面积，不引外部图。

- body应用100dvh，header/footer不缩掉，main min-height:0 flex:1 overflow:hidden；地图容器min-width:0，桌面占除侧栏320px全部空间。
- 桌面aside内部滚动可见import，收起后实际宽度32px，按钮仍可点击；transform:none。
- 390/320手机header地区/分层select各自最大100%不撑出，搜索一行。main flex-direction:column，地图至少240px但不能以55vh挤掉footer；侧栏作为inline紧凑区域(约170px高可滚动)，收起约36px；禁止position:fixed铺满视口。toggle可见易点，不在可滚动容器外被裁。footer紧凑两行以内，用较小字，隐藏footer-note即可但播放器“音源尚未接入”必须可见。播放器range可小宽度，不横向溢出。
- dialogs:margin:auto;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;backdrop。元数据dl用两列, long值换行；button/关闭键焦点清晰。源文字不用假曲目/假进度。
- map-status/error overlay需在leaflet控件之上，可用map-container isolation:isolate 与z-index:1100；但header/panel不被地图盖。地图控件的CSS已有Leaflet和MapCanvas，不改它们。
- import-section是侧栏内的普通block,不做floating；输入可用opacity低的覆盖input或1px隐藏但不能display:none；label:focus-within显著。
- App结尾还有少量你R1的style，可能覆写相同规则；最好保留这些实用规则并在本CSS新增兼容，不再用矛盾的position。mobileApp末尾min-height55vh由Codex整合删除过时规则，保留本次的有效方案。

给出可直接运行的CSS，不只建议。
