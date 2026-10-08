# 网易云官方开放平台追加核实

查阅日期 2026-10-06。用户提供官方开放平台链接后，实际读取页面 JS 加载的公开文档内容及文档目录；无登录、无申请应用、无音乐业务接口调用，没有使用文档里的演示凭据。

## 用户链接和实际接口

用户 [链接](https://developer.music.163.com/st/developer/document?docId=81958035bf3a4ab691d34b84be706ceb) 的标题是“杜比问题”，更新于 2026-01-23，讨论音量 gain/peak。它能证实官方音乐 API 文档存在，不能单独证明个人网页接入权限。

实际进一步查阅：

| 文档 | 官方页面 / 更新日期 | 实际结论 |
| --- | --- | --- |
| 个人使用引导 | [9504d35aa41a47c6ac9830b2dbf48f94](https://developer.music.163.com/st/developer/document?docId=9504d35aa41a47c6ac9830b2dbf48f94) / 2026-03-25 | 成年的实名用户可申请个人入驻；通过控制台取得 appId/privateKey；每日调用次数有上限，详情见个人应用 |
| 个人常见问题 FAQ | [3b75ab8e475d41ca93d91ebd4dfd383f](https://developer.music.163.com/st/developer/document?docId=3b75ab8e475d41ca93d91ebd4dfd383f) / 2026-03-30 | 个人场景暂不支持直接开放平台 API，仅可使用 ncm-cli；个人 demo 目前只有 CLI；CLI 必须登录、并非所有歌曲均可收听；不支持下载 |
| 网易云音乐 CLI | [2327e302009c437eb02af48f63d6e514](https://developer.music.163.com/st/developer/document?docId=2327e302009c437eb02af48f63d6e514) / 2026-03-23 | 官方包 @music163/ncm-cli；扫码登录，搜索/播放/控制；播放有 encrypted-id 和 original-id；Windows 本地播放依赖 mpv，客户端通信当前仅 macOS |
| 获取歌曲播放 URL | [3d2c9f695ff24f4ea37611614b7f7856](https://developer.music.163.com/st/developer/document?docId=3d2c9f695ff24f4ea37611614b7f7856) / 2026-01-22 | 确实存在 GET/POST `/openapi/music/basic/song/playurl/get/v2`，bizContent 含 songId；要求公共应用/鉴权参数；受终端版权、购买、试听和有效期影响 |

FAQ 的原文包括：“个人场景：暂不支持……仅可使用 ncm-cli 厂商入驻：联系云音乐商务”“针对个人 demo 只有 CLI 吗？是的，目前针对个人应用仅提供 ncm-cli”。个人指南与其 FAQ 应一起读，不能从指南里有 appId/privateKey 推断个人可任意调用音乐 API。

文档目录还保留旧厂商“开发者入驻”说明，写仅企业、不免费；与当前新增个人入驻入口适用对象不同，**不能据旧厂商文档断言现在没有个人入驻**。当前可确认个人有 CLI 接入途径，直接网页 API 权限仍需提供方确认。

播放 URL 文档说明：一般音频短于 25 分钟时 URL 有效期为 25 分钟，长于 25 分钟为音频时长；另写车载/电视/手表/音箱为 1 天。这些是文档条件，不硬编码为本项目所有来源统一 TTL。返回可能只有 `freeTrail` 试听起止时间、因当前终端无版权 URL=null、或要求 VIP/单曲购买；必须检查实际返回，不能把 code=200 当完整歌曲必可播。

## 本项目的决定

“仅存曲目 ID，播放时解析资源”的架构合理，已在 `Track.providerRefs` 预留网易 originalId/encryptedId 与来源/核实状态，`AudioResolution` 预留过期时间、试听范围、鉴权/版权/额度失败和 external-player。**目前没有核实本项目样本的网易 ID，数据集未填虚构 ID；也没有取得可用官方 API 资质。**

本项目是浏览器内常驻播放器、进度、队列及路线平滑切歌。个人 CLI 使用本机 mpv/终端播放，不等于返回一个可由网页 HTMLAudio 使用的 URL；`external-player` 必须明确区别。若后续用户完成个人入驻，可独立试验“网页控制本地 CLI 的桌面陪伴模式”，但控制接口、登录、允许封装方式、队列状态和过渡能力还需核实，不能拿它直接替代当前 MVP 的浏览器播放验收。

若获得明确的网页 API 授权，再实现服务端/本机服务解析器：密钥与签名留在服务侧，只存稳定 ID，临播取 URL，处理过期、试听、版权/购买和额度；不把 secret 打包到 Vite 前端、不长期缓存失效 URL。浏览器 CORS、HTTP/HTTPS、Web Audio 过渡能力仍需实测，未核实前不承诺。

当前不安装 CLI/SDK 或新增后台，不要求用户购买服务；继续用已核实的 CC 示例和用户本地普通文件推进独立阶段。后续官方接入可作为可选适配器，无需推翻曲目—地点结构。

## 证据保存

公开读取入口来自官方页面脚本：`https://developer.music.163.com/api/openplatform/developer/apidoc/get?docId=…`，文档目录来自 `/api/openplatform/developer/api/doc/category`。它们只是实际查阅文档的方式，**不是本项目音源 API**。响应 code=200，内容标题/更新日期已核对；本地原始快照在忽略目录 `.local/research/netease-*.json`。未入库示例密钥、完整第三方文档或音源链接。

## 2026-10-07专辑试做追加事实

沿用已配置官方ncm-cli0.1.7与用户已授权登录，读取NetEase官方netease-music-cli技能，先help再查询；本轮login --check成功。search album、album get --descFlag true、album tracks针对《风与牧歌之城》均code200，专辑数字ID95790219、加密ID8687CEE480D6D9C33D3AD0EB20A204AF，63首真实曲目ID/艺人/毫秒时长及发行信息成功。元数据详细记录见[CITY_WINDS_PILOT](CITY_WINDS_PILOT.md)。

63条visible=false、playFlag=false，不把返回成功说成可播放。只读取，不下载/解析/播放音频，不将凭据或账号字段发前端/Claude/Git。此前指定歌单400与本轮专辑成功为不同请求。上文“尚无CLI/ID/资质/许可示例”是阶段1历史条件，当前CLI已配置且登录，旧非原神音频已移除；网页API权限和实际播放仍未解决。

## 2026-10-08阶段4实际复核

官方CLI0.1.7登录检查成功，MySQL1663曲/1663加密ID真实读取。数据库晨曦酒庄1455706951及Windborne Hymn1481390533严格originalId匹配查询visible=false/playFlag=false；不是可播放授权。官方FAQ docId=3b75ab8e475d41ca93d91ebd4dfd383f的实际文档接口HTTP200仍说明个人仅CLI，直接API暂不支持，CLI无浏览器URL命令。保留.local/research原始查询，不提交账号/认证字段。没有调用不可见曲播放、截获网络URL、逆向签名或替换翻奏。

本机/api/playback/resolve真实查询返回permission/unavailable；如用户本机提供数字ID普通原神音频可经同源Range流播放，这不是网易接口获取资源成功。目录目前为空，真实解码发声验收阻塞。厂商网页API权限需另行确认，已提供appid/privateKey无需重问。详见STAGE4_REVIEW/PLAYBACK_INTERFACE。