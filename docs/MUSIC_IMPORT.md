# 音乐元数据导入

当前内置《风与牧歌之城》63曲/394关系试做，全部待核实。仅接受原神音乐数据，JSON导入暂仅当前会话，不写MySQL或保存音频。以下空文件仍可直接导入：

```json
{"schemaVersion":1,"tracks":[],"associations":[]}
```

有数据时字段以[契约](../src/domain/contracts.ts)为准：

| 对象 | 字段 | 缺值约定 |
| --- | --- | --- |
| MusicTrack | id、title、artists、composers、album、releaseDate、durationSeconds、description、neteaseId、sourceUrl | id/title不能为空；artists=[]，composers/album/日期/时长/网易ID/URL可null，description可空串 |
| TrackAnchor | id、trackId、anchorId、evidenceStatus、evidenceNote、sourceUrl | status=pending或verified；verified需要非空说明和HTTP(S)证据URL，pending说明可空、URL可null |

anchorId使用点位表的`kongying:<源ID>`，不使用点位名称或地区名称作主键。神像与传送锚点均支持多首曲目；相同曲目可关联多个点位。重复trackId/anchorId组合会拒绝。未知作曲家留null，不能复制演奏者。没有昼夜字段；音源URL不属于此次导入结构。

音乐目录采用国家 / 源地区 / 细地点或场景，areaId/code引用地图地区。scene命名空间不是实际所在地，神像目录标签不改变点位说明。[本次补全表](../outputs/city-winds-region-20261007/风与牧歌之城曲目与挂载表.xlsx)曲目F列为独立个人评价，挂载D/L/M/N可修订；回传后审核导入，不自动当已核实证据。

新增可选字段：MusicTrack.personalNote（字符串≤20000字）、neteaseEncryptedId（32位hex或null）、sceneInfo（Wiki双语名/碟号/碟名/曲序/出处/mainRegions/musicLocationIds/URL/修订/备注）。提供sceneInfo就需完整字段、正碟号/曲序、存在的目录引用。MusicLibrary.musicLocations目录包含id/name/country/areaId/areaCode/kind/sourceUrl/notes，kind为place或scene。TrackAnchor.matchType为place-match/parent-place-match/region-archive/region-scope/manual；地区归档强制pending且仅神像，范围候选和手动挂载也强制pending。以契约及[完整示例JSON](../outputs/city-winds-region-20261007/music-library.json)为准。

个人评价按稳定曲目Key存此浏览器localStorage；清空保存为空覆盖，恢复导入值删除覆盖。同Key已存评价优先于新JSON的personalNote，不修改description/出处。损坏存储阻止覆盖、额度失败保留已存值。不自动写MySQL、读取Excel或同步设备。[专辑来源](CITY_WINDS_PILOT.md)和[MySQL显式导入](../database/README.md)是独立流程。

8MB、最多10000曲/50000关系。JSON/引用/字段/链接/证据格式失败时保持原库并显示错误。校验只证明结构和引用有效，不能判断该曲是否确属原神、作曲或地点是否属实，需按来源审核。播放控件保持禁用，元数据导入成功不等于音源可播放。


## 开发环境关联编辑（2026-10-07）

使用npm run dev，在右栏点位曲库搜索歌曲并添加/移除，或在歌曲信息的关联点位分段中按地区和文字选择点位增删。关联修改成功后曲库/计数立即更新，刷新保留。删除来源关系可恢复来源；手动新增关系删除后不显示来源恢复。歌曲元数据和原始证据不改，手动新增始终manual/pending。

Vite只在开发服务提供本机/__dev/music-links，记录写data/association-edits.json，按稳定曲目ID与点位ID保存add/remove覆盖。该文件为空基线纳入版本管理，用户编辑表现为可审查的Git修改；构建应用这些记录到静态曲库。生产页面没有编辑控件/写接口。仅本机Host与同源JSON请求可写，测试用.local独立文件，不污染用户修改。可导出当前曲库JSON；临时导入后编辑禁用，刷新回内置库。没有MySQL自动同步，修改评价仍只保存在当前浏览器。
