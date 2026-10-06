# 原神地图音乐探索与播放器

以地图选点找音乐、以曲目和文字线索反向定位地点，并支持路线模拟播放。统一需求见 [项目说明与分阶段提示词.md](项目说明与分阶段提示词.md)。

当前仅执行阶段 0：环境、仓库和协作准备。尚无业务代码、依赖清单或可启动页面；技术栈和资源来源留待阶段 1 核实。

- 私有仓库：<https://github.com/kldshz/gs-map-music>
- [项目状态与环境](docs/PROJECT_STATUS.md)
- [验收与限制](docs/ACCEPTANCE.md)
- [关键决定](docs/DECISIONS.md)
- [Claude 协作与恢复步骤](docs/COLLABORATION.md)
- [工单模板](docs/WORK_ORDERS/TEMPLATE.md)；[非交互调用脚本](scripts/run-claude-work-order.ps1)

## 阶段 0 检查

在本目录 PowerShell 执行：

```powershell
git status --short --branch
git diff --check
git diff --cached --check
git log -1 --oneline
git remote -v
git ls-remote origin refs/heads/main
```

每个完整修改单元检查后提交并执行 `git push origin main`。若认证或网络失败，记录未推送提交与恢复步骤，不能称为已同步。没有应用启动、构建或业务测试命令；确定技术方案并创建代码后再补充。

本阶段没有引入地图或音乐素材，也没有确定项目代码许可证；代码、地图素材、音乐元数据及音频使用条件须分别确认。
