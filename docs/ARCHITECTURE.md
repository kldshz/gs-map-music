# 技术方案与阶段3接口

2026-10-07当前方案，优先于阶段1合成数据/昼夜/非原神示例设计。历史方案可在Git中查看；[地图比较](MAP_BASE_COMPARISON.md)及[地区目录](REGION_CATALOG_EXPORT.md)保留调研依据。

## 技术栈与复用范围

Vue3.5.43、Vite7.3.7、TypeScript5.9.3、Leaflet1.9.4、npm及锁文件；vue-tsc严格检查、Playwright使用本机Edge。Pinia已安装但当前状态模块使用Vue refs/computed。沿用已有应用而非整包迁移V3。只复用地图投影、瓦片/分层配置、点位字段和图标，避免引入其账号、采集存档和无关物品系统。

V3源码参考固定提交`0e80dd090329cb4964360ef42d2ed6016cf7cc15`，MulanPSL2许可原文保留在public/licenses。适配文件有来源注释，UI有署名/许可链接。游戏地图/图标与服务条款不由代码许可一并授权。

## 地图适配

- `src/adapters/kongying-config.ts`：配置extend继承、settings合并、循环检测、source/canonical往返、瓦片URL。
- `src/components/MapCanvas.vue`：Leaflet生命周期、真实图标点位、叠层图片、键盘选点、定位高亮、加载/错误状态及视口尺寸变化。
- `src/services/explorer.ts`：地区/层/类型状态、文字检索、点位曲库、多对多查询、跨地区/独立地图定位、导入状态。业务关系不依赖Leaflet实例。

原V3坐标为图像空间、不是经纬度。投影x=源lat+center[0]，y=源lng+center[1]，保留原轴序。canonical以当前瓦片集范围左上角为原点：x=源lat+center[0]-tilesOffset[0]，y=源lng+center[1]-tilesOffset[1]。mapId为tiles.code，相同瓦片集可跨地区定位，独立地图不能硬拼同空间。瓦片URL层级=Leaflet zoom+13，负x/y合法；至冬1继承twt672的真实偏移。没有游戏米/秒或地理距离换算。

底图来自assets.yuanshen.site，叠层只允许tiles.yuanshen.site模板。本地快照含47地区、877点位与地图配置，无token/账号字段、无大图镜像。默认隐藏分类不进地区选择，但数据/导出保留。地图层value与area.id不同标识空间，保留原路径，不能将层标签当作多边形边界。

## 数据结构与校验

以[contracts.ts](../src/domain/contracts.ts)为准。Area保留id/parentId/code，Anchor保留sourceId、areaId/code、两类kind、坐标、underground和layerValues。两类点位同表/同入口，每个点位可有多首曲目。位置允许null，文字可展示但不能虚构位置。

MusicTrack存title/artists/composers/album/releaseDate/durationSeconds/description/neteaseId/sourceUrl。未知字段用null或空数组，不以artist代作曲。TrackAnchor连接trackId与anchorId，有独立ID、pending/verified、证据说明和URL。verified须证据字段齐全，但格式校验不等于事实审查；pending可展示/定位供核对，禁止将它当自动选曲证据。取消所有昼夜字段/筛选。

`public/data/music-library.json`当前63曲/394条pending/40目录，来源与显式规则见[CITY_WINDS_PILOT](CITY_WINDS_PILOT.md)。MusicTrack新增可选personalNote、neteaseEncryptedId、sceneInfo（Wiki曲序/原文/地区/目录/修订/备注）。MusicLocation按国家/源地区/细地点或场景，引用areaId/code，scene不冒充所在地。TrackAnchor.matchType为地点直接/父级地点/神像归档/地区范围候选/用户手动挂载；归档强制pending且仅神像，region-scope与manual强制pending。目录不改变点位content/坐标，建筑借城级点，不虚构室内点位。

快照加载会检查格式、唯一地区/点位ID、父引用/循环、点位地区ID与代码一致、坐标与链接。音乐JSON导入检查schemaVersion1、必填字段/类型、唯一ID、重复关系、引用、时长、网易纯数字ID、安全HTTP(S)链接、verified证据字段。限制16MB/10000曲/50000关系，失败保留旧库，未知字段挑选剔除，不接受音频URL。当前没有任意地图包上传界面；地图替换需更新快照并运行检查。

