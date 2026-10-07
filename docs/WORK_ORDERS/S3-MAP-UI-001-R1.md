# S3-MAP-UI-001-R1：可运行性与真实数据交互返修

日期2026-10-07，继续真实claude-opus-5-5/high。前一工单成功，两个文件已收取，未落盘；本次只允许返回src/App.vue一个完整文件。保留你的已有原神风CSS类名与设计，紧凑实现，返回纯JSON {"ticket":"S3-MAP-UI-001-R1","files":[{"path":"src/App.vue","content":"..."}],"notes":[]}。

实际审查发现：script没有lang=ts，曲目dialog由v-if创建，watch在ref创建前执行导致打不开；li曲目无法键盘操作，搜索遗漏专辑/简介/地区，空点位没有反馈；import-section放在main外占用大量地图空间；展示的JSON字段说明不是合法格式；父地区名单信息缺失。请修复，不再输出style.css，Codex允许做对应的少量CSS整合。

1. 使用script setup lang="ts"，dialog ref<HTMLDialogElement|null>、事件Event/HTMLInputElement，关闭通过函数，不使用unknown类型的$refs。dialog均常驻DOM，watch在nextTick之后showModal。关闭/Esc/焦点恢复可用。关联曲目按钮打开曲目信息。曲目定位后关闭dialog使地图可见。
2. 曲目和点位列表用原生button可Enter/Space操作，避免残缺listbox模式；保留原anchor-item/track-item样式类。点位显示id、content摘要以区分同名锚点；空列表明确“当前筛选无点位”。曲目列表无数据“音乐库尚未补充”，无搜索结果分别反馈。
3. 保留本来UI服务所有接口。新增顶层解构：`searchTracks`(computed结果已按主query检索曲名/艺人/作曲/专辑/简介/网易ID/关联地区)、`layerFilter:Ref<string>`默认'all'、`layerOptions:Computed<Array<{value:string,label:string}>>`、`associationStatus:(trackId:string)=>string`。不再自己写不完整的searchResults或trackQuery。主搜索placeholder“搜索点位、曲目、专辑或地区”；曲目Tab用searchTracks。layerOptions给地图分层select选项（含all/surface及来源地下分层），使用v-model=layerFilter并传MapCanvas `:layer-filter="layerFilter"`。输入query不会触发音频。
4. importLibrary读取 `{schemaVersion:1,tracks:[MusicTrack...],associations:[{id,trackId,anchorId,evidenceStatus:'pending'|'verified',evidenceNote,sourceUrl:null|string}]}`，不是track中anchorIds。元数据只允许原神，默认全空。字段不全/null明确未知，原神曲目地域关系必须待核实或有来源证据。详情显示associationStatus(selectedTrack.id)，neteaseId和sourceUrl以及所有无坐标/跨地图入口（可selectAnchor(id)定位）。避免默认出现任何假曲目。
5. 导入入口放进侧栏（两个tab下面或曲目tab），常驻以便替换导入，简短说明“曲目与关联JSON；神像和锚点均可关联多首。音乐数据暂空。”不要渲染整段伪JSON。status/错误即使tracks非空也可见。
6. 常驻播放器展示选中曲名（没有则“尚未选择曲目”）、上首/播放/下首、进度/音量/随机循环可禁用（aria-label、--:--），清楚写“音源尚未接入”，不得假装播放。取消全部昼夜要求（不保留标注字段）。神像/锚点空库文案相同。
7. header地区select显示countryName? Area没有countryName，所以每option可用`areas.find(a=>a.id===area.parentId)?.name` + area.name，顶层需解构areas。error处加load重试按钮。

移动时main中的地图至少保留可拖拽缩放空间，sidepanel可收起，footer内容紧凑。本轮实际歌曲数据先留空。请修复你交付的App，不扩大范围。
