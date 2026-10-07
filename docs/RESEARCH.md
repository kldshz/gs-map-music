# 阶段 1：地图与音乐来源调研

查阅日期：2026-10-06。通过 GitHub 搜索 API、仓库元数据/树/提交 API 和 raw 文件实际查阅；音乐通过公开目录及作者许可页面查阅。维护状态是当日快照，未以 stars 或搜索排名推断可靠性。机器快照在忽略目录 `.local/research`，仓库提交、查阅文件名及快照哈希见 [SOURCE_AUDIT.json](SOURCE_AUDIT.json)。没有执行第三方初始化脚本、游客登录或资源批量抓取。

## 地图候选与结论

搜索“空萤酒馆”后进一步搜索“空荧酒馆”，核实准确名称为**空荧酒馆**，组织为 [kongying-tavern](https://github.com/kongying-tavern)。实际比较如下；日期使用 GitHub `pushed_at` 的 UTC 日期，不等同最新默认分支提交时间。

| 项目 | 代码许可证 | 当日维护状态 | 坐标、依赖与接入成本 | 结论 |
| --- | --- | --- | --- | --- |
| [map_front_v3](https://github.com/kongying-tavern/map_front_v3) | MulanPSL-2.0 | 未归档，push 2026-08-28 | Vue 3/Quasar/Leaflet；自定义 CRS；服务配置、游客认证和内部接口耦合，需要剥离完整应用 | 当前项目中最有参考价值的原神地图源码；不直接接入其服务 |
| [lightweight-genshin-maps](https://github.com/kongying-tavern/lightweight-genshin-maps) | MIT | 已归档，push 2023-04-14 | Preact/canvas-tilemap；硬编码旧瓦片、OAuth/API；迁移旧配置和过时数据成本高 | 仅作历史坐标参考 |
| [qiuxiang/ky-genshin-map](https://github.com/qiuxiang/ky-genshin-map) | MIT | 未归档，push 2024-09-12 | Preact/CanvasKit/WASM/protobuf；初始化从外部下载 data.tar.gz，仍依赖空荧瓦片 | 渲染较轻，第三方资源许可和外部下载未解决；不选作基础 |
| [Teyvat.moe](https://github.com/EliteMasterEric/Teyvat.moe) | GPL-3.0 | 已归档，push 2021-08-02；README 写明 SHUT DOWN | Next/React/Leaflet；图像、区域/标记结构可参考，旧数据与 GPL 集成义务增加成本 | 不采用已停服应用及游戏提取素材 |

固定版本查阅入口：

- v3：[LICENSE](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/LICENSE)、[README](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/README.md)、[CRS/瓦片源码](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/src/api/map.js)、[配置请求](https://github.com/kongying-tavern/map_front_v3/blob/0e80dd090329cb4964360ef42d2ed6016cf7cc15/src/service/config_request.js)。
- lightweight：[LICENSE](https://github.com/kongying-tavern/lightweight-genshin-maps/blob/bfa239707fa5687e2fb2dcf46ecf5c25ed2efa17/license)、[地图配置](https://github.com/kongying-tavern/lightweight-genshin-maps/blob/bfa239707fa5687e2fb2dcf46ecf5c25ed2efa17/src/maps-config.ts)、[API 源码](https://github.com/kongying-tavern/lightweight-genshin-maps/blob/bfa239707fa5687e2fb2dcf46ecf5c25ed2efa17/src/api.ts)。
- qiuxiang：[LICENSE](https://github.com/qiuxiang/ky-genshin-map/blob/b486faab91d1137e0d9ee08dc8bdd8a7ef48610e/license)、[README](https://github.com/qiuxiang/ky-genshin-map/blob/b486faab91d1137e0d9ee08dc8bdd8a7ef48610e/readme.md)、[渲染入口](https://github.com/qiuxiang/ky-genshin-map/blob/b486faab91d1137e0d9ee08dc8bdd8a7ef48610e/src/genshin-map/index.tsx)。
- Teyvat.moe：[LICENSE](https://github.com/EliteMasterEric/Teyvat.moe/blob/e4566515800070fbc70ded91829d423a6361518c/LICENSE.md)、[README](https://github.com/EliteMasterEric/Teyvat.moe/blob/e4566515800070fbc70ded91829d423a6361518c/README.md)、[素材说明](https://github.com/EliteMasterEric/Teyvat.moe/blob/e4566515800070fbc70ded91829d423a6361518c/assets/README.md)。素材说明表示地图从游戏提取，不能据 GPL 推断米哈游素材许可。

空荧 [docs](https://github.com/kongying-tavern/docs) 未归档，push 2026-10-05；最新默认分支提交是 2026-09-12，两种时间已分别记录。其 [仓库 LICENSE](https://github.com/kongying-tavern/docs/blob/474b8dcb0ac1ef571585047bb40bb2f5f72fb1d2/LICENSE) 为 MIT；[网站首页](https://github.com/kongying-tavern/docs/blob/474b8dcb0ac1ef571585047bb40bb2f5f72fb1d2/src/zh/index.md) 写 MulanPSL-1.0，与 v3 当前实际 LICENSE 2.0 不一致，不能混为一个许可证。

### 其他地图如何取得数据

不把瓦片放在 Git，并不意味着没有底图资源：v3/lightweight/qiuxiang 的渲染源码实际引用外部空荧瓦片；qiuxiang 初始化下载外部数据包；Teyvat.moe 的 assets/README 明确从游戏文件提取地图方块，再拼图/生成切片。因此常见方式是第三方在线资源、本地下载包、从游戏素材生成底图/瓦片。瓦片是切图产物，有一张大图也可自行切片，并不要求先有现成瓦片仓库。底图、坐标点和区域边界仍是不同资源，渲染代码不能自动生成可靠音乐区域。

本轮确认的是这些具体仓库的实现方式，不宣称“大部分项目”的完整统计。其他项目能展示游戏地图，是技术可行性的证据；其代码仓库许可不自动解决本项目复制/热链素材或调用服务的范围。后续真实地图适配可以使用获准的大图，不必强制采用空荧瓦片服务。

## 代码、素材、数据和服务条件

已读固定版本 [用户服务协议](https://github.com/kongying-tavern/docs/blob/474b8dcb0ac1ef571585047bb40bb2f5f72fb1d2/src/zh/agreement.md)、[免责声明](https://github.com/kongying-tavern/docs/blob/474b8dcb0ac1ef571585047bb40bb2f5f72fb1d2/src/zh/disclaimer.md)和 [credits](https://github.com/kongying-tavern/docs/blob/474b8dcb0ac1ef571585047bb40bb2f5f72fb1d2/src/zh/credits.md)：

- 服务许可写明“个人的、非商业使用性质的、非营利性质的……不可转让和不可转授权”；第三方工具/服务接入、复制相关数据、镜像等条款要求另外授权，部分限制明言“无论是否用于营利”。
- 网站声明 CC BY-NC-SA 4.0，同时声明游戏静态资源归米哈游关联公司；credits 的 MapImage 归 MiHoYo。代码许可证、网站内容声明和第三方素材权利必须分别理解。条款与开源许可的适用边界存在需进一步澄清之处，本项目不自行作扩大许可解释。
- 源码中可见 `assets.yuanshen.site/webapp.json` 和瓦片服务，以及带 bearer 的 `cloud.yuanshen.site/api/*`。这是实际源码观察，**未验证公开 API 契约、第三方授权、CORS、速率或长期稳定性**；没有使用其中认证或游客接口。不能把网络可访问当作可用授权。
- 用户已说明个人兴趣、无商业元素且没有授权资源包。因此采用独立 Leaflet 适配层和原创合成几何；阶段 3 的真实底图、区域和锚点资源仍待落实。后续可导入经审核的本地资源包，或在取得许可后接入提供方。未取得包时不能声称真实地图完成。

## 坐标核实

v3 源码的自定义 CRS 使用 `project(lat,lng)=(lat+center[0],lng+center[1])`，transformation 是 `(1,0,1,0)`；即第一个成员对应 x，第二个成员对应 y，不能套标准 Leaflet 的 `[lat,lng]=[y,x]`。源码默认 center 为 `[3568,6286]`，size 为 `[12288,15360]`；配置可由服务覆盖。瓦片 URL 中 zoom 加 13，并有 offset 等配置。

lightweight 旧配置的提瓦特 size `[17408,16384]`、origin `[3568,6286]`、tileOffset `[-5120,0]`，证明版本不同会改变范围/偏移，不能冒充当前地图。qiuxiang 从 protobuf `mapInfo` 获取 size/origin/offset。

本项目统一使用 x 向右、y 向下的图像单位。实际读 [Leaflet 1.9.4 CRS.Simple](https://github.com/Leaflet/Leaflet/blob/v1.9.4/src/geo/crs/CRS.Simple.js) 和 [LICENSE](https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE)（BSD-2-Clause）：标准 Simple 的投影 lon→x、lat→y 后 y 轴取反。因此内部点转换到标准 Leaflet 用 `[-y,x]`；空荧数据若未来获授权则先按其版本 CRS 还原。探针只证实数学往返，未完成实际原神锚点标校。官网访问失败及猜测教程路径 404 不作为成功阅读证据。

## 音乐元数据、地点和播放资源

实际使用 Apple iTunes 公开目录核对官方发行条目，未下载封面、preview 或原神音频：

- [专辑搜索](https://itunes.apple.com/search?term=The%20Wind%20and%20The%20Star%20Traveler&entity=album&country=us&limit=5)：官方 collectionId 1519189657，The Wind and the Star Traveler，2020-06-19，15 首，artist Yu-Peng Chen & HOYO-MiX，℗ 2020 miHoYo。同名翻弹结果未纳入。
- [City of Winds and Idylls 曲目目录](https://itunes.apple.com/lookup?id=1535605650&entity=song&country=us)：2020-09-28，63 首，同 artist/版权。少量事实记录在 [数据样本](https://github.com/kldshz/gs-map-music/blob/5077f9698408150f0454fed671fe5c2d6ff69983/data/demo.bundle.json)。没有获得整目录、封面、预览或音频再分发许可；此公开查询不是我们的播放资源接口。

| 已核对曲目 | 目录 ID / 时长 | 实际地点与昼夜 | 音源 |
| --- | --- | --- | --- |
| [Dawn Winery Theme](https://music.apple.com/us/album/dawn-winery-theme/1535605650?i=1535607388) | 1535607388 / 67.237s | 曲名指向 Winery，候选关联 pending；昼夜 unknown；坐标空 | 无内置音源 |
| [Before Dawn, at the Winery](https://music.apple.com/us/album/before-dawn-at-the-winery/1535605650?i=1535607791) | 1535607791 / 69.393s | 同上；不能只凭 Before Dawn 宣称游戏夜间音乐 | 无内置音源 |

artist 字段不能证明逐曲 composer，故 composers=null。后续关联须引用可查官方说明、可靠公开资料，或记录具体游戏版本/地点/昼夜和人工比对证据；当前未完成游戏实测。没有把标题当已核实区域，也没有编造中文译名或专辑信息。

用户提出网易云下载作为个人音源。推荐普通本地音频导入加公开元数据核对：不依赖网易云内部 API、登录、签名或解密；`.ncm` 不支持。用户无需先下载全部 OST，先少量曲目即可；个人整理目录与刷新规则见 [资源说明](../resources/README.md)。平台允许免费收听、个人下载与本项目分发范围分别核实；尚未找到支持“所有 HOYO-MiX 音乐均可无偿任意个人使用/分发”的通用官方授权。HOYO-MiX 官网此次不可达，不作为许可证据。

用户进一步提供网易云官方开放平台链接，实际追加核实其 [播放 URL API、个人入驻及 CLI/FAQ](NETEASE_RESEARCH.md)。官方确有按 ID 取播放 URL 能力，但当前个人 FAQ 限定使用 ncm-cli，直接网页 API 不能记可用；接口已预留网易 ID 与动态解析，不编造样本 ID，也不安装或绕过资质。个人 CLI 本机外部播放列为可选后续路径。

独立许可演示选择作者 Kevin MacLeod 的 **Carefree** 与 **Brittle Rille**，作者 [公开目录](https://incompetech.com/music/royalty-free/pieces.json)、[许可页面](https://incompetech.com/music/royalty-free/licenses/)和作品署名支持 CC BY 4.0。各取开头 12 秒，转换 PCM WAV，保留 [署名与改编说明](https://github.com/kldshz/gs-map-music/blob/5077f9698408150f0454fed671fe5c2d6ff69983/public/audio/demo/ATTRIBUTION.md)及 [许可文本](../licenses/CC-BY-4.0.txt)。原作品长度 205s/229s 与本项目片段 12s 分开；uploaded 不是发行日期，未填入 releaseDate。这些曲目与合成地点/昼夜安排仅作功能测试，**不是原神 OST**。

WAV 文件已真实生成；检查遍历 RIFF chunks、编码、时长、非静音和 SHA-256，并由 FFmpeg 完整解码。浏览器真实播放和自动播放限制留待阶段 4，不能从文件验证推断已通过播放器验收。

## 待核实项与下一步

| 项目 | 当前状态 | 需要的证据 / 所在阶段 |
| --- | --- | --- |
| 真实地图、瓦片、区域/锚点数据 | 无资源授权包 | 资源权利范围、版本、原点与控制点、可用文件/接口；阶段 3 阻塞 |
| 原神地点—曲目—昼夜 | 仅有标题候选 | 逐项来源或游戏实测；阶段 3，不允许 pending 自动选曲 |
| 真实 OST 本地播放 | 用户愿意提供，尚未收到文件 | 用户合法取得的普通音频、匹配与实际浏览器解码；阶段 4 |
| 第三方地图服务/API | 未授权、未调用 | 提供方第三方接入条款及契约；无契约时不用 |
| 示例播放器、路线交互 | 只有资源、接口和探针 | Claude 骨架阶段 2、真实播放阶段 4、调度阶段 5 |
