# S3-SIDEBAR-UI-001-R1：审核返修

本机CLI2.1.291/claude-opus-5-5/--effort high，无工具，不换模型。允许交付src/components/MusicSidebar.vue精确replacements与src/style.css追加CSS；Codex调用期间不编辑这两文件。提供实际初版，避免返回整文件。格式纯JSON，正文字符串正确转义，无围栏：{"ticket":"S3-SIDEBAR-UI-001-R1","status":"completed","replacements":[{"path":"src/components/MusicSidebar.vue","old":"唯一实际旧串","new":"替换串"}],"cssAppend":"追加CSS","summary":"简述"}。

真实构建发现两个p同时role="status"与:role导致TS1117，删除静态role保留绑定。初版还有以下实质遗漏，修正但别重写全部：
1. MapCanvas在App直接调用explorer.selectAnchor，Sidebar没有watch selectedAnchorId。因此地图点击不自动展开详情。增加watch选中点位，非空时activeTab=detail/viewMode=anchor；已有点位再次点击不变ID可以从“歌曲信息”切回已保留点位，请提供“返回当前点位曲库”button（在track详情且selectedAnchor存在），调用selectAnchorAndShow，即使相同ID也打开。
2. “歌曲信息”切出又切入被switchTab把viewMode清null，虽然selectedTrack仍存在。switchTab别删记忆viewMode；info点击优先保留上次有效detail，若viewMode null但selectedTrack存在用track，或选点用anchor。手动切目录/检索不丢当前详情。
3. 增加point和song详情h2（tabindex=-1 ref或统一ref）、用nextTick聚焦选中标题，键盘Escape回目录或曲目检索并把焦点给tab按钮。不要focus trap，地图仍可键盘操作。定位全部后保持详情且不要因selectArea自动丢选择。App面板收起情况下选地图点需重开：你只交付Sidebar，如果需App替换可以额外列精确replacement，范围仅这个watch功能。
4. 开发编辑记录hasManualEdit存在而候选isAnchorAdded=false的被删除源关联，也必须能“恢复所选来源关联”，现在错误地要求isAnchorAdded&&hasManualEdit。点位内部搜索候选也加恢复按钮，以便删后不需手工再加。保存成功不要清空addAnchorQuery/addAnchorRegion/addTrackQuery，保留选择方便连续操作。所有操作editBusy禁用。选中点位/歌曲更换时可以清查询，不能保存后重置。
5. 加全局开发说明/反馈（只developmentMode）：editingAvailable false也能看到editMessage，如服务失败/导入临时库导致编辑不可用，当前全空不解释。导出按钮开发仅一次即可，不硬coded数据。
6. CSS目前没有任何改侧栏宽度，桌面仍320而你摘要400–440，补真正作用.app-main > .side-panel宽440/合理clamp，收起width28优先；手机保留原地图下布局且侧栏width100%。.music-sidebar块与.panel-content现有flex1/minheight0/overflowauto组合别裁掉内容；.detail-section dl沿用grid，各长值换行。单曲40条关系可折叠分段不挤评价。默认基本信息+评价展开，关联可open但细证据适合details；保证右栏滚动而不是页面横向滚动。手机按钮可触达，summary有focus样式。

还有单曲关联计数/已核实0/待核实数量现在不展示，只标题列表；补state.associationStatus。点位坐标标注为原V3图像坐标，不能当经纬度。

保持领域/来源/播放禁用，不能新增api、业务、deps。修复metadata、个人评价source分离。正确写old唯一完整块，每条不重叠（避免先改掉后续old），返回前确认不会双重role。
