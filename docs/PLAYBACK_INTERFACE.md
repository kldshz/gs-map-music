# 阶段4播放接口

本机Vite dev/preview插件scripts/playback-service.ts，GET/HEAD、同源127.0.0.1或localhost；跨站Origin/Sec-Fetch拒绝403。只接受当前原神JSON库白名单且匹配netease:数字的MySQL记录；SQL条件仅校验后ID。配置.local/mysql-client.ini与官方CLI配置留本机。

GET /api/playback/resolve?trackId=netease%3A1455706951：

```json
{"status":"ready","provider":"local","url":"/api/playback/audio?trackId=netease%3A1455706951","expiresAt":null,"preview":false}
```

匹配本机文件存在且非空时返回local ready。没有文件时，使用数据库数字ID组成网易公开媒体外链：`https://music.163.com/song/media/outer/url?id=<数字ID>.mp3`，无账号cookie或开发者凭据HEAD跟随重定向核实最终音频，再返回稳定ID链接给Audio.src。不是NetStart托管API，也不依赖官方CLI应用可见性。只有audio类型/网易music.126.net媒体域/成功状态才ready；HTML、403/404、超时返回unavailable，不换同名歌曲。该接口是项目本机服务，不是网易官方HTTP端点。

```json
{"status":"ready","provider":"netease-outer","url":"https://music.163.com/song/media/outer/url?id=1455706951.mp3","expiresAt":null,"preview":null}
```

preview=null表示公开外链不提供明确试听字段，不能默认宣称全曲。expiresAt=null表示稳定ID入口不报告过期时间，不表示重定向的CDN签名永久有效。CDN临时地址不返回/不持久化，下次解析/加载入口由网易重定向。实际浏览器playing事件才确认播放成功，HEAD成功不替代发声验收；CDN资源失败仍反馈媒体错误并可重试。已实测两首时长与目录相符，未全库验证或保证长期可用。

```json
{"status":"unavailable","reason":"permission","message":"网易当前应用不允许播放此曲，且未找到本机音频"}
```

reason包含missing/authentication/permission/copyright/expired/network；不可用通常HTTP200供播放器展示，数据库读取失败503。曲目ID及网易ID不暴露密钥/账号/加密认证响应。数据库读取缓存60秒、外链成功60秒/失败30秒/同曲并发合并，探测超时10秒。当前播放请求不调用CLI搜索、play或队列。

GET/HEAD /api/playback/audio?trackId=...：仅流resources/local/audio/genshin/<数据库网易数字ID>.<小写扩展名>，mp3/flac/wav/ogg/m4a。200全量、206单Range、416无效/多Range、404文件移除；Accept-Ranges与Content-Type正确，无缓存。文件不转存public，不提交，不处理.ncm。文件存在不证明内容身份/许可，用户提供资源须与原神曲目一致，真实补验需核实解码。

未来有明确网页API资格后在本机服务扩展provider=netease的短时URL，沿用PlaybackResource expiresAt/preview；URL不持久化、过期重取。当前公开外链与开发者API资格分开，未实施厂商签名协议。静态托管不能运行本机MySQL/文件插件，也不能直接嵌入本机凭据；本轮仅验收本机dev/preview，不宣称HTTPS部署的跨源/HTTP媒体重定向行为已测。

个人库与播放器各用版本化localStorage（gs-map-music.collection.v1、gs-map-music.player.v1）；只浏览器保存。既有评价、JSON与开发关联文件不自动同步；本轮MySQL只读。删除播放列表会删除当前浏览器副本，界面按钮明确。无账户跨设备同步，清浏览器数据会丢个人库。

阶段4 UI返修：正常音源提供者与播放文字不在播放器显示，真实失败/浏览器限制/储存异常保留；资源接口与媒体实例不变。左栏收藏与歌单由library-panel.ts管理，个人评价产品入口撤下而旧存储不删除；详见STAGE4_UI_REFINEMENT。

阶段4紧凑布局补充（2026-10-09）：player schemaVersion=1追加可选lastAudibleVolume（最近非零音量），旧存储可读；volume=0表示静音，取消静音恢复该值，旧静音存储无该字段时默认0.8。不会在恢复时自动发声；媒体切曲继续沿用volume。队列视图状态由App管理而不改变资源接口或媒体单例；普通恢复/加载提示用无障碍状态节点，不显示提供者，实际错误仍可见。详见STAGE4_COMPACT_LAYOUT。


2026-10-09 云端增量：Cloudflare Worker 实现同源 /api/playback/resolve 与 /api/health，D1活动快照查询数字ID；公开媒体入口重定向后再核实HTTPS媒体URL，临时地址仅返回播放器内存，60秒重新解析期限不持久化。未知API返回JSON404，API不会回落SPA；本机Vite/MySQL保留原流程。迁移及公网验收见CLOUDFLARE_DEPLOYMENT。

云端补验：Cloudflare出口无法核实网易但实际用户端可播时，返回status=candidate/provider=netease-outer/固定HTTPS公开入口/preview=null，明确不是ready。播放器仅接受固定入口格式，真实playing才成功，错误/拒绝/竞态照常处理；本机仍返回原ready路径。公网两首完整操作通过，见CLOUDFLARE_DEPLOYMENT。


2026-10-09最新：个人库/收藏/歌单业务与UI撤除，历史collection.v1存储不再读取/修改/删除；player.v1队列和播放恢复继续使用。资源接口与媒体单例不变，右栏每次初始化收起，主动打开队列后退出恢复原栏状态。详见STAGE4_SEARCH_ONLY。
