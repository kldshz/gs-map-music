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

`public/data/music-library.json`当前tracks/associations均空。用户补充细地点与目录Key保留在点位表黄色列，未来可按国家→源地区→音乐地点定义目录，再绑定稳定anchor.id；不提前虚构目录或把地图分层直接判为音乐关联。

快照加载会检查格式、唯一地区/点位ID、父引用/循环、点位地区ID与代码一致、坐标与链接。音乐JSON导入检查schemaVersion1、必填字段/类型、唯一ID、重复关系、引用、时长、网易纯数字ID、安全HTTP(S)链接、verified证据字段。限制8MB/10000曲/50000关系，失败保留旧库，未知字段挑选剔除，不接受音频URL。当前没有任意地图包上传界面；地图替换需更新快照并运行检查。

## 检索与定位

点位按名称、说明、国家/地区、源ID检索；曲目按标题、艺人、作曲、专辑、简介、网易ID及关联地点检索。相同标题不同ID不合并。缺值显示未知；没有结果/没有坐标/待核实均显式反馈。全部定位保留全部关联ID，并显示当前瓦片空间的点位；独立地图需从关联列表逐一切换，不宣称单画布同时展示不同空间。

默认音乐全空，因此真实OST搜索/地点事实验收延期。测试曲目仅明显标注的测试元数据，既没有真实歌曲断言，也没有音频，不写入产品或数据库。

## 存储与后续播放接口

本机MySQL8.0.40已有服务，独立gs_map_music库有area、anchor、music_track、track_anchor，外键与唯一组合保证多对多。用户root凭据只在被忽略的本机配置。`npm run db:setup`按源ID幂等upsert地区/点位，不清空已有曲目或关系；本轮音乐0/关系0。浏览器只读静态快照，导入仅会话，没有MySQL HTTP CRUD/持久化。

阶段4的PlaybackResource契约预留ready(provider/url/expiresAt/preview)或unavailable(reason/message)，实现尚未开始。网易appid/privateKey在服务侧，root密码禁止放前端；URL到期、试听/权限/版权、账号登录和浏览器实际发声单独验收。官方CLI登录成功不能替代网页解析或播放成功。可用用户本地普通原神音频作演示，文件不入Git。无合法可用原神音源时真实播放验收保持未通过。

播放实例应与地图/面板生命周期分离，await play()、错误/用户手势/异步请求版本号及objectURL释放由阶段4实现。个人收藏/列表/简介用版本化存储且区分来源与用户覆盖；是否采用本机数据库服务或localStorage在阶段4根据实际接口确定，不把会话JSON导入声称为持久化。

路线编辑/空间判区/时钟/选曲和过渡留阶段5，见[路线计划](ROUTE_TEST_PLAN.md)。当前无真实区域多边形，必须先定义可审查的近似规则；所有昼夜要求已撤销。
