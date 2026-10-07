# 原神地图音乐探索与播放器

阶段3本轮交付：空荧酒馆V3真实地图适配、地区与分层筛选、877个传送锚点/七天神像，以及每个点位的音乐库入口。音乐与关联数据按用户要求暂空，昼夜功能已取消。前端由实际调用的Claude Opus 5-5/high主导，Codex审核整合。

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

侧栏的音乐JSON导入会校验曲目和多对多关联，只在当前会话生效，不写MySQL、刷新不保留，也不包含音频。格式见[音乐数据导入](docs/MUSIC_IMPORT.md)。产品仅允许原神音乐，本轮没有提供任何曲目。

播放器是显式禁用的阶段4入口。没有实际播放、个人库持久化或路线模拟；路线编辑与调度留阶段5。真实曲目反向关联尚待用户补充，当前自动化测试只验证数据结构与交互能力。

## 项目交接

统一需求：[项目说明与分阶段提示词](项目说明与分阶段提示词.md)。[状态](docs/PROJECT_STATUS.md)、[决定](docs/DECISIONS.md)、[验收](docs/ACCEPTANCE.md)、[Claude协作](docs/COLLABORATION.md)、[路线测试方案](docs/ROUTE_TEST_PLAN.md)。私有仓库：<https://github.com/kldshz/gs-map-music>。

本项目个人使用、不公开部署。代码开源许可与游戏素材/在线服务使用条件分开记录，不宣称取得素材再分发授权。第三方大图、音乐、本机认证与数据库密码不入库。历史阶段2的合成地图和非原神音频已从当前产品删除，历史证据保留在Git。
