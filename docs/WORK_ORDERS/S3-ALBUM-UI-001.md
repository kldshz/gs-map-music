# S3-ALBUM-UI-001：风与牧歌之城63首专辑试做

调用入口：本机Claude CLI2.1.291；固定claude-opus-5-5，实际--effort high；工具禁用。stdin提供App/style/contracts/explorer，不含任何凭据。只交付src/App.vue完整内容和src/style.css追加CSS，Codex审核落盘，不共同编辑。你主导前端交互，不能提交推送。

用户只先试做本专辑63首、3分碟。曲目信息来自网易官方CLI成功返回，Wiki出处仅供参考，所有挂载关系pending。昼夜功能仍取消；出处原文如有时段词保留来源文字，但无时段字段/过滤。播放器禁用，不做播放。维持已通过的地图/键盘/手机/原生dialog布局。

本轮新增接口（见上下文）：MusicTrack.personalNote（默认空，独立于description来源说明），neteaseEncryptedId，sceneInfo包括中文/英文名、分碟/曲序、originText原文、mainRegions、musicLocationIds、Wiki URL与revision及metadataNotes。musicLocations为细分目录（部分kind=scene是剧情/界面而非真实地理）。TrackAnchor.matchType有place-match（点位说明直接包含地点）、parent-place-match（如教堂只能匹配蒙德城锚点，非室内精确位置）、region-archive（按用户规则归档到地区神像，不是该神像处实际BGM）。evidenceNote务必展示。

useExplorer新增：trackLocationLabels(trackId)返回完整国家/源地区/细地点路径；anchorMusicContexts当前锚点已挂歌曲的目录标签（不是地图点位的真实新增所在地）；trackAssociations当前曲目关系。personalNoteFor(id,sourcePersonalNote)读取此浏览器覆盖或导入表的personalNote；savePersonalNote(id,text)返回boolean，localStorage持久化且失败反馈，不改来源；clearPersonalNote(id)恢复导入表值；noteMessage显示保存/读取结果。无需直接访问localStorage或改服务代码。

请在当前页面最小增量完成：
1. 曲目列表可读双语名称/专辑与63首计数，说明单张专辑试做（按真实tracks长度展示，用户导入别的库不仍声称63首）。新导入提示移除“音乐暂空”，明确元数据非音频和仅会话。搜索提示覆盖细地点/个人评价。
2. 锚点曲库弹窗保留原始点位说明，另显示“曲库细分目录”（anchorMusicContexts），明确目录不是点位所在地。每首说明该挂载方式（找trackAssociations不能用当前selectedTrack；可加service未提供时利用精确返回字段？请用anchor相关展示简单共同提示，具体关系在曲目详情展示）。库中有地区归档，提示不表示该神像实际播放。
3. 单曲详情展示Wiki中文/英文名、分碟/序号、网易元数据（artist不标演奏家本人）、出处原文、主要地区/完整细分目录、Wiki链接/参考性、metadataNotes。未知仍正确。关联列表逐点显示matchType的中文与对应evidenceNote，归档须显著标注；region-archive不是定位错误，只用于收藏归档。
4. 增加“我的评价”textarea、保存/恢复导入值button、本机浏览器保存说明、noteMessage，初始空，不代写评价。selectedTrack改变时重置draft来自personalNoteFor；保存成功立即可在详情与文字搜索体现，刷新保留；只改评价。支持20000字，keyboard和手机不遮挡，消息role=status。

保持现有locate/close/focus/import流程，不改业务接口，不添加依赖/音源/全专辑下载/图片。不丢原有未知/pending信息。返回纯JSON：{"ticket":"S3-ALBUM-UI-001","status":"completed","files":[{"path":"src/App.vue","content":"完整Vue代码"}],"cssAppend":"仅追加CSS","summary":"中文说明"}。
