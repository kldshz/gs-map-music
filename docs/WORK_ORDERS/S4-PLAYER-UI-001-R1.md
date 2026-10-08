# S4播放器交互返修

沿用CLI2.1.291，claude-opus-5-5/high。仅允许PlayerBar.vue、PersonalLibrary.vue、MusicSidebar.vue精确old/new patch与CSS追加；返回严格JSON {patches:[{path,old,new}],cssAppend,notes}，正确转义字符串内所有引号，不围栏。不改业务服务，不改Git。Codex已机械修复reactive state不应带.value，其余设计保留。

必须修正：
1. PersonalLibrary当前prompt/confirm违背工单。重命名改为列表内部输入＋保存/取消（Vue ref管理表单）；删除可内联确认或直接删除个人副本，不用浏览器dialog。创建失败保留输入，createPlaylist返回id|null。
2. 手机playlist-menu当前position:fixed + top:50%为屏幕中心弹窗，请改栏内展开，与桌面一致不中心弹窗、不遮盖整个地图。
3. PlayerBar的statusMessage直接展示state.message；playing可带真实资源说明，paused应显示恢复/队尾等原提示，不统一写已暂停。以role=status/aria-live显示错误。显示state.storageMessage及collectionState.message以反馈配额/损坏和收藏成功。不要把已暂停/加载中的currentTrack标为正在播放。
4. canToggle允许resolving/loading时暂停取消，aria-label与图标按playing或resolving/loading显示暂停；idle但队列有曲可开始。当前clearQueue后currentTrack仍播放应可暂停。
5. 队列显示所有queueIds，可Unavailable显示ID/曲库中已不可用；保留当前曲高亮，队列中每首提供显式播放，不要“接下来”把完整队列说成仅后续。上移/下移根据全部IDs顺序。
6. 点位/单曲播放按钮应给真实列表作为context：单曲检索默认state.searchTracks.map(t=>t.id)，点位曲按钮使用anchorTracks；选曲详情仍仅浏览不强制发声。当前handlePlayTrack(id)只传id需加合适列表；没有搜索结果时保留当前id即可。
7. PlayerBar刷新未载时长显示--:--，真实0秒位置显示0:00；不要用100当真实duration。canSeek存在duration即可（加载缓冲期间仍可拖动），没有音源不允许。

保留其余功能/风格。Codex负责测试与整合。
