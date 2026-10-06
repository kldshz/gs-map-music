# 原神地图音乐探索与播放器

以地图选点找音乐、以曲目和文字线索反向定位地点，并支持路线模拟播放。统一需求见 [项目说明与分阶段提示词.md](项目说明与分阶段提示词.md)。

当前完成阶段 1：来源调研、接口和必要探针。选定 Vue/Vite/TypeScript/Pinia/Leaflet；尚无应用依赖清单或可启动页面，阶段 2 再由实际调用的 Claude 主导前端骨架。

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
- [个人音频整理与导入](resources/README.md)：`resources/local/audio/genshin` 全部忽略，先少量 MP3/FLAC/WAV 即可，不支持 `.ncm`。

## 阶段 1 检查

在本目录 PowerShell 执行：

```powershell
node scripts/check-stage1.mjs
# 本机已有的隔离验证工具（.local 不入库）：
node .local/tools/node/node_modules/typescript/bin/tsc --strict --noEmit --lib es2022,dom --target es2022 --module esnext --moduleResolution bundler src/domain/contracts.ts
git status --short --branch
git diff --check
git diff --cached --check
git log -1 --oneline
git remote -v
git ls-remote origin refs/heads/main
```

每个完整修改单元检查后提交并执行 `git push origin main`。若认证或网络失败，记录未推送提交与恢复步骤，不能称为已同步。没有应用启动、构建或业务测试命令；阶段 2 创建骨架后补充。

新机器运行数据/音频/坐标/文档探针只需 Node；接口编译可先在仓库外安装 TypeScript 5.9.3，或使用 `npx --yes --package typescript@5.9.3 tsc` 加上述参数（本轮实际验证使用已有隔离工具）。FFmpeg 完整解码另已通过；浏览器发声、地图标校和生产路线仍待后续阶段。

两段 CC BY 4.0 WAV 合计约 1.06MB，保留改编与署名。原神音频、完整第三方音源、地图包和本机工具不入库。项目自身公开代码许可证尚未选择；各类第三方权利分别记录。
