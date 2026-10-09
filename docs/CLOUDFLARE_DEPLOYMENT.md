# Cloudflare Workers 与 D1（2026-10-09）

本轮是阶段4的部署补齐，不开始路线功能。用户授权 Codex 实施逐步改进，并提供现有站点 https://gs-map-music.online/，确认平台为 Workers。

## 故障与方案

实测线上 `/api/playback/resolve?trackId=netease%3A1455706951` 返回 HTTP 200、`text/html` 和 SPA 首页；`/api/health` 同样返回首页。原播放接口是 Vite 的本机插件，构建静态文件不会带上接口、MySQL 或本机文件。既有 Worker 无业务模块及数据库绑定。

现在增加 Worker 入口，`/api`、`/api/*` 优先由 Worker 处理，未知 API 返回 JSON 404，其他路径交给静态资源绑定。只读 D1 活动版本的网易数字 ID，公开资源仍由网易提供，Worker 不存储或代理音频，也不接收任意资源 URL。本机 Vite/MySQL 和本机文件流继续可用。

网易稳定入口实测将两首样本重定向到 HTTP CDN，而 HTTPS 媒体地址也实测可用。云端先核实网易音频响应，再独立 HEAD 核实 HTTPS 地址，只有网易媒体域、成功状态、音频类型且最终 HTTPS 才返回 ready。临时地址仅在当前播放请求/Audio 内存中使用，不写目录、D1 或 localStorage。`expiresAt` 是60秒的保守重新解析期限，不声称是供应商签名有效期；正在播放不因这个期限强制中断，重试/刷新重新解析。`preview=null`，不承诺全库全曲可播。

## 数据范围与导入

D1 是 SQLite 语义；没有导入旧 MySQL SQL 或复制可能过期的地理关联。迁移依据为当前 `public/data/kongying-map.json`、`public/data/music-library.json` 和 `data/association-edits.json`，使用现有验证与人工覆盖函数。保留原始说明、坐标、地理分类、来源、评价历史字段和 pending。当前1663曲、884点位（62神像）、47地区、2441音乐地点、13038 pending关联、2241曲目—音乐地点关系；人工覆盖文件本次为空。收藏/歌单仍保存在各浏览器，不迁移、不跨设备同步。

`catalog_release` 的 SHA-256 标识不可变快照，各业务表以版本与原 ID 共同为主键，完整字段存在 `data_json`。人工删除也保留在 `association_edit`，有效挂载先合并人工覆盖再导入。每批最多2MB、每条SQL小于95KB；地图配置按16KB二进制分段，避免超过 D1 单条SQL限制。SQL不包含 BEGIN/COMMIT，符合 D1 导入要求。

导入可重复执行，不重复新增；最后才切换 `active_catalog`。触发器检查曲目、点位、地区、音乐地点、关联、人工覆盖、曲目地点、地图配置段数量均完整，失败或中断时不启用半成品。上一版本保留，可用以下方式回退数据：

```sql
UPDATE active_catalog SET release_id='<已导入完整的旧SHA-256>' WHERE singleton=1;
```

当前没有公网写入或库编辑 API。后续若增加编辑，必须新增身份校验与审核存储，不能开放匿名写入。页面展示仍读取同批静态 JSON，D1 已存完整目录，本轮仅让播放查询读 D1；不得宣称前端所有检索已实时读库。发布前应先导入同一数据版本，再发布对应静态资源。

## 命令

Node >=22.12，已固定 Wrangler 4.149.0。原 `npm run dev` 与 `npm run preview` 仍运行本机 Vite 播放方式。

```powershell
npm ci
npm run build
npm run cf:import:local
npm run cf:dev
```

本地 Worker http://127.0.0.1:8787，D1模拟状态在 `.local/cloudflare/state`；此入口不需要本机 MySQL。所有本机凭据、导出SQL、导入日志、Cloudflare配置和浏览器证据都忽略，不入库。

已登录账号且确认现有 Worker、域名后：

```powershell
npx wrangler whoami
npx wrangler d1 create gs-map-music
node scripts/configure-cloudflare.mjs <accountId> <databaseId> gs-map-music.online gs-map-music
npm run cf:import:remote
npm run cf:check
npm run cf:deploy
```

已有 D1 不要再次创建；实际 ID 从 Cloudflare 获取。提交的 `wrangler.jsonc` 使用本地占位 ID，公网发布必须用生成的 `.local/cloudflare/wrangler.json`。本轮未安装 R2、未上传音乐或地图瓦片、未启用付费套餐。

Worker 回退使用部署前记录的版本 ID，命令 `npx wrangler rollback <versionId> --config .local/cloudflare/wrangler.json`；绑定与 D1 数据生命周期独立，回退后需核对接口。本轮原线上版本和配置只读备份位于 `.local/cloudflare/backup`；旧线上仅静态资源，回退它不能恢复云端播放。

## 检查与证据

- 72项数据/业务测试通过（43 TypeScript +29 MJS），含5项新增迁移、幂等、人工删除/新增、中断回退、HTTPS和API边界测试。
- 类型检查与构建通过，包括 Worker 独立类型配置；npm audit 0漏洞。
- 实际 Workerd/D1 本地导入成功，`/api/health` ready、1663曲；接口JSON、两首HTTPS音源、真实完整播放回归3项通过。
- 真实两首：晨曦酒庄1455706951、孤独的旅居1455706952。测试检查真实媒体进度/时长、播放暂停、seek、音量静音、上下曲、随机/循环、地图与队列连续、刷新点击恢复、非静音解码。没有伪造媒体事件或保存音频。
- `npx playwright test --config playwright.cloud.config.ts` 验证本地 Worker；设置 `APP_BASE_URL=https://gs-map-music.online` 可验证公网，不复用本机 Vite 接口。
- 公网发布和浏览器结果将在下一条交接追加；本节初始检查不将本地成功当作公网成功。

