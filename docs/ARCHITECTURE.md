# 阶段 1 技术方案与接口交接

方案建立于阶段 1：原为空项目，无需迁移已有应用。阶段 2 已创建依赖清单、锁文件和 Vue 页面骨架，后续按阶段逐项实现业务；此文件保留阶段 1 数据/领域方案。

阶段3增量（2026-10-06）：根据新提供的V3/V4实际源码与至冬瓦片核实，[D3-01](DECISIONS.md)选择以最新V3地图模块为基础接入已有应用，继续使用Leaflet与canonical适配层；不是只取瓦片，也不整包迁入账号/采集存档。当前生产资源为twt672，需解析继承、center、size、tilesOffset、zoomOffset和负瓦片索引，不能硬套旧图参数。地区/锚点正常API接入、使用条件和页面坐标标校尚待验证，详情见[比较](MAP_BASE_COMPARISON.md)。

用户最新数据要求覆盖以下历史示例方案：产品只使用原神音乐；昼夜为歌曲/关系标注；网易指定歌单元数据与锚点/神像提供可补全表，国家→地区源分类及音乐细分地点分开建稳定ID。后续实现与契约需按此更新；历史示例不作为最新验收通过依据。

## 栈与边界

| 用途 | 固定候选版本 | 许可 / 依据 |
| --- | --- | --- |
| UI | Vue 3.5.43 | MIT；空荧当前应用也使用 Vue，方便后续参考 |
| 构建 | Vite 7.3.7、@vitejs/plugin-vue 6.0.2 | MIT；阶段 2 审计发现原 7.2.6 高危漏洞后升级；插件支持 Vite 5/6/7 |
| 类型 | TypeScript 5.9.3 | Apache-2.0 |
| 应用状态 | Pinia 3.0.4 | MIT；peer Vue ^3.5.11、TS >=4.5 |
| 地图 | Leaflet 1.9.4 | BSD-2-Clause；简单图像 CRS、点/线/面和适配层均可支持 |
| 包管理器 | npm 10.9.2 | 本机可用；阶段 2 提交 package-lock.json |

以上版本已逐项读取 npm registry 的 license、engine 和 peer 字段，不宣称它们是 latest。Vite/插件要求 Node ^20.19.0 或 >=22.12.0，本机 22.17.0 符合。固定已核对的兼容组合，阶段 2 仍以实际安装与构建为验收。项目自身代码暂未选择公开许可证；私有仓库不意味着第三方材料自动取得许可。

阶段 2 加入 vue-tsc 3.1.4（MIT、peer TS >=5.0）验证 SFC 和 Playwright 1.56.1（Apache-2.0、Node >=18）做实际浏览器验收，均为开发依赖。`npm audit` 在 Vite 修复后无已知漏洞；这不是未来绝对无漏洞保证。Playwright 使用本机 Edge，不下载新浏览器。

采用单页应用；无需 SSR、后台、账号或游戏连接。Codex 管理 domain/adapters/services/data/tests；Claude 主导 App、components、样式与交互表达，按工单限定文件。业务状态与地图实例/播放器实例分离，切换面板不销毁音频。文字搜索不是哼唱或旋律识别。

## 地图适配层与导入包

类型约定以 [contracts.ts](../src/domain/contracts.ts) 为准。`MapAdapter` 负责加载/销毁、点选择事件、定位高亮、路线与移动标记；领域层只处理 `MapPoint`，不暴露 Leaflet LatLng。地图选区和鼠标选点坐标经同一适配转换；空坐标地点只能展示文字，不定位到虚构位置。

阶段 2 的 SVG 地图是 Claude 交付的合成预览，不声称已经实现 Leaflet MapAdapter。Leaflet、Pinia 已固定安装，生产适配和应用状态模块按后续阶段接入。示例数据通过 `src/data/demo.ts` 导出；JSON 静态推断会把字面量/元组拓宽，因此只对已审核 fixture 做显式类型断言，实际来源/引用/资源由阶段 1 探针验证；这不是未来导入包的运行时验证器。

canonical 空间为图像原点 `(0,0)`、x 右、y 下；速度单位为图像单位/秒，不称游戏米/秒。标准 Leaflet Simple 用 `lat=-y,lng=x`。空荧 v3 的特殊轴次序、center、瓦片 zoomOffset 必须经版本转换后再进入 canonical 空间，不能拿旧配置硬套。地下/独立地图使用 `mapId + surfaceId`；路线限定同一空间，跨地图/层的连接机制不在 MVP。

未来资源导入采用 JSON manifest 配本地 image 或 tiles，不预设提供方 HTTP API。manifest 包含 schemaVersion、来源/权利、地图版本/宽高/坐标系、原点、层 ID、点位与区域；tiles 还需 template/tileSize/minZoom/maxZoom/zoomOffset/offset（接口预留，阶段 3 实现导入验证）。`uri` 由导入器注册为本地资源 URL；拒绝缺失许可来源、越界点、错误引用、非闭合区域、混用空间。区域允许孔洞并记录 evidenceStatus、priority；锚点数据不自动产生真实区域边界。

