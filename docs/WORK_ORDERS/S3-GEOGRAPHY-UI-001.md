# S3-GEOGRAPHY-UI-001：统一一级/二级目录展示

本机CLI入口/既有网关，指定claude-opus-5-5 --effort high，工具禁用，stdin上下文。仅允许MusicSidebar.vue精确替换及必要style.css追加。Codex负责数据/搜索/校验，调用期间不编辑这两个文件。不能改数据库、来源、业务或Git。

锚点新增可选geography：{country,primary:string|null,secondary:string|null,method:'source-header'|'landmark-distance'|'unresolved',evidenceStatus:'pending',distance:number|null,sourceUrl}。曲目sceneInfo新增可选geographicScopes:[{country,primary:string|null,secondary:string|null}]。名称来自统一目录；二级null必须诚实显示“未细分”，不要根据曲库或原说明推定UI值。

保持原神风格右侧三栏和现有键盘/移动/开发编辑/评价/全部定位。不要增加中心弹窗。
1. 点位目录显示统一国家/一级/二级路径，原点位说明保留；源areaName只在详情用“源地图分组”标签展示。
2. 点位详情新增“一级地区”“二级地点”，空一级显示“未确定”，空二级“未细分”。归类证据折叠、说明“距离候选仅供校对，不代表官方边界”；如distance存在以V3图像单位显示，非米。原说明/坐标/来源不删。
3. 单曲完整元数据新增统一分类路径，直接读sceneInfo.geographicScopes；不要显示关联理由/计数/核实资源状态；出处保留。
4. 开发添加候选点位搜索把geography三个字段加入搜索文本，显示路径方便校对。关联点位列表仍仅显示原说明与编号，不重新添加理由。
5. 不做自动播放、地图、类别数据变更。交付最小可维护修改。

纯JSON返回：{"ticket":"S3-GEOGRAPHY-UI-001","status":"completed","replacements":[{"path":"src/components/MusicSidebar.vue","old":"唯一实际旧串","new":"替换串"}],"cssAppend":"必要CSS","summary":"简述"}。old串不重叠，与上下文一致。
