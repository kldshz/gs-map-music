# 阶段4：常驻真实播放器与个人库交互

入口沿用本机CLI2.1.291，固定claude-opus-5-5 / --effort high，stdin、模型工具禁用。Codex负责播放引擎、平台/数据库、存储、过滤与整合；你只主导视觉和交互。沿用现有原神浅纸色/深蓝/金色设计，不新增依赖。不得更改来源/地图关联、昼夜或路线。

允许交付：新src/components/PlayerBar.vue、新src/components/PersonalLibrary.vue；src/App.vue、src/components/MusicSidebar.vue用精确old/new替换；src/style.css只追加。Codex在等待期间不编辑这些文件。

返回严格JSON {"files":[{"path":"...","content":"完整新文件"}],"patches":[{"path":"...","old":"唯一完整旧字符串","new":"..."}],"cssAppend":"...","notes":["..."]}。不要围栏、内部推理、编造接口。

## 已约定业务服务（Codex实现，不要自己实现业务）

App创建 `const player=useMusicPlayer(()=>explorer.tracks.value); const collection=useMusicCollection();`，从src/services/music-player.ts和music-collection.ts引入。在App卸载时player.dispose()，播放器不能因地图/面板切换卸载。传player/collection给MusicSidebar和PersonalLibrary；PlayerBar传player、collection、tracks=explorer.tracks.value。服务返回Ref/Computed，子组件使用reactive(props.player)及reactive(props.collection)自动解包。Collection tracks不存完整元数据，ID刷新后依然可用。

player返回：currentTrack(computed MusicTrack|null)、currentId(ref string)、queueIds(ref string[])、playing(ref boolean，仅实际playing事件才true)、status(ref 'idle'|'resolving'|'loading'|'playing'|'paused'|'blocked'|'unavailable'|'error')、message(ref string)、position(ref number秒)、duration(ref number秒)、volume(ref number 0..1)、shuffle(ref boolean)、repeat(ref 'off'|'all'|'one')、storageMessage(ref string)。
方法：playTrack(id:string,contextIds?:string[]):Promise<void> 将当前列表作为队列、显式播放；toggle():Promise<void>；previous()/next():Promise<void>；seek(seconds:number):void；setVolume(number 0..1):void；toggleShuffle():void；cycleRepeat():void；enqueue(id:string):void；removeFromQueue(id:string):void；clearQueue():void；moveInQueue(id:string,direction:-1|1):void。refresh不自动发声，保留当前曲目/队列/进度/音量/模式，提示点播放继续。无可用音源诚实显示，错误不模拟进度。currentTrack与explorer.selectedTrack分开，浏览其他曲不自动打断。

collection返回：favorites(ref string[])、playlists(ref Array<{id:string,name:string,trackIds:string[]}> )、message(ref string)。方法isFavorite(id):boolean、toggleFavorite(id):void、createPlaylist(name):string|null、renamePlaylist(id,name):void、deletePlaylist(id):void、addToPlaylist(listId,trackId):void、removeFromPlaylist(listId,trackId):void、movePlaylistTrack(listId,trackId,direction:-1|1):void。删除仅浏览器个人副本，不改变源曲库。避免空名；交互反馈展示message。

explorer增加：albumFilter(ref string 默认'')、regionFilter(ref string 默认'')、albumOptions(computed string[])、regionOptions(computed Array<{value:string,label:string}> )，searchTracks已经按两个筛选及主query交集筛选。地区可国家/一级/二级，值由regionOptions提供，UI不能自己猜值。筛选仅曲目检索，不修改地图区域。使用select aria-label='筛选专辑'/'筛选音乐地区'。筛选空结果说明反映所有过滤条件。

## 交互范围

1. 常驻PlayerBar替换App原player-stub。音频来自本机服务，播放器标明真实status/message（例如当前网易无权限、无本机文件、浏览器限制）；播放/暂停、上下首、进度拖动、音量、随机、循环三模式。进度最大值真实duration，无时长禁拖动。准备时仍允许用户暂停/换曲取消，出错可重试。按钮明确aria-label、模式aria-pressed，range键盘可用。
2. 队列使用右侧或footer展开details，显示当前曲/顺序/移除/前后调整/清空，不能中心弹窗。长队列滚动，不覆盖整张地图。收藏当前曲，当前曲详情浏览可从PlayerBar发事件show-track(id)，App转sidebar.showTrack(id)（需defineExpose追加）。
3. MusicSidebar曲目检索添加专辑/地区过滤。曲目详情有“播放此曲”“加入队列”“收藏”“添加到播放列表”的下拉操作；锚点详情提供“播放点位曲库”，用anchorTracks的真实ID顺序；仅显式点击播放才调用playTrack。队列/收藏不要塞入原主曲目按钮造成嵌套button。
4. PersonalLibrary在右栏App中可展开，收藏/播放列表可浏览、播放、加入队列、移除、命名/新增/重命名/删除，筛选已移除ID显示“曲库中已不可用”，不能假元数据。新增/重命名可栏内输入，不用prompt/dialog中心弹窗。收藏/列表有空态与错误反馈，所有存储说明一句“保存在此浏览器”。
5. 手机播放器保持紧凑但全部功能可访问，展开队列/个人库不被overflow:hidden截掉。320px可用。不要删除现有开发关联编辑/评价/元数据/全部定位能力。

只实现交互，不实例化Audio，不写localStorage，不调用网易接口，不声称实际播放验证。Codex会审核/整合/测试，不能修改Git。