原神真实包接入至少使用 3 个不共线控制点核实轴向、原点、比例；如需仿射变换再用独立控制点验证残差，记录最大误差、版本和适用范围。具体允许误差依据资源分辨率与区域边界精度决定，不凭示例像素阈值宣布游戏精度通过。必须在实际页面核对点位、缩放和反向定位。没有真实包时只允许显著标注的 `schematic`，真实地图验收保持阻塞。

## 数据关系与证据

- `Track` 保存稳定 ID、标题/别名、artists、独立 composers（可 null）、专辑、发行日期、原作品时长、说明、来源、metadataRights、audioAssetIds；音频片段时长在 `AudioAsset`，二者不可混淆。
- `TrackLocation` 单独建立多对多关系，包含 `timeCondition=day/night/any/unknown` 和 `evidenceStatus=verified/pending/synthetic`、证据说明和来源。`unknown` 不等于任意时段；pending 可供用户查阅候选，不参加自动路线播放。synthetic 只能在标注的示例集演示。
- `Location` 的 point/regionId 可为空；真实目录条目可以没有音源。曲目标题、艺人、专辑、地区和用户简介用于文字检索；用户简介覆盖单独存储，不覆盖来源元数据或许可。
- `Source` 与 `Rights` 分开记录代码、几何、元数据、音频或 personal-local 范围；网页可访问不自动等于 allowed。事实来源与权利证据都必须可查。
- [demo.bundle.json](../data/demo.bundle.json) 有 1 张合成图、3 个合成区域/地点、1 个无坐标候选地点、2 首许可音乐和 2 条无音源 OST 记录。搜索候选地点显示 pending，不混入已验证结果统计。

不全量镜像 Apple 目录，不默认请求远程 preview/封面，不采集空荧内部点位。大规模数据与音乐库的稳定 ID/版本迁移留待真实来源明确后扩展。

## 播放与持久化接口

`AudioResolver.resolve(track)` 返回 ready（可用 URL 及 revoke）或具体 unavailable 原因；这里是本项目接口定义，不是虚构外部 API。内置许可 WAV 由本站本地文件提供；用户文件仅在主动选择后注册 object URL。导入按标题/专辑/盘轨号提出候选，需用户确认匹配；不从文件名推断作曲家、区域或昼夜。格式以浏览器实际 decode/play 结果为准，不承诺所有 FLAC/M4A 编码在所有浏览器都可播。

网易云官方资料追加核实见 [NETEASE_RESEARCH.md](NETEASE_RESEARCH.md)。`providerRefs` 可仅存核实后的 originalId/encryptedId，动态 URL 不入库；resolution 预留 expiresAt、试听 playbackRange 和 provider/鉴权/版权/额度失败。个人 ncm-cli 外部播放单列 external-player，不伪装 ready 浏览器音源。当前纯浏览器 MVP 栈不变；只有确认网页 API 使用条件后才增加本机/服务端签名解析器，密钥不放前端。此轮无真实网易 ID、凭据或业务调用。

播放器阶段 4 采用原生 HTMLAudio，应用级单例，明确加载/就绪/播放/暂停/错误状态；等待 `play()` promise，捕获手势限制和网络/解码错误。切曲使用请求版本号消除异步竞态，处理 object URL 生命周期。上一首/下一首、seek、音量、队列、随机、循环分别验收。阶段 5 再评估 HTMLAudio 接入 Web Audio 的双通道 gain 淡入淡出，失败时回退简短串行淡出/淡入并如实反馈；初始化 AudioContext 必须用户手势。

`UserLibrary` 版本化写入 localStorage：收藏、列表、简介 overrides、fileMatches（文件名、hash、fileKey）。不得持久化旧 blob URL 当有效音源，不默认复制全部 OST 至 IndexedDB；刷新后显示重新选文件。存储异常、配额、损坏 JSON 或版本不支持应保留可恢复说明，不能崩溃或默默丢失全部数据。File System Access 目录句柄、权限恢复和持久音频缓存列为后续增强。

## 路线与验收边界

`Route` 保存同空间节点；`RouteSimulationState` 保存模拟状态、当前位置、距离、速度、活动区域和昼夜。区域判定、稳定候选、选曲、音频切换为独立步骤，详见 [路线测试方案](ROUTE_TEST_PLAN.md)。阶段 1 探针只验证样本闭环数据、坐标数学、基础几何及昼夜候选，未实现模拟时钟、防抖、队列协同或音频过渡。

阶段 2 覆盖完整页面入口和异常表达；阶段 3 接入地图/检索；阶段 4 播放/个人库；阶段 5 路线调度；阶段 6 端到端复核。真实地图资源缺口不阻止独立的示例骨架，但不能据示例把阶段 3 真实地图要求标通过。
