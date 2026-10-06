# 阶段 3：空荧 V3 / V4 项目基础与至冬资源核实

核实日期：2026-10-06（Asia/Shanghai）。依据用户新提供的两个仓库，实际克隆、查阅源码/许可证，并读取 V3 当前公开配置与抽查瓦片。本次不再访问用户先前提供的 DeepWiki 文档。不把本项调研记作阶段 3 完成交付。

后续补充：官方V3公开页面的正常游客流程已实际取得47条地区API记录，与插件分层合成544节点/4层目录并导出表格，见[地区导出记录](REGION_CATALOG_EXPORT.md)。下文“中文分类/正常地区API待核实”描述比较单元当时的状态，最新地区分类以该导出为准；锚点完整性与页面标校仍未通过。

## 结论与选型

两个项目的代码许可证均允许修改和派生开发，需要保留相应版权、许可及声明。当前项目阶段 3 优先以 **map_front_v3 的地图实现为基础**，复用其配置、瓦片/坐标规则和地区/点位接入方式，接入现有 Vue/Vite/Pinia/Leaflet 音乐应用。不是只拿一组瓦片 URL，也不需要为此搬入全部采集存档、账号和宝箱管理功能。

整套 fork 后开发也可行；但直接整包迁移 V3 会带来 Quasar 页面、旧依赖与账号/存档逻辑的拆除及升级，整包迁移 V4 还会切换地图渲染与多项基础设施。就当前的小规模锚点选曲、双向定位及路线需求，选择 V3 的地图模块能保持既有栈和阶段边界。未进行两仓库的运行性能对比，不声称 Leaflet 或 Deck.gl 谁一定更快。

| 对比项 | map_front_v3 | map_akashic_v4 |
| --- | --- | --- |
| 查阅分支 / 固定提交 | master / `0e80dd090329cb4964360ef42d2ed6016cf7cc15` | main / `3c61ff078ecba0f26458176b789c6069fa544a4d` |
| 查阅提交日期 | 2026-08-28；修复存档冲突时间字段 | 2026-07-29；优化筛选响应式性能 |
| 归档状态 | GitHub 查询未归档 | GitHub 查询未归档 |
| 代码许可 | MulanPSL-2.0 | MIT，Copyright 2025 Kongying Tavern |
| 前端基础 | Vue 3、Pinia 2、Quasar / Vite、JavaScript | Vue 3、Pinia 3、Vite 8、TypeScript、UnoCSS、Alova |
| 地图 | Leaflet，自定义图像 CRS | Deck.gl / luma，独立瓦片与点位图层 |
| 资源依赖 | 公开配置 + 远程瓦片；地区/点位来自独立 API | README 明确要求后端、配置、资源地址及主服务认证；模板为 example.com |
| 当前源码细节 | 地图创建与配置位于 src/api/map.js；可与音乐领域解耦 | 当前 genshin-map/index.vue 设置 showTile:false 和多项调试绘制；是需调整的调试配置，不能直接视作成品展示 |
| 与本项目关系 | 已有 Leaflet 1.9.4；可适配，不照搬其旧 Leaflet/Axios 版本 | 现代 TS 模块值得参考；整包接入需更换现有地图实现并满足服务配置 |

两个仓库都没有随 Git 提供完整的当前提瓦特瓦片和地区/锚点数据集。把代码 clone 下来，仍需解决运行时资源与点位服务接入。代码许可与第三方游戏素材、服务访问/缓存条件是不同证据；此次 HTTP 成功只证明可访问，不新增转载授权。

## 至冬底图的实际证据

V3 的 src/service/config_request.js 明确请求以下配置；src/api/map.js 使用配置中的 code 组成资源 URL：

- 生产配置：<https://assets.yuanshen.site/webapp.json>，本次 GET 200，114934 字节。
- 预览配置：<https://assets.yuanshen.site/webapp-preview.json>，本次 GET 200，91742 字节。以下结论依据生产配置。
- 瓦片模板：`https://assets.yuanshen.site/tiles_{code}/{leafletZoom+13}/{x}_{y}.{extension}`。

生产 tiles 配置包括：

```json
{
  "提瓦特-base0": {
    "code": "twt672",
    "center": [3568, 6969],
    "size": [30370, 26624],
    "tilesOffset": [-17408, -10240]
  },
  "A:ZD:ZHIDONG1": {
    "extend": "提瓦特-base0",
    "settings": { "center": [-9760, -11529], "zoom": -2 }
  }
}
```

