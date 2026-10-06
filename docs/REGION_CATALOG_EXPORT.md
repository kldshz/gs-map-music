# 阶段3：地区与地图分层目录导出

日期：2026-10-06。按用户要求优先提取完整地区分类，未扩展为锚点提取或前端开发。

## 来源与实际接入

通过本机Edge访问官方公开入口 https://yuanshen.site/ ，正常跳转至 https://v3.yuanshen.site/ 。页面自行完成其正常游客流程，地区请求为 `POST https://cloud.yuanshen.site/api/area/get/list`，请求体 `{"isTraverse":true,"parentId":-1}`；HTTP200、业务errorStatus200，data返回47条记录。不复制账号凭据，不将游客令牌、请求认证头或完整原始响应写入导出/Git。

更细目录来自当前生产配置 https://assets.yuanshen.site/webapp.json 的 `plugins[areaCode].extraConfig.underground.levels` 和 `plugins[areaCode].overlayConfig.overlays`，递归保留children。配置快照SHA-256及地区原始字段的规范化摘要位于机器数据provenance中；原始响应、浏览器截图和配置缓存仅保存在忽略目录。

## 实际层级与修正

地区API的parentId树在本次响应中是两层；地图UI还从分层插件提供更细的目录。此前只列瓦片配置和API地区层，遗漏了这部分。因此完整目录可达四层，不应把所有第三级都描述为本项目新增。

已核对用户例子，保留来源中的原始写法：

```text
纳塔                       C:NT，地区ID44
└─ 镜璧山、翘枝崖、奥奇卡纳塔  A:NT:NATA2，地区ID46
   └─ 奥奇卡纳塔            OCHKANATLAN
      ├─ 传说中的天蛇船      LEGEND_SKYSERPENT_SHIP
      └─ 噩梦的温床          NIGHTMARES_NURSERY
```

API地区保留原始id/code/parentId。分层目录使用来源value及完整祖先value链生成本项目节点键；它们自身的API地区ID为空，另保存所属地区ID，不把生成键伪装为空荧地区ID。不同地区或不同父链下同名节点不合并。

地下点位筛选树与底图叠层树常有同一个节点，按所属areaCode与祖先value路径合并，保留两处JSON来源位置；仅出现在一个渠道的条目也保留。同value路径标签冲突、同渠道重复、父链缺失/循环或分层无对应地区时报错，不静默丢失。

本次包含47个API地区（11个顶级分类），453个地下树节点出现和494个叠层树节点出现，其中450处镜像合并，得到497个分层节点，合计544个目录节点，最大4层。包含默认隐藏的活动分类，以及地图状态/任务前后分层项，不能把全部节点视作行政地区、真实边界或已核实音乐地点。原配置中的问号名称保留并标记；没有补写坐标、锚点或歌曲关联。

## 交付与使用

- [Excel完整目录](../outputs/map-regions-20261006/空荧地图地区分类与分层目录.xlsx)：完整目录544行和API原表47行两个工作表。保留一级至四级、节点名、父节点键、自身/所属地区ID、代码/value、完整路径、隐藏状态、来源位置。黄色“补充地点”“备注”可填；源字段与节点键保持不变，供后续关联与回导。
- [UTF-8 BOM CSV](../outputs/map-regions-20261006/空荧地区完整目录.csv)：同一544行、20列，供程序读取。
- [结构化来源数据](../outputs/map-regions-20261006/kongying-region-catalog.json)：原API必要字段、合并节点、统计和来源摘要，不含认证信息或地图图片。
- [提取脚本](../scripts/export-map-region-data.mjs)：读取已保存的地区响应与webapp配置，输出机器目录/CSV；无网络请求或自动凭据读取。Excel由本机捆绑的@oai/artifact-tool生成，构建/预览工具留在忽略目录。

提取命令：`node scripts/export-map-region-data.mjs 地区响应.json webapp.json 输出目录 2026-10-06`。末项是来源快照日期；省略时记为空，不将导出当天冒充来源日期。

本次是用户要求的个人项目参考数据导出；HTTP可访问不独立赋予游戏图片或地图服务的公共再分发权。没有下载或入库分层图片。

## 检查结果

- `node --test tests/data/map-region-export.test.mjs`：5/5通过，覆盖镜像合并、单渠道保留、同名分开、隐藏传播、父链/冲突拒绝、实际544节点及纳塔路径。
- Excel内部值与导出数组逐格核对；保存后用XLSX XML对照CSV验证全部544行20列，ID文本、两个工作表的冻结首7行/前2列、筛选表均保留。初次导出未序列化筛选，显式启用showFilterButton后重导出并验证通过。
- 无公式错误命中；实际查看两个工作表及纳塔路径预览。主文件为72KB左右，无宏；原始响应、认证数据、模型配置和预览不提交。
- 本单元仅数据与导出记录，未修改应用页面，不抬升阶段3双向检索、地图标校或锚点完整性验收。
