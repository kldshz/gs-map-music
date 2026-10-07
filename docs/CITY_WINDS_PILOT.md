# 风与牧歌之城专辑试做

2026-10-07，仍属于阶段3。只处理本专辑63首，不扩展全OST，不做播放或路线。用户个人评价独立留空，来源文本与候选音乐地点分开保存。

## 实际来源

| 来源 | 实际结果与限制 |
| --- | --- |
| [BWIKI专辑目录](https://wiki.biligame.com/ys/%E4%B8%93%E8%BE%91) | HTTP200，修订681706；提取场景OST19张、回顾主题OST6张目录及其地区/内容。没有逐张读取其它专辑全部歌曲 |
| [风与牧歌之城](https://wiki.biligame.com/ys/%E9%A3%8E%E4%B8%8E%E7%89%A7%E6%AD%8C%E4%B9%8B%E5%9F%8E) | HTTP200，修订687233；分碟25/26/12，共63首。逐曲中文/外文名/曲序/出处原文及有效链接。原页面声明“出处仅供参考，部分内容待完善，请求帮助，谢谢！” |
| [网易专辑95790219](https://music.163.com/album?id=95790219) | 官方ncm-cli0.1.7，已登录检查成功；search album、album get、album tracks均code200。真实63条唯一数字ID及32位加密ID、标题、艺人、时长、专辑/发行信息 |
| 作曲证据 | Wiki制作团队明确列“作曲：陈致逸”，网易专辑介绍明确63首由陈致逸@HOYO-MiX创作。未从artists推导composers |
| [太山府](https://wiki.biligame.com/ys/%E5%A4%AA%E5%B1%B1%E5%BA%9C)、[震雷连山密宫](https://wiki.biligame.com/ys/%E9%9C%87%E9%9B%B7%E8%BF%9E%E5%B1%B1%E5%AF%86%E5%AE%AB) | 实际HTTP200，所属地区璃月，不能因专辑蒙德主题而强挂蒙德 |
| [芬德尼尔之顶](https://wiki.biligame.com/ys/%E8%8A%AC%E5%BE%B7%E5%B0%BC%E5%B0%94%E4%B9%8B%E9%A1%B6)、[塞西莉亚苗圃](https://wiki.biligame.com/ys/%E5%A1%9E%E8%A5%BF%E8%8E%89%E4%BA%9A%E8%8B%97%E5%9C%83) | 实际HTTP200，分别属于龙脊雪山、蒙德 |

网易发行时间publishTime=1601222400000，是UTC的2020-09-27 16:00，也就是北京时间2020-09-28；采用Asia/Shanghai日期。Wiki与网易个别英文拼写不同，两者分别保留，不强行“纠正”来源。网易本次63条均visible=false、playFlag=false：元数据成功不等于可播放，本轮未调用播放接口或下载音频。

原始HTML/响应仅存`.local/music-pilot`，账号liked/权限明细/trace/完整简介不入库、不发Claude；公开清洗来源在[data/sources](../data/sources/city-winds-source.json)，目录在[wiki-album-catalog.json](../data/sources/wiki-album-catalog.json)。只留必要元数据及不可播放标志，无凭据和音源URL。

## 细分目录与挂载

采用国家 / 源地区 / 地点或场景，40个目录。源areaId/code引用现有地图；kind=scene表示剧情、界面、活动或地理未定，源地区仅为归档命名空间，不给它伪造坐标。点位原content和位置不修改；“曲库细分目录”是歌曲标签，不是把室内/剧情位置冒充锚点所在地。

| 规则 | 本次结果 |
| --- | --- |
| place-match | 22条。蒙德城6首分别关联6625/6626；风龙废墟2首分别关联6278/6279/6280/6281及神像6554。原点位说明直接对应地点，但不证明具体音区/触发 |
| parent-place-match | 10条。教堂、骑士团、天使的馈赠及城内剧情借两个蒙德城锚点归类，不能称精确建筑入口或室内坐标 |
| region-scope | 320条。14首蒙德野外与2首蒙德战斗关联20个普通蒙德点位；排除蒙德城与风龙废墟7个专属点位。战斗语境保留，全部待核实 |
| region-archive | 42条。未定位场景及无同名点位秘境归档到神像，不认为在那里实际播放 |

共394条关系、33个点位，**全部pending**。目录与挂载逐条保留原出处、点位原说明、匹配方式和局限，便于用户修订。按用户最新规则扩大范围候选，但没有把它们标成已核实BGM。

具体归档：蒙德野外/战斗已改为普通点位范围候选；晨曦酒庄/北风狼借苍风高地6555，原因是没有同名点位说明，精确音区待核对。剧情/界面/位置未定默认借星落湖6557作为专辑归档。芬德尼尔归雪山唯一神像6558；太山府/震雷候选归源地区璃月五神像6611–6615，因为当前证据只足以确定璃月，未随意选择其中一个更细神像。

特殊待核对项：

- 专辑原文“雷震连山秘宫”为红链，详情404；“震雷连山密宫”为有效页，只作为候选别名规范化，保留原文与待确认说明。
- 西风之鹰的庙宇/殿宇、晨曦酒庄、奔狼领尝试的详情地址404，不能把它们写成有效网页证据。酒庄出处来自专辑原文，归档选择不是这些404页面的坐标结论。
- 第30首出处含“原：晨曦酒庄 / 现：尘歌壶-翠黛峰”，保留历史与当前差别。现无尘歌壶地图，只作场景归档，不声称现行酒庄BGM。
- 加载/祈愿/剧情、主线任务、深渊等不一定有单一地理位置；主地区明确写位置未定，不能将归档神像当作实际地点。

## 交付与编辑

[Excel](../outputs/city-winds-region-20261007/风与牧歌之城曲目与挂载表.xlsx)两表：曲目63行20列、挂载394行15列，冻结C7、筛选，ID按文本/时长及坐标按数值/日期按可排序Excel日期存储。曲目F列为独立个人评价，默认空；挂载D/L/M/N列可修订点位、方式、状态与证据。另有[曲目CSV](../outputs/city-winds-region-20261007/曲目.csv)、[挂载CSV](../outputs/city-winds-region-20261007/挂载.csv)与[回传JSON](../outputs/city-winds-region-20261007/music-library.json)。

网页搜“风所爱之城”可查看蒙德城两锚点，搜“太山府”查看璃月归档，搜“芬德尼尔之顶”查看雪山归档；搜索覆盖英文/出处/细目录/个人评价。单曲“我的评价”保存到当前浏览器，刷新后保留，支持清空和恢复导入值；不修改出处/description，不与MySQL自动同步。存储额度/读取失败反馈明确，损坏存储阻止覆盖，先备份修复后刷新。JSON替换导入仍仅本次会话，按曲目Key保留此浏览器已有评价覆盖。表格回传后需要审核并重新生成JSON；不是自动监视Excel。

MySQL已增加独立personal_note、加密ID、scene_info与音乐目录表，本次63曲/394关系/40目录/63曲目目录关系；[导入说明](../database/README.md)。重复导入不覆盖现有行/用户评价，不删除关系，不等于同步接口。

## 复现与验证

使用既有网易官方技能`netease-music-cli`，先help再按实际参数读取，给每条CLI指令传用户意图摘要`--userInput`；凭据沿用本机设置。入口为`%LOCALAPPDATA%/gs-map-music-tools/node_modules/.bin/ncm-cli.cmd`。

```text
search album --keyword 风与牧歌之城 --limit 10 --userInput <中文意图>
album get --albumId 8687CEE480D6D9C33D3AD0EB20A204AF --descFlag true --userInput <中文意图>
album tracks --albumId 8687CEE480D6D9C33D3AD0EB20A204AF --userInput <中文意图>
```

原始结果保留在`.local/music-pilot/netease-{album-search,album,tracks}.json`；Wiki两个HTML保存为albums.html/album.html。[Wiki解析脚本](../scripts/read-city-winds-wiki.mjs)离线Edge解析并禁用页面脚本/外部请求；[清洗脚本](../scripts/prepare-city-winds-source.mjs)通过唯一中文标题精确前缀和专辑ID匹配63/63，不按行序猜配；[构建脚本](../scripts/build-city-winds-library.mjs)显式规则生成候选。后者发现现库与上次产物不同会拒绝覆盖，先备份人工合并，不能拿它做自动刷新。

表格用bundled artifact-tool生成，[导出脚本](../scripts/export-city-winds-workbook.mjs)应复制到有bundled依赖junction的本机临时目录运行，不给产品新增表格依赖。导出前检查63/当前关系数量/空评价、逐值一致/错误检索及渲染，保存后用只读工具对照CSV与JSON。

本次16项数据测试通过、严格类型及生产构建通过。Edge UI首轮12/13通过，唯一失败是测试期望“地点匹配”而实际为“地点直接匹配”；改断言后该项定向复测通过，合计13项通过，无产品代码修改。覆盖63曲/点位到曲库/真实出处/反向定位/神像归档/评价刷新检索清空/手机长详情及旧空库、无坐标、失败重试等。存储损坏与额度失败有业务测试。桌面/手机/评价和Excel预览实际查看。未逐首进游戏核验音区、未播放，pending不能用于路线自动选曲；其它专辑未处理。


## 开发环境关联编辑（2026-10-07）

使用npm run dev，在右栏点位曲库搜索歌曲并添加/移除，或在歌曲信息的关联点位分段中按地区和文字选择点位增删。关联修改成功后曲库/计数立即更新，刷新保留。删除来源关系可恢复来源；手动新增关系删除后不显示来源恢复。歌曲元数据和原始证据不改，手动新增始终manual/pending。

Vite只在开发服务提供本机/__dev/music-links，记录写data/association-edits.json，按稳定曲目ID与点位ID保存add/remove覆盖。该文件为空基线纳入版本管理，用户编辑表现为可审查的Git修改；构建应用这些记录到静态曲库。生产页面没有编辑控件/写接口。仅本机Host与同源JSON请求可写，测试用.local独立文件，不污染用户修改。可导出当前曲库JSON；临时导入后编辑禁用，刷新回内置库。没有MySQL自动同步，修改评价仍只保存在当前浏览器。
