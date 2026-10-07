# S3-OST-DISPLAY-001：出处与点位说明展示简化

入口本机Claude Code2.1.291，固定claude-opus-5-5 --effort high，工具禁用、stdin，不能替换模型。仅允许返回src/components/MusicSidebar.vue的精确replacements及必要src/style.css追加CSS；Codex审核落盘且调用期间不编辑这两文件。不能修改业务/来源/数据/数据库/Git。

用户新要求：曲目和点位的关联展示只显示歌曲原文出处和点位原说明，不展示匹配理由、matchType或“关联20处：已核实0，待核实20；无播放资源”。数据证据仍留领域和导出，只改变显示。右栏/开发增删恢复/评价/手机/键盘保持。

1. 曲目检索列表删associationStatus一行，可以用track.sceneInfo?.originText（原文保留换行）替代为出处摘要，缺值显示“出处尚未提供”。
2. 点位关联曲目列表原anchorTrackHint(track.id)替换为track.sceneInfo?.originText原文，不显示地区范围候选/待核实等关系标签。艺人/曲名仍保留，出处换行展示。
3. 单曲“关联点位”分段删association-status的计数/核实/无资源语句。保留“在地图上定位全部”和关联总数标题、无坐标反馈。每个location-btn只显示anchor.content原说明（包含地名），缺值“点位说明尚未提供”；可以保留编号与类型作为辅助信息，不显示笼统anchor.name或matchType/evidenceNote块。开发筛选候选同样以content为主标题，不要改编辑行为。
4. 主要地区内容业务会规范化，UI直接读mainRegions，不在前端造值。来源与个人评价不改，播放器禁用。
5. 删除无用anchorTrackHint、matchTypeLabel和AssociationMatch import（如果不再使用）；不删相关服务契约。点位布局、scroll/focus/details/Esc保持。

纯JSON返回：{"ticket":"S3-OST-DISPLAY-001","status":"completed","replacements":[{"path":"src/components/MusicSidebar.vue","old":"实际唯一完整旧串","new":"替换串"}],"cssAppend":"必要CSS","summary":"简述"}。old不得互相重叠，必须与输入上下文一致。输出JSON字符串正确转义。