`ZHIDONG1` 明确存在；同一配置也有 `A:NDKL:NDKL`、`A:NDKL:NDKL2`、`A:NDKL:NDKL3` 等入口。这里记录实际代码，不据缩写编造中文地区表或行政边界；中文分类和锚点完整性仍需真实地区/点位响应。

按照 V3 projection，至冬入口的默认视点映射为瓦片像素空间 `[-9760+3568, -11529+6969] = [-6192,-4560]`。256 像素瓦片在 Leaflet zoom=-2 下对应 x=-7,y=-5,服务层级11；zoom=-3 对应 x=-4,y=-3,服务层级10。不能把负瓦片索引剔除，也不能把它当成标准经纬度地图。

| 抽查 URL | HTTP | 字节 | 实际 Content-Type |
| --- | --- | --- | --- |
| <https://assets.yuanshen.site/tiles_twt672/11/-7_-5.png> | 200 | 30656 | image/webp |
| <https://assets.yuanshen.site/tiles_twt672/10/-4_-3.png> | 200 | 41130 | image/webp |
| <https://assets.yuanshen.site/tiles_twt672/10/-3_-2.png> | 200 | 21766 | image/webp |
| <https://assets.yuanshen.site/tiles_twt672/10/-4_-2.png> | 200 | 31082 | image/webp |
| <https://assets.yuanshen.site/tiles_twt672/10/-3_-3.png> | 200 | 46402 | image/webp |

实际查看了其中三张图片（11/-7_-5、10/-4_-3、10/-3_-3），均有有效地图地形绘制，非错误页面或纯空白。URL 虽为 .png，返回 WebP，缓存/导入应按响应和文件内容识别格式。

**可确认：V3 当前生产资源已经包含至冬1配置入口及对应可取的底图。** 仓库更新时间或至冬分类图标本身不作为地图覆盖证据。

**尚未确认：至冬全境、所有缩放层级、全部最新锚点/神像完整性；V4 单独线上服务的覆盖情况。** V4 能使用类似资源路径，但其真实服务环境未提供，不能将 V3 的生产验证直接记为 V4 验证。五张瓦片也不等于整图离线可用。

机器可读的固定提交、配置摘要及本地快照 SHA-256 见 [MAP_RESOURCE_PROBE.json](MAP_RESOURCE_PROBE.json)。原始配置和抽查图片仅在忽略目录 .local/research；不打包进产品或 Git。远程配置可更新，结论对应本次快照。

## 阶段 3 接入方向与未通过项

1. 使用 V3 的实际配置规则建立 Kongying 适配器；解析继承、center、size、tilesOffset、zoomOffset 和负索引。向音乐领域只暴露统一图像坐标，音乐/路线逻辑不直接依赖空荧页面状态。
2. 源码已有 `/area/get/list`、`/item/get/list`、`/marker/get/list_byinfo` 和 `/marker/get/list_byid` 等请求封装。它们使用独立 API 和 Bearer 凭证，不是已实测的匿名开放接口。需实际核实可用服务与正常认证流程后，仅筛选传送锚点和神像，不照搬内部凭据、账号或采集存档。
3. 地区代码、点位 ID、坐标及数据版本保留来源；中文国家→地区分类由实际响应生成，音乐细分地点另建稳定 ID。不能从底图推定真实区域边界，也不能从地区图标宣称锚点已更新。
4. 按需请求在线瓦片与版本化本地资源导入均保留接口；能访问的资源不等于长期在线稳定。实际页面加载、失败提示、坐标控制点标校与反向定位仍需验收。
5. 当前仅是调研决定。尚未迁移前端、导入最新点位或调用本轮 Claude 设计工单；阶段 3 业务验收不能标完成。后续前端设计继续固定 Claude Opus 5-5/high。

## 固定源码依据

- V3 [许可证](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/LICENSE)、[依赖](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/package.json)、[地图和 CRS](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/src/api/map.js)、[配置入口](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/src/service/config_request.js)、[地区/点位请求](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/src/service/base_request.js)。
- V4 [许可证](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/LICENSE)、[运行手册](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/README.md)、[环境模板](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/envs/.env)、[依赖](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/package.json)、[地图页及调试配置](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/src/feature/genshin-map/index.vue)、[瓦片请求与缓存](https://github.com/kongying-tavern/map_akashic_v4/blob/3c61ff078ecba0f26458176b789c6069fa544a4d/src/api/services/assets/apiDefinitions.ts)。
