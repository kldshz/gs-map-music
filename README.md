# 原神地图音乐探索与播放器

阶段3本轮交付：空荧酒馆V3真实地图、877个传送锚点/七天神像，以及《风与牧歌之城》63首专辑试做。BWIKI出处与网易官方元数据结合为40个细分目录、394条候选挂载；蒙德野外/战斗范围候选扩展到20个普通锚点，全部待核实。右侧栏提供点位目录、曲目检索和歌曲信息，开发环境可视化增删/恢复点位关联；个人评价独立留空，可在浏览器编辑保存。昼夜功能已取消。前端视觉由实际调用的Claude Opus 5-5/high主导，Codex审核整合。

保留Vue/Vite/Leaflet技术栈，复用V3的坐标投影、配置继承、瓦片地址规则与点位/分层字段，没有整包迁移其账号、宝箱或采集功能。代码许可副本在[此处](public/licenses/KONGYING-MulanPSL-2.0.txt)。底图、点位图标与分层图片在线加载，依赖上游服务，不是离线地图包。

## 运行

本机Node22.17.0/npm10.9.2已实测。新机器需Node >=22.12（或符合Vite要求的20.19以上版本）。

```powershell
npm ci
npm run dev
```

访问 <http://127.0.0.1:5173>。生产检查：

```powershell
npm run build
npm run test:data
npm run test:ui -- --workers=1
npm audit
```

UI测试使用已安装的Edge，自动启动/停止4173预览，请先停止手动preview。截图及trace在忽略目录`.local/browser-tests`。地图需要网络。

## 地图与数据

- [本轮来源与审核](docs/STAGE3_REVIEW.md)：47条API地区、877点位，其中822锚点/55神像，至冬1含61锚点/5神像。
- [地区分类目录](outputs/map-regions-20261006/空荧地图地区分类与分层目录.xlsx)：国家、地区及地下/叠层目录，共544节点。
- [锚点与神像补全表](outputs/map-anchors-20261007/空荧锚点与神像补全表.xlsx)：877行。黄色列填写音乐细地点、目录Key和补充说明，保持源ID及地区字段不变。
- [接口契约](src/domain/contracts.ts)、[技术方案](docs/ARCHITECTURE.md)、[MySQL使用说明](database/README.md)。本机独立库`gs_map_music`已建，页面当前读取JSON快照，尚无数据库HTTP读写接口。

侧栏的音乐JSON导入会校验曲目和多对多关联，只在当前会话生效，不写MySQL、刷新恢复内置库，也不包含音频。个人评价以曲目Key保存到此浏览器localStorage，独立于来源说明。格式见[音乐数据导入](docs/MUSIC_IMPORT.md)。产品仅允许原神音乐。

本次[曲目与挂载表](outputs/city-winds-pilot-20261007/风与牧歌之城曲目与挂载表.xlsx)含两表，黄色列用于评价及挂载修订；来源、挂载规则和特殊秘境见[专辑试做说明](docs/CITY_WINDS_PILOT.md)。网页搜“风所爱之城”可查看蒙德城示例，点“我的评价”下的保存按钮后刷新保留。MySQL可用`npm run db:import`校验并补充导入，现有行/评价不覆盖，不自动同步网页。

播放器保持禁用，没有音源播放、收藏/播放列表或路线模拟。全部挂载pending，神像归档用于曲库整理，不能当作该神像的实际BGM。

## 项目交接

统一需求：[项目说明与分阶段提示词](项目说明与分阶段提示词.md)。[状态](docs/PROJECT_STATUS.md)、[决定](docs/DECISIONS.md)、[验收](docs/ACCEPTANCE.md)、[Claude协作](docs/COLLABORATION.md)、[路线测试方案](docs/ROUTE_TEST_PLAN.md)。私有仓库：<https://github.com/kldshz/gs-map-music>。

本项目个人使用、不公开部署。代码开源许可与游戏素材/在线服务使用条件分开记录，不宣称取得素材再分发授权。第三方大图、音乐、本机认证与数据库密码不入库。历史阶段2的合成地图和非原神音频已从当前产品删除，历史证据保留在Git。
