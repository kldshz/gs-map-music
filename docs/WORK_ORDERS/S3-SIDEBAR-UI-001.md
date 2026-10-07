# S3-SIDEBAR-UI-001：右栏歌曲信息与开发关联编辑

入口：本机CLI2.1.291/既有网关。实际参数claude-opus-5-5/--effort high，无替代模型，工具禁用。仅允许交付src/App.vue、src/components/MusicSidebar.vue、src/style.css追加CSS；Codex审核落盘与Git，调用期间不编辑这些文件。stdin上下文App/style/contracts/explorer，无凭据。

用户需求：右栏三入口“点位目录”“曲目检索”“歌曲信息”。所有点位资料/歌曲详情在右侧展开，以原生details/summary分段，不出现屏幕中心弹窗、遮罩、dialog。地图一直可操作。地图选锚点/神像切右栏点位资料和音乐，点曲目切歌曲信息；保留该锚点上下文，可返回其曲库。定位某关联点应在地图高亮并打开右栏点位资料；全部定位保留曲目详情，地图自由查看。右栏默认全功能保留原浅纸/金线/蓝灰，桌面约400–440宽，手机在地图下方且可滚动，无横向溢出/播放器遮挡。三按钮能Tab操作，选曲后焦点给标题或信息区，Escape可以回点位/曲目列表，不能封锁地图焦点。

结构：App.vue保留header/MapCanvas/侧栏aside和收起toggle/禁用footer播放器，调用useExplorer只一次并load。把右栏内容放新MusicSidebar.vue，通过:explorer="explorer"传useExplorer返回对象。Sidebar中props类型ReturnType<typeof useExplorer>，可以const state=reactive(props.explorer)，避免模板嵌套refs未解包错误。App原始个人评价/dialog/tab逻辑迁入Sidebar并删除dialog/ref/focus modal实现。不要增加依赖，不改业务服务。

Sidebar保留完整单曲元数据、出处原文/主要地区/音乐目录/修订/备注/来源、逐点关系和evidenceNote；把字段放可展开分段，默认基本信息与个人评价容易发现。description与personalNote分开。评价保存/恢复/失败反馈与刷新语义照旧；换曲重置draft。点位显示原content/地区/坐标（图像坐标)/细目录/关联曲目。曲目/点位列表的搜索、空结果/无坐标/失败/导入仍清楚，列表按钮标题别被长英文挤坏。

领域新增matchType：region-scope=地区范围候选（野外/战斗来源推到普通点位，待核实），manual=用户手动挂载（仍待核实），region-archive=地区归档（非实际播放点），其它place-match/parent-place-match保持。目前基础库63曲，将从122改394关联，16范围曲覆盖20普通蒙德点位，蒙德城/风龙废墟保留专属；计数按真实响应，不硬编码。

开发环境编辑仅state.developmentMode为true显示“开发编辑”，生产页面不出现增删入口。新增业务接口已在explorer上下文：editingAvailable、editBusy、editMessage为refs（用reactive后不用.value）；anchors所有877点；associationFor(trackId,anchorId)；hasManualEdit(trackId,anchorId)；addTrackToAnchor/removeTrackFromAnchor/restoreTrackAnchor异步Promise<boolean>；exportEditedLibrary()下载有效曲库JSON。保存自动写本机项目审核文件，刷新保留；不是删歌曲资料或verified证据，不自动同步MySQL。临时导入后editingAvailable=false并提示刷新回内置库。UI显式指出“仅修改点位关联，歌曲资料保留”。重复添加要禁用；忙时禁用所有编辑；错误用role=status/alert呈现。

两个方向都可编辑：
1. 当前点位曲库内：可搜索全63曲，选择未挂曲点击“添加到此点位”；每首曲目独立“移除关联”（不要把按钮嵌进选曲button）。已手改关系可“恢复来源关联”。
2. 歌曲信息内：按地区筛选/文本搜索选择所有锚点或神像（可用select和小搜索框），显示点位说明/编号帮助区分；“添加到所选点位”“移除所选关联”“恢复所选来源关联”各明确label。已有关系列表每项移除和恢复（开发only）。未关联候选也能恢复已删除的基础关系，所以所选操作区不可依赖当前关联列表存在。保留编辑选择，保存后计数/地图定位/曲库立即更新。提供“导出当前曲库”。

不要开发播放/路线/昼夜，不添加歌曲、接口或来源事实。允许你按现有数据排版，不造关联数据。返回纯JSON（正确转义，无Markdown围栏）：{"ticket":"S3-SIDEBAR-UI-001","status":"completed","files":[{"path":"src/App.vue","content":"完整代码"},{"path":"src/components/MusicSidebar.vue","content":"完整代码"}],"cssAppend":"追加CSS","summary":"简短中文"}。
