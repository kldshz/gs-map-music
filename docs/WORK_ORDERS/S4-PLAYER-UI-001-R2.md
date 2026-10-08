# 阶段4小范围返修：PersonalLibrary

前次R1服务超时，没有替换模型。现在仍用claude-opus-5-5/high，仅返修提供的PersonalLibrary.vue，严格JSON {patches:[{path,old,new}],cssAppend,notes:[]}。所有字符串正确转义，不围栏，响应只需要少量唯一old/new，不完整重写。

1. 取消prompt/confirm。重命名用每个列表内表单，aria-label='播放列表新名称'，保存按钮aria-label='保存名称'，另有取消按钮；点击重命名填充当前name并聚焦输入。删除列表直接删个人副本即可，不改源曲库。
2. 创建列表成功返回id后才清空名称；失败保留输入。
3. 播放列表中的单曲点击使用该列表的trackIds作为context，收藏单曲使用favorites，调用playTrack(id,contextIds)。
4. 提供可读键盘表单。沿用当前按钮/背景风格，不新增依赖。无需处理PlayerBar或Sidebar，不操作业务服务/存储/Git。
