# 项目状态

更新时间：2026-10-06（Asia/Shanghai）。

## 阶段与交付

- 本轮：阶段 1 调研、技术选型、接口、示例数据、许可音频文件及必要探针已完成；真实地图授权/数据缺口明确保留。阶段 0 协作连通性已通过，有网关身份/effort 回显限制。
- 下一阶段：阶段 2，Claude 前端设计与可运行骨架；本轮未进入。阶段间由用户选择继续。
- 初始目录：`C:\Users\17211\Desktop\gs-map-music`，仅有需求文件，无代码、Git 仓库或用户未提交代码。
- 已建立：协作记录、[来源调研](RESEARCH.md)、[网易官方追加核实](NETEASE_RESEARCH.md)、[技术方案](ARCHITECTURE.md)、[路线测试计划](ROUTE_TEST_PLAN.md)、[接口](../src/domain/contracts.ts)、[数据样本](../data/demo.bundle.json)、[许可示例音频与署名](../public/audio/demo/ATTRIBUTION.md)。需求已按用户新说明补充个人用途/本地音源。
- 未开始：业务依赖清单、Claude 前端设计、页面、真实地图接入、播放器/检索/路线生产实现、部署。

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
- 本轮起始 HEAD：`85f8d090e7718f5a127f1db045661a6d59a1ecc8`，已推送，起始工作区干净；本轮完整单元为阶段 1 来源、方案、接口/数据/音频探针及交接。检查后提交推送，最终已推送哈希在交付回复中列出，不循环更新自身哈希。
- 同步判定：本地 `git rev-parse HEAD` 与 `git ls-remote origin refs/heads/main` 一致，且工作区干净。推送结果未核对前不视为同步。
- 网络配置：全局针对 GitHub 的代理指向未运行的 `127.0.0.1:7890`，首次普通推送失败；精确覆盖 GitHub 的命令配置后成功。已在本仓库 `.git/config` 中把 `http.https://github.com.proxy` 与 `https.https://github.com.proxy` 设为空，使用直连；未改全局配置。恢复全局行为：`git config --local --unset http.https://github.com.proxy` 和 `git config --local --unset https.https://github.com.proxy`。恢复前应确保代理可用。

## 阻塞与恢复

- 原 C0-01 工作区授权阻塞已解除：用户确认手动信任；按其后续要求改用工单驱动 CLI，不再依赖桌面输入。
- 已验证工单 S0-CLI-001：既有网关模型列表及响应均为 `claude-opus-5-5`；CLI 明确传入 effort=high，JSON 响应、中文范围与完成标记通过核验。没有模型替换。
- 首次调用 180 秒超时；核实模型正式 ID、显式传递既有服务环境后成功。正常运行原始响应存于忽略目录 `.local/claude-runs`，摘要位于 docs/WORK_ORDERS/S0-CLI-001.RESULT.json。
- 当前没有阻止阶段 1 的协作阻塞。配置使用 kuaipao.ai 网关，无法独立认证其上游供应商；服务没有单独回显内部 effort 策略，不能推断隐藏实现。
- 阶段 2 仍需验证实际前端交付：通过工单返回精确文件 path/content，Codex 审核后落盘、构建并查看页面。阶段 0 没有产生业务代码或提前执行该阶段。
- M1-01：真实底图、区域和锚点数据尚无授权资源包；空荧代码许可不等于第三方瓦片/服务许可。用户确认个人非商业无数据。阶段 2 用显著标注的合成示意资源可继续；阶段 3 的真实地图验收保持阻塞，不能代替。
- M1-02：两条真实 OST 目录记录已核对，但游戏地点/昼夜关联 pending，音源空。未收到用户普通本地音频。目录条目不可伪装可播放；阶段 4 可先用独立许可示例验收。
- M1-03：网易云官方确有按 ID 取播放 URL 的 API，但个人 FAQ 当前限定 ncm-cli；尚无直接网页 API 资质、核实网易曲目 ID 或业务调用。官方 CLI 外部播放是后续选项，与浏览器播放分别验收；不需要先全量下载 OST。

## 阶段 1 验证证据

- `node scripts/check-stage1.mjs`：数据引用/来源、多对多、昼夜/待核实排除、两段 PCM WAV hash/时长/非静音、两类 CRS 数学往返、孔洞/重叠/同层判区、A→B→C→B→A 样本序列和本地 Markdown 链接通过。
- TypeScript 5.9.3 strict/noEmit：contracts 和示例 JSON 对 Dataset 的完整赋值编译通过。工具与临时类型探针在 `.local`，非业务依赖。
- FFmpeg 7.1 完整解码两个 WAV 至 null，退出码均 0；文件真实可解码不代表浏览器播放器已实现。
- GitHub 固定 commit 引用路径与实际仓库树核对；维护元数据/默认分支 commit 重查一致。官方网易文档实际 code=200、标题/更新日期核实。
- 提交前审计：52 个本地 Markdown 链接存在；固定版本 GitHub 引用路径与树一致；个人资源/工具/认证/未审核 WAV 被忽略、两个精确审核 WAV 可入库；常见令牌/私钥模式无命中，空白差异无错误（模式扫描不能保证任意秘密绝不存在）。最终同步依据仍为本地/远程 HEAD 一致且工作区干净。

## 启动与检查

尚无应用启动或构建命令，阶段 2 建立。阶段 1 可执行 `node scripts/check-stage1.mjs`；接口类型检查见 README。工单连通性命令：`pwsh -NoProfile -File scripts/run-claude-work-order.ps1 -Ticket docs/WORK_ORDERS/S0-CLI-001.md`，会发起真实模型请求；安装与上下文传递见协作记录。后续开始前须重新核对本文件及实际 Git，不能仅依赖口头总结。
