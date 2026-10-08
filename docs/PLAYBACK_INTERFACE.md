# 阶段4播放接口

本机Vite dev/preview插件scripts/playback-service.ts，GET/HEAD、同源127.0.0.1或localhost；跨站Origin/Sec-Fetch拒绝403。只接受当前原神JSON库白名单且匹配netease:数字的MySQL记录；SQL条件仅校验后ID。配置.local/mysql-client.ini与官方CLI配置留本机。

GET /api/playback/resolve?trackId=netease%3A1455706951：

```json
{"status":"ready","provider":"local","url":"/api/playback/audio?trackId=netease%3A1455706951","expiresAt":null,"preview":false}
```

只在匹配本机文件存在且非空时返回ready。没有文件则官方CLI按数据库标题查询并严格匹配originalId；不可见/不可播、无匹配、认证、配额、网络均返回unavailable，不换同名歌曲。当前CLI没有网页URL，故不返回网易ready。该接口是项目本机服务，不是网易官方HTTP端点。

```json
{"status":"unavailable","reason":"permission","message":"网易当前应用不允许播放此曲，且未找到本机音频"}
```

reason包含missing/authentication/permission/network；不可用通常HTTP200供播放器展示，数据库读取失败503。曲目ID及网易ID不暴露密钥/账号/加密认证响应。数据库读取缓存60秒、官方不可用结果5分钟/同曲并发合并，配额暂停1分钟。

GET/HEAD /api/playback/audio?trackId=...：仅流resources/local/audio/genshin/<数据库网易数字ID>.<小写扩展名>，mp3/flac/wav/ogg/m4a。200全量、206单Range、416无效/多Range、404文件移除；Accept-Ranges与Content-Type正确，无缓存。文件不转存public，不提交，不处理.ncm。文件存在不证明内容身份/许可，用户提供资源须与原神曲目一致，真实补验需核实解码。

未来有明确网页API资格后在本机服务扩展provider=netease的短时URL，沿用PlaybackResource expiresAt/preview；URL不持久化、过期重取。当前没有实施未授权官方签名协议。静态托管不能运行MySQL/CLI插件，也不能直接嵌入本机凭据。

个人库与播放器各用版本化localStorage（gs-map-music.collection.v1、gs-map-music.player.v1）；只浏览器保存。既有评价、JSON与开发关联文件不自动同步；本轮MySQL只读。删除播放列表会删除当前浏览器副本，界面按钮明确。无账户跨设备同步，清浏览器数据会丢个人库。
