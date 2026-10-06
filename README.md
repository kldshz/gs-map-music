# 原神地图音乐探索与播放器

以地图选点找音乐、以曲目和文字线索反向定位地点，并支持路线模拟播放。统一需求见 [项目说明与分阶段提示词.md](项目说明与分阶段提示词.md)。

当前完成阶段 2：Claude 指定模型/high 实际交付并返修的 Vue/Vite 页面骨架，可浏览地图主体、昼夜样本面板、搜索、曲目详情、常驻播放器预览及路线草稿。Codex 已审核整合、构建并实际查看桌面/手机页面。

真实地图资源授权和数据仍待落实；内置的是原创合成区域与两段许可非原神音乐。两条真实 OST 只含来源可查的少量元数据，没有内置音源，地点/昼夜待核实。

- 私有仓库：<https://github.com/kldshz/gs-map-music>
- [项目状态与环境](docs/PROJECT_STATUS.md)
- [验收与限制](docs/ACCEPTANCE.md)
- [关键决定](docs/DECISIONS.md)
- [Claude 协作与恢复步骤](docs/COLLABORATION.md)
- [工单模板](docs/WORK_ORDERS/TEMPLATE.md)；[非交互调用脚本](scripts/run-claude-work-order.ps1)
- [地图与音乐调研](docs/RESEARCH.md)；[网易云官方 API/个人 CLI 核实](docs/NETEASE_RESEARCH.md)
- [技术方案](docs/ARCHITECTURE.md)；[领域接口](src/domain/contracts.ts)；[数据样本](data/demo.bundle.json)
- [路线测试方案](docs/ROUTE_TEST_PLAN.md)；[许可音乐署名](public/audio/demo/ATTRIBUTION.md)
- [阶段 2 审核与浏览器证据](docs/STAGE2_REVIEW.md)
- [个人音频整理与导入](resources/README.md)：`resources/local/audio/genshin` 全部忽略，先少量 MP3/FLAC/WAV 即可，不支持 `.ncm`。

## 启动和验证

需要 Node.js ^20.19.0 或 >=22.12.0（本机22.17.0），以及 npm。在仓库目录执行：

```powershell
npm ci
npm run dev
```

打开 <http://127.0.0.1:5173>。开发服务器仅绑定本机，5173端口被占用会报错，需要先停止占用进程。生产构建与检查：

```powershell
npm run build
npm run preview
# 另一个终端（preview 默认 http://127.0.0.1:4173）：
npm run check:stage1
```

UI 测试需要已安装 Microsoft Edge，先构建；测试会自行启停4173的生产预览，请先停止手动 preview。

```powershell
npm run build
npm run test:ui
npm audit
```

阶段 2 已实测6项 Edge UI 测试。其他浏览器尚未验证；没有 Edge 的机器可安装它或调整 Playwright 配置，再复验。截图/失败 trace 在忽略目录 `.local/browser-tests`。

播放、进度、音量、队列、收藏/列表/编辑/音源导入及模拟移动尚未接入，控件禁用且标注后续阶段。路线仅三个样本点的静态草稿，未实现任意点或调整节点。SVG 示意图尚未实现 Leaflet MapAdapter，搜索也只是小样本界面预览；不据此宣布阶段3–5的生产功能通过。合成地图、非原神许可样本、无音源/待核实目录均显著标注。

## 数据与版本检查

在本目录 PowerShell 执行：

```powershell
node scripts/check-stage1.mjs
npm run typecheck
git status --short --branch
git diff --check
git diff --cached --check
git log -1 --oneline
git remote -v
git ls-remote origin refs/heads/main
```

每个完整修改单元检查后提交并执行 `git push origin main`。若认证或网络失败，记录未推送提交与恢复步骤，不能称为已同步。

新机器运行数据/音频/坐标/文档探针只需 Node；应用类型检查由安装后的 vue-tsc 执行。阶段1 FFmpeg 完整解码已通过；浏览器发声、真实地图标校和生产路线仍待后续阶段。

两段 CC BY 4.0 WAV 合计约 1.06MB，保留改编与署名。原神音频、完整第三方音源、地图包和本机工具不入库。项目自身公开代码许可证尚未选择；各类第三方权利分别记录。
