# 项目状态

更新时间：2026-10-06（Asia/Shanghai）。

## 阶段与交付

- 当前：阶段 3 进行中，尚未完成。用户新提供 V3/V4 仓库后完成源码/许可比较及至冬底图探针，见 [地图基础比较](MAP_BASE_COMPARISON.md) 和 [机器证据](MAP_RESOURCE_PROBE.json)。优先以 V3 地图模块为基础接入现有音乐应用；未进行整包迁移或新一轮前端设计。
- 阶段 2 历史交付：Claude Opus 5-5/high 实际工单交付 Vue/Vite 骨架并两轮返修；Codex 审核整合、启动、严格类型/生产构建、6项实际 Edge UI 测试及桌面/手机截图查看通过。网关身份/effort 回显限制保留。
- 当前增量：V3 生产配置有至冬1入口及 twt672 瓦片，抽查5张均200且WebP签名有效，实际查看3张。全部最新锚点响应、真实坐标标校和页面集成未通过，不能继续把资源现状写成“没有任何真实底图”，也不能把抽查抬升为 S3-01 全部通过。
- 地区提取增量：经官方公开V3页面正常游客流程，地区API HTTP/业务200返回47条，已与地下/叠层配置合成完整4层目录，共544节点。Excel/CSV/JSON已生成并核对，见[地区导出记录](REGION_CATALOG_EXPORT.md)。此前仅列瓦片代码，遗漏的第三级/第四级现已补齐；源分类字段已实取，锚点/坐标标校仍待完成。
- 本轮用户要求覆盖历史方案：只允许原神音乐，旧许可非原神示例须在阶段3实现中移除；昼夜只作歌曲/关系标注，不再分页面；歌单6868625065及锚点/神像需导出补全表，缺字段留空。本机网易官方CLI已配置且 login --check 返回已登录；不在本记录保存凭据。完整歌单导出、资源导入与双向检索仍在本阶段待完成，不在这次地图比较单元中记通过。
- 初始目录：`C:\Users\17211\Desktop\gs-map-music`，仅有需求文件，无代码、Git 仓库或用户未提交代码。
- 已建立：协作记录、[来源调研](RESEARCH.md)、[网易官方追加核实](NETEASE_RESEARCH.md)、[技术方案](ARCHITECTURE.md)、[路线测试计划](ROUTE_TEST_PLAN.md)、[接口](../src/domain/contracts.ts)、[数据样本](../data/demo.bundle.json)、[许可示例音频与署名](../public/audio/demo/ATTRIBUTION.md)。需求已按用户新说明补充个人用途/本地音源。
- 新增：[阶段2审核](STAGE2_REVIEW.md)、前端源码、固定依赖/lock、构建与真实浏览器测试。SVG合成预览可选点、昼夜筛选/搜索/详情/单点定位，路线只做既有样本点静态草稿。Leaflet/Pinia已安装，但生产适配/应用状态模块未接入。
- 未开始：真实地图接入、完整检索服务、运行时导入校验、播放引擎/持久化、路线模拟/自动切歌、部署。占位禁用控件不计功能通过。

## 环境证据

| 项目 | 2026-10-06 实测 |
| --- | --- |
| 系统与命令行 | Windows，PowerShell |
| Git | 2.46.0.windows.1 |
| Git Credential Manager | 2.5.1；Git credential helper 为 manager |
| GitHub | API `/user` 核实账号 kldshz；同名仓库查询 404 后创建私有仓库成功 |
| GitHub CLI | `gh` 不在 PATH；本轮无需安装，通过现有凭据管理器与 GitHub REST API 完成建仓 |
| Node.js / npm | v22.17.0 / 10.9.2 |
| pnpm | 11.25.0；可用不代表项目已选择它 |
| Python | 3.9.13；本项目尚未选用 |
| Yarn | 不在 PATH；不是当前阻塞 |
| Claude | 桌面程序 2.19675.1.0 已运行；新增独立安装的 CLI 2.1.291，不修改 PATH；PowerShell 7.6.5 工单脚本已实测，详见协作记录 |

## Git 状态

- 分支：`main`；远程：`origin` → `https://github.com/kldshz/gs-map-music.git`。
- 仓库：<https://github.com/kldshz/gs-map-music>，私有。
- 沿用已配置的 Git 提交身份；未修改全局配置；没有历史需要迁移。
- 初始基础提交：`72a936a29386b40d62d0453acda62e26bdc9ce55`，已推送；随后 `git ls-remote origin refs/heads/main` 与本地 HEAD 相同、工作区干净。
- 阶段2起始 HEAD：`1a4a345c03c60c3a783a8e66f2c451d6334d290f`，已推送，起始工作区干净。本轮完整单元为经返修/整合/实际验证的前端骨架、依赖锁定、测试和交接；检查后提交推送，最终已推送哈希在交付回复中列出，不循环更新自身哈希。
- 同步判定：本地 `git rev-parse HEAD` 与 `git ls-remote origin refs/heads/main` 一致，且工作区干净。推送结果未核对前不视为同步。
- 阶段3本项调研起点为已推送的阶段2提交 `5077f9698408150f0454fed671fe5c2d6ff69983`。本单元只提交地图比较、选择性探针证据与相关交接记录；package.json/package-lock.json 中的阶段3依赖准备尚未完整交付，保留在工作区，不混入调研提交。核对远程HEAD一致仅证明此提交已同步，不代表当前全部未提交改动已交付。
- 网络配置：全局针对 GitHub 的代理指向未运行的 `127.0.0.1:7890`，首次普通推送失败；精确覆盖 GitHub 的命令配置后成功。已在本仓库 `.git/config` 中把 `http.https://github.com.proxy` 与 `https.https://github.com.proxy` 设为空，使用直连；未改全局配置。恢复全局行为：`git config --local --unset http.https://github.com.proxy` 和 `git config --local --unset https.https://github.com.proxy`。恢复前应确保代理可用。