## 后续改进边界

优先完成公网真实音频验收；若 Cloudflare 出口受到网易限制，如实 unavailable，不用代理或替代曲冒充成功。之后可按需要增加目录读库和受保护的数据管理，不开始路线、不自动迁移浏览器个人库。外部音源全库/地区/长期可用性需持续按实际结果判断。

参考实际查阅的 Cloudflare 官方文档：[静态资源路由](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)、[D1导入导出](https://developers.cloudflare.com/d1/best-practices/import-export-data/)、[D1限制](https://developers.cloudflare.com/d1/platform/limits/)、[Wrangler配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。

本机 PowerShell/npm 环境发现 `npm run ... -- --dry-run` 未转交参数，部署检查发生了真实发布。首页核实正常；D1导入完成前API明确返回不可用，不返回假音源。已增加固定 `npm run cf:check`，实测以 `--dry-run: exiting now` 结束，不再依赖参数转交。远程导入曾遇一次 Cloudflare internal error，单批重试成功；导入器仅对临时网络/服务错误最多重试两次，约束/结构错误立即停止。

## 公网资源核实后的增量（优先前文初始方案）

远程D1已全部导入并启用，活动版本 `2b478973af5a2330a431f0e1f55d12f7db986e4ad45891e6f13187468b67aef2`。线上实际计数1663/884/13038/62/13038（曲目/点位/关联/神像/pending），外键检查零错误。此前线上静态Worker版本 `130fdae6-4982-450d-8d9c-5a76c296703a` 已记录，未修改Git稳定标签。

Cloudflare WNAM出口对两个样本的公开入口核实失败，但从同一HTTPS站点打开浏览器、用户手势点击后，晨曦酒庄已实际播放4.21秒，时长68.321229秒，无媒体错误。这说明云端HEAD失败不能代表用户浏览器不可播放。当前新增 `PlaybackResource.status='candidate'`：只有D1已存在且数字ID与主键一致的曲目，在云端音源未验证时返回固定网易HTTPS公开入口，不返回 ready，不换同名曲、不接受任意URL。播放器仅允许这一固定入口格式的candidate；加载过程中不伪称成功，只有真实playing事件成功，失败/浏览器拒绝仍反馈，进度来自实际媒体。

浏览器直接播放依赖它对媒体重定向的处理；本轮Edge通过，不保证所有浏览器/地区均可用，不关闭浏览器安全策略。若云端核实HTTPS成功，继续返回短时ready链接。两种路径均不代理或存储音频，不上传R2，不发送用户认证。所有URL只保留在内存，刷新重新解析。

新候选流程单元检查覆盖无playing事件不能报告播放、媒体error不伪造成功、任意第三方候选URL拒绝。最新73数据业务（44TS+29MJS）与类型构建通过。公网浏览器最终结果另在验收追加记录；早先本地3项是初始严格ready流程，不冒称覆盖新的公网候选流程。

## 最终公网验收

https://gs-map-music.online 已发布 Worker `046dc1e8-4b2f-4c9d-b8ce-777e696590b9`，域名与原站点保持。3项公网Edge测试全部通过：API路由/安全边界/D1就绪、两首资源入口/存储、真实音频完整控制和刷新恢复。晨曦酒庄68.321229秒、孤独的旅居50.138896秒，晨曦音频内存解码能量640.14非静音；曲库和地图页面已实际截图检查。测试未关闭HTTPS安全策略、未伪造媒体事件、未保存音频。

公网静态文件与Vite合并人工编辑后的有效快照SHA-256完全一致；原曲库字段顺序经验证函数规范化，不能把格式化前源文件字节与构建字节不同当作业务数据变更。增加 `scripts/deploy-cloudflare.ts`：部署前检查构建与有效快照、远程活动D1版本一致；过期构建/未导入D1停止发布。新增测试验证此约束，最终22项迁移/播放定向检查通过（包含此前5+1新增业务测试及既有播放测试，次数有重叠）；此前73业务全轮、最终类型构建和发布dry-run通过。

本机证据：`.local/cloudflare/public-verification.json`、`remote-audit.json`、`public-browser.log`、`public-player.png`；凭据/完整导入日志只在忽略目录。D1实际约18MB，以remote-audit的 `size_after` 实测为准。未改原JSON/人工编辑或稳定标签、未移除本机MySQL、未增加路线与R2。Cloudflare出口限制已用明确candidate及真实浏览器播放验证处理，仍不保证所有曲目/浏览器/地区长期可用。

下一轮可复制：读取项目说明、AGENTS、状态、CLOUDFLARE_DEPLOYMENT、PLAYBACK_INTERFACE和验收。继续阶段4部署改善，先核查现有公网Worker/D1版本，抽样核查不同专辑和浏览器音源，记录不可播项与原因；保留candidate只由真实媒体事件确认播放、人工记录、pending及本机播放方式。按实际需要再决定目录读库与受保护的数据管理；不开展路线、不自动迁移个人库、不转存全部音频。检查、更新记录、提交推送。
