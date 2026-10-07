# S3-MAP-UI-001：真实地图上的锚点曲库界面

日期2026-10-07。真实调用入口：本机CLI2.1.291，scripts/run-claude-work-order.ps1，固定claude-opus-5-5、--effort high；工具禁用，stdin上下文，Codex审核落盘。不换模型。设计与交互由你主导。

仅阶段3。用户要求直接复用空荧V3地图结构，原神风格的浅色纸张面板、深蓝按钮、克制金色线条、菱形/星纹和清晰字体；重点是可浏览真实地图、点击真实传送锚点/神像打开各自曲库。**取消全部昼夜区分**。音乐数据默认空，不伪造曲目、绑定或播放成功。神像和锚点拥有相同的多曲关联能力。音频播放、收藏/队列持久化、路线模拟后续阶段实现，此轮常驻播放器保持诚实禁用且提示未接入。

允许返回仅两个文件 src/App.vue、src/style.css，不改业务/地图组件/依赖/来源；Codex不与你同时编辑这两文件。返回纯JSON：{"ticket":"S3-MAP-UI-001","files":[{"path":"src/App.vue","content":"完整文件"},{"path":"src/style.css","content":"完整文件"}],"notes":["说明"]}。App约300行以内、CSS约250行以内，紧凑完整，勿输出解释/围栏。

## 已确定的前端接口（由Codex实现）

App导入 `import MapCanvas from './components/MapCanvas.vue'` 和 `import { useExplorer } from './services/explorer'`。

`const e = useExplorer()` 返回普通对象，每项响应式状态是ref或computed；script使用`.value`，template为避免嵌套ref不能自动解包，请在script顶层解构所需的ref和函数。

- loading: Ref<boolean>, error:Ref<string>, areas:Ref<Area[]>, areaCode:Ref<string>（默认A:MD:MENGDE）, selectedArea:Computed<Area|null>
- roots:Computed<Area[]>（parentId=-1且非hiddenFlag3），areaOptions:Computed<Area[]>（非顶级且父级非隐藏）
- typeFilter:Ref<'all'|'waypoint'|'statue'>, query:Ref<string>, visibleAnchors:Computed<Anchor[]>（当前地区+类型+点位文字查询）
- anchors:Ref<Anchor[]>全部点位，selectedAnchor:Computed<Anchor|null>, selectedAnchorId:Ref<string>, highlightedIds:Ref<string[]>, focusRequest:Ref<number>
- tracks:Ref<MusicTrack[]>默认[]，searchTracks:Computed<MusicTrack[]>文字结果，anchorTracks:Computed<MusicTrack[]>选择点位的已保存关系曲目
- selectedTrack:Computed<MusicTrack|null>, trackLocations:Computed<Anchor[]>所选曲目所有关系点位（含无坐标待核实），mapConfig:Computed<ResolvedMap|null>
- mapStatus:Ref<string>（组件反馈），importMessage:Ref<string>
- `load():Promise<void>` 加载本地真实点位快照/配置，自动首次调用；`selectArea(code:string):void`；`selectAnchor(id:string):void` 切区域/开点位面板；`selectTrack(id:string):void`；`locateTrack():void`一次高亮全部关联点位/同地图可fit，其他地图列入口；`importLibrary(file:File):Promise<void>`曲目关系JSON校验失败保留旧状态，成功更新音乐库。

类型：
Area { id:number,name:string,code:string,parentId:number,isFinal:boolean,hiddenFlag:number }
Anchor { id:string,sourceId:number,name:string,kind:'waypoint'|'statue',areaId:number,areaCode:string,country:string,areaName:string,content:string,position:[number,number]|null,underground:boolean,layerValues:string[],iconUrl:string|null,sourceUrl:string }
MusicTrack { id:string,title:string,artists:string[],composers:string[]|null,album:string|null,releaseDate:string|null,durationSeconds:number|null,description:string,neteaseId:string|null,sourceUrl:string|null }
ResolvedMap：由MapCanvas使用，不需要App读取内部。

MapCanvas props:
`:config="mapConfig" :anchors="visibleAnchors" :selected-id="selectedAnchorId" :highlighted-ids="highlightedIds" :focus-request="focusRequest"`
emits `@select="selectAnchor"` (id:string), `@status="mapStatus = $event"`（template顶层ref赋值）。实际Leaflet地图、缩放/拖拽、瓦片加载/失败、原V3图标由Codex管理。class可取map-canvas；组件根节点需要容器占满。

## 布局与交互

地图占主体，左上标题/地区select/搜索，图侧音乐面板，可切点位目录与曲目检索；点击地图点立刻打开锚点面板，显示真实地区/类型/来源、关联曲库空态“尚未补充音乐”。点位目录要可键盘选择且滚动，不要一次DOM显示全部数千点：列表取visibleAnchors前100或按分页，并标注当前总数。支持缩放地图自带按钮，不挡地图。

曲库有数据时展示真实元数据（作曲缺值“未知”不能artist替代）、详情、全部关联点位及定位入口；无数据时给导入JSON入口/简短字段说明，不造示例曲目。导入用file input accept application/json，由async函数读取；错误status aria-live。没有音源的播放器控件禁用，--:--，明确阶段4待接入。

无需做路线控制，底部一句“路线模拟将在阶段5接入”即可。不要合成地图、Kevin MacLeod样本、昼夜按钮。保留空荧来源署名与真实图服务依赖提示/加载失败文字；不复制官方站点备案号或伪装官方产品。

390px和320px手机：地图仍可用，音乐面板可展开/收起且滚动，footer不覆盖最后控件；header收缩，无横向溢出。桌面1440x900。明确焦点样式，表单labels、aria-live、键盘可达点位列表、关闭按钮/Esc关闭面板。可用原生dialog展示曲目信息但若占位设计过重，直接面板内详情即可。

请独立设计整套App视觉和布局，不输出SVG地图替代真实MapCanvas，不引入新依赖或外部字体。
