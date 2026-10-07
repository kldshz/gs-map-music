# 音乐元数据导入

本轮按用户要求曲目/关系留空。产品只接受原神音乐数据，导入暂只保留当前会话，不写MySQL或保存音频。以下是空文件的完整结构，可直接导入：

```json
{"schemaVersion":1,"tracks":[],"associations":[]}
```

有数据时字段以[契约](../src/domain/contracts.ts)为准：

| 对象 | 字段 | 缺值约定 |
| --- | --- | --- |
| MusicTrack | id、title、artists、composers、album、releaseDate、durationSeconds、description、neteaseId、sourceUrl | id/title不能为空；artists=[]，composers/album/日期/时长/网易ID/URL可null，description可空串 |
| TrackAnchor | id、trackId、anchorId、evidenceStatus、evidenceNote、sourceUrl | status=pending或verified；verified需要非空说明和HTTP(S)证据URL，pending说明可空、URL可null |

anchorId使用点位表的`kongying:<源ID>`，不使用点位名称或地区名称作主键。神像与传送锚点均支持多首曲目；相同曲目可关联多个点位。重复trackId/anchorId组合会拒绝。未知作曲家留null，不能复制演奏者。没有昼夜字段；音源URL不属于此次导入结构。

音乐目录可采用国家 / 源地区 / 细地点，地区ID/代码与地区目录一致；补充表J:L列预留细地点、目录Key、说明。表格回传后由后续阶段核对导入，不自动把填写内容当已核实地点证据。

8MB、最多10000曲/50000关系。JSON/引用/字段/链接/证据格式失败时保持原库并显示错误。校验只证明结构和引用有效，不能判断该曲是否确属原神、作曲或地点是否属实，需按来源审核。播放控件保持禁用，元数据导入成功不等于音源可播放。
