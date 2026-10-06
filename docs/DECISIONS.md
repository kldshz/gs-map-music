# 决定记录

## D0-01：阶段边界与统一需求（2026-10-06）

依据：[项目说明与分阶段提示词.md](../项目说明与分阶段提示词.md)及本轮用户要求。本轮只做阶段 0，保留原文，不实现页面或业务功能。选型、地图/音乐来源、坐标与许可留待阶段 1。

## D0-02：私有仓库与主分支（2026-10-06）

初始目录没有 Git，初始化 `main`。通过现有 Git Credential Manager 凭据在内存中访问 GitHub API，验证账号 `kldshz`，查询同名仓库返回 404 后创建 `kldshz/gs-map-music`，响应 `private=true`。未安装额外付费服务，未存储或输出凭据。沿用既有 Git 提交身份，使用 HTTPS remote 与普通推送。

来源与证据：

- 仓库：<https://github.com/kldshz/gs-map-music>
- 当前账号 API：<https://docs.github.com/en/rest/users/users#get-the-authenticated-user>
- 私有仓库创建 API：<https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user>
- 本次实际请求：`GET https://api.github.com/user`、`GET https://api.github.com/repos/kldshz/gs-map-music`、`POST https://api.github.com/user/repos`。这些是操作接口证据；阶段 1 的外部资源调研尚未进行。

## D0-03：凭据与资源隔离（2026-10-06）

`.gitignore` 排除本机配置、密钥、依赖、构建、日志及常见大型音频/地图包。经核实许可的小型演示素材如确需入库，应在决定记录明确来源与例外再调整规则。`.gitattributes` 约定 Markdown 使用 LF；不改动原始需求文本。

## D0-04：Claude 验证分层（2026-10-06）

保持用户指定 Claude Opus 5-5 高推理要求。桌面 UI 显示 `Opus 5.5`，可以选择“高”；本地设置中的 `Opus5-5[1M]` 属于配置别名，不能证明上游模型身份。工作区授权阻止最小请求完成，记录为待验证，不自动换模型。

通过 computer-use 技能检查桌面端，其 guidance 禁止代处理安全/隐私权限请求。因此出现“信任工作区”后等待用户手动处理；这不阻止 Git 与文档工作。操作记录与恢复方式见 [COLLABORATION.md](COLLABORATION.md)。

## 尚未决定

应用技术栈与包管理器、地图项目及其代码/瓦片/数据许可证、曲库与音频来源、区域判定策略、项目代码许可证。阶段 0 未引入任何外部地图或音频资产，不作可用或许可结论。