## 阻塞与恢复

- 原 C0-01 工作区授权阻塞已解除：用户确认手动信任；按其后续要求改用工单驱动 CLI，不再依赖桌面输入。
- 已验证工单 S0-CLI-001：既有网关模型列表及响应均为 `claude-opus-5-5`；CLI 明确传入 effort=high，JSON 响应、中文范围与完成标记通过核验。没有模型替换。
- 首次调用 180 秒超时；核实模型正式 ID、显式传递既有服务环境后成功。正常运行原始响应存于忽略目录 `.local/claude-runs`，摘要位于 docs/WORK_ORDERS/S0-CLI-001.RESULT.json。
- 当前没有阻止阶段2交付的协作阻塞。配置使用 kuaipao.ai 网关，无法独立认证其上游供应商；服务没有单独回显内部 effort 策略，不能推断隐藏实现。
- 阶段2整包001在600秒、分批001-A在360秒超时，无交付；独立CHECK成功。缩小上下文与返回文件数量后002成功交付4个文件，R1完整App/style返修、R2精确替换成功。请求固定指定模型/high，成功响应唯一modelUsage一致，无替换。最终构建/UI/实际查看通过，详见协作和审核记录。
- M1-01 更新：V3 最新生产配置/至冬1瓦片可访问已实测；尚无完整本地地区/锚点包及页面标校结果。代码许可不等于第三方资源再授权，资源/服务条件继续分项记录；S3-01 部分通过，仍需真实数据集成与使用条件核实，见地图比较。
- M1-02 更新：既有 OST 地点/昼夜关联 pending，音源空；用户将补全歌单曲目与锚点关联。目录条目不可伪装可播放。阶段4仅使用原神音源，旧独立许可示例方案被本轮明确要求取代。
- M1-03 更新：用户已注册开发者并在本机填写凭据、完成扫码。官方 CLI 0.1.7 的登录检查成功；已发起指定歌单的元数据读取，完整性/字段仍需核对。凭据不进入前端、Git或Claude上下文。CLI元数据访问不代替浏览器音源解析/发声验收。

## 阶段 1 验证证据

- `node scripts/check-stage1.mjs`：数据引用/来源、多对多、昼夜/待核实排除、两段 PCM WAV hash/时长/非静音、两类 CRS 数学往返、孔洞/重叠/同层判区、A→B→C→B→A 样本序列和本地 Markdown 链接通过。
- TypeScript 5.9.3 strict/noEmit：contracts 和示例 JSON 对 Dataset 的完整赋值编译通过。工具与临时类型探针在 `.local`，非业务依赖。
- FFmpeg 7.1 完整解码两个 WAV 至 null，退出码均 0；文件真实可解码不代表浏览器播放器已实现。
- GitHub 固定 commit 引用路径与实际仓库树核对；维护元数据/默认分支 commit 重查一致。官方网易文档实际 code=200、标题/更新日期核实。
- 提交前审计：52 个本地 Markdown 链接存在；固定版本 GitHub 引用路径与树一致；个人资源/工具/认证/未审核 WAV 被忽略、两个精确审核 WAV 可入库；常见令牌/私钥模式无命中，空白差异无错误（模式扫描不能保证任意秘密绝不存在）。最终同步依据仍为本地/远程 HEAD 一致且工作区干净。

## 阶段 2 验证证据

- `npm run build`：vue-tsc strict检查及Vite7.3.7生产构建通过；完整 `npm audit` 无已知漏洞。原阶段1候选Vite7.2.6审计出现高危问题，已在同主版本修复，见D2-01。
- `npm run test:ui -- --workers=1`：6/6通过，本机 Edge154.0.4258.53。包含day2/night1/空C、许可和来源、键盘单点反向选择、多关联入口、待核实/无音源/无坐标、无假audio、路线A→B→A/撤销清除、原生dialog/Esc/回焦、390/320手机无横溢出且详情末尾不被footer遮挡。
- 1440×900桌面和390/320×844手机布局实测；SVG与HTML点中心偏差<3px、4:3、footer在视口内、手机footer≤120px；Codex实际查看最终桌面/手机/路线/dialog截图。生产UI检查不等于真实地图坐标标校或浏览器发声通过。
- `npm run check:stage1`：已有数据、PCM、坐标/几何探针和本地Markdown链接回归通过。原始模型输出、截图、trace与依赖/构建仍留忽略目录；不提交凭据、token统计或内部推理。

## 启动与检查

`npm ci` 后 `npm run dev`，访问 <http://127.0.0.1:5173>。`npm run build`；`npm run preview` 默认4173。`npm run test:ui` 需本机Edge及已构建dist，自动起停4173预览（先停止手动preview）；`npm run check:stage1`、`npm audit`。细节见README。

真实Claude派单仍用 `pwsh -NoProfile -File scripts/run-claude-work-order.ps1 -Ticket docs/WORK_ORDERS/工单.md -ContextFiles 仓库内输入`，会发起实际服务请求；参数固定claude-opus-5-5/high，不是模拟。后续先读取本文件和实际Git，不能仅依赖口头总结。