## 检索与定位

点位按名称、说明、国家/地区、源ID检索；曲目按标题、艺人、作曲、专辑、简介、网易ID及关联地点检索。相同标题不同ID不合并。缺值显示未知；没有结果/没有坐标/待核实均显式反馈。全部定位保留全部关联ID，并显示当前瓦片空间的点位；独立地图需从关联列表逐一切换，不宣称单画布同时展示不同空间。

本专辑真实元数据/双向检索已验证，地点全部pending，游戏内实际音区未验收。搜索新增英文/出处/细目录/个人评价。测试fixture独立标注，不写产品或数据库。曲库重建检测现库相对上次产物是否变化，拒绝静默覆盖用户修改。

## 存储与后续播放接口

本机MySQL8.0.40独立gs_map_music六表：area/anchor/music_track/track_anchor/music_location/track_music_location，外键与组合唯一键支持多对多。personal_note独立文本，另有加密ID/scene_info/match_type。凭据只存忽略目录。db:setup更新来源点位，db:import校验/幂等迁移并补新行，保留已有评价和关系；当前63曲/394关系/40目录/63曲目目录关系。页面只读JSON，无MySQL HTTP CRUD/自动同步。

阶段4的PlaybackResource契约预留ready(provider/url/expiresAt/preview)或unavailable(reason/message)，实现尚未开始。网易appid/privateKey在服务侧，root密码禁止放前端；URL到期、试听/权限/版权、账号登录和浏览器实际发声单独验收。官方CLI登录成功不能替代网页解析或播放成功。可用用户本地普通原神音频作演示，文件不入Git。无合法可用原神音源时真实播放验收保持未通过。

播放实例与地图/面板生命周期分离，play()错误/用户手势/异步请求版本号/objectURL释放留阶段4。本轮personal-notes服务用版本化localStorage只保存用户评价覆盖，按稳定ID与导入personalNote/description/出处分开；刷新/清空/恢复/损坏防覆盖/失败反馈已验证。收藏/列表及数据库编辑API仍留阶段4，不将会话JSON或本机评价说成MySQL同步。

路线编辑/空间判区/时钟/选曲和过渡留阶段5，见[路线计划](ROUTE_TEST_PLAN.md)。当前无真实区域多边形，必须先定义可审查的近似规则；所有昼夜要求已撤销。


## 开发环境关联编辑（2026-10-07）

使用npm run dev，在右栏点位曲库搜索歌曲并添加/移除，或在歌曲信息的关联点位分段中按地区和文字选择点位增删。关联修改成功后曲库/计数立即更新，刷新保留。删除来源关系可恢复来源；手动新增关系删除后不显示来源恢复。歌曲元数据和原始证据不改，手动新增始终manual/pending。

Vite只在开发服务提供本机/__dev/music-links，记录写data/association-edits.json，按稳定曲目ID与点位ID保存add/remove覆盖。该文件为空基线纳入版本管理，用户编辑表现为可审查的Git修改；构建应用这些记录到静态曲库。生产页面没有编辑控件/写接口。仅本机Host与同源JSON请求可写，测试用.local独立文件，不污染用户修改。可导出当前曲库JSON；临时导入后编辑禁用，刷新回内置库。没有MySQL自动同步，修改评价仍只保存在当前浏览器。

阶段3批量增量：MusicLocation.areaId/areaCode允许成对null表示真实未知；校验拒绝单边null或虚构地区。基于track/anchor/pair索引检索与点选，避免扩库后逐曲逐点扫描全部关联。候选生成规则与批次入口见OST_BULK_IMPORT.md；保留原63数据/人工覆盖/评价。


## 2026-10-08 统一地理目录

Anchor.geography与SceneInfo.geographicScopes使用country/primary/secondary(nullable)；独立于源Area47组。来源/距离/待核实在点位地理字段保留，原说明不改。地图快照校验该结构，曲库导入挑选保留并拒绝二级无一级。探索/搜索优先统一目录，旧musicLocations仅保留历史引用。重建入口scripts/reclassify-geography.mjs，规则与局限见GEOGRAPHY_REVIEW.md和PROJECT_STATUS末尾。MySQL尚无geography迁移，不能声称JSON已同步。
