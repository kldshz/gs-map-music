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

## D0-05：仅本仓库覆盖失效 GitHub 代理（2026-10-06）

首次推送报无法连接 `127.0.0.1:7890`。通用 `http.proxy` 覆盖无效，检查确认全局配置为针对 GitHub 的 URL 规则；精确命令覆盖 `http.https://github.com.proxy`、`https.https://github.com.proxy` 为空后推送成功。随后只在本仓库 `.git/config` 保存这两个空值，让后续普通 `git push` 可执行。全局代理配置未改变，没有关闭 TLS 验证。

恢复步骤见状态文档。初始提交与远程 main 已核对一致；收尾审计记录是独立文档修改单元，也检查后提交、推送。

## D0-06：工单与非交互调用优先（2026-10-06）

用户明确要求 Claude 读取工单后输出、减少桌面输入操作，并由 Codex 保留总体管理权。统一需求和 AGENTS.md 已同步增加这一约定；桌面端验证作为历史证据保留，不作为后续常规派单入口。

选用独立安装的 Claude Code 2.1.291 非交互 CLI，固定本机模型标识与真实 effort 参数。工单与上下文通过 stdin 传入；模型工具禁用，交付由 Codex 审核落盘，Git 操作由 Codex 执行。现有配置使用 kuaipao.ai 网关，CLI/网关的模型名称并非上游供应商身份的独立证明；记录这一证据边界。

该工具安装在用户目录，不决定网站技术栈。运行结果存于忽略目录，已验证脚本语法、仓库外输入拒绝与运行结果忽略规则；实际工单调用结果另记于协作与验收记录。系统或服务必须人工处理的授权仍由用户处理；项目协调权不等于绕过这些限制。
