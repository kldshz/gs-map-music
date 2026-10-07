# 阶段3真实地图与空音乐库审核

日期：2026-10-07。用户最新要求：音乐暂空、锚点/神像均可关联多首、取消昼夜、仅原神音乐。本轮不实现真实播放或路线模拟。数量、快照hash与控制点结果见[机器证据](STAGE3_EVIDENCE.json)。

## 来源、范围与复用

参考[空荧V3](https://github.com/kongying-tavern/map_front_v3/tree/0e80dd090329cb4964360ef42d2ed6016cf7cc15)，源码固定提交`0e80dd090329cb4964360ef42d2ed6016cf7cc15`。实际已克隆并核对map.js、请求封装、LICENSE。复用原投影/配置继承/负索引瓦片URL、地区/点位/分层字段与图标，不迁入账号、采集存档或无关物品系统。V3/V4选择依据仍见[比较](MAP_BASE_COMPARISON.md)。许可原文保留[副本](../public/licenses/KONGYING-MulanPSL-2.0.txt)，衍生地图文件有出处，页面有署名和代码许可入口。

数据经本机Edge实际访问<https://v3.yuanshen.site/>，使用页面正常游客流程生成的请求认证，在内存完成同一读取流程。没有复制账号凭据、保存token、修改上游数据或绕过验证。实际端点为<https://cloud.yuanshen.site/api>，不是无需认证的匿名公共API：

| 调用 | 实际请求体与结果 |
| --- | --- |
| POST /area/get/list | `{"isTraverse":true,"parentId":-1}`；HTTP/业务200，47条 |
| POST /item/get/list | 每个末端地区分别`{"typeIdList":[],"areaIdList":[地区ID],"current":0,"size":9999,"sort":["sortIndex-"]}`，只保留名称严格等于传送锚点/七天神像的58个item组 |
| POST /marker/get/list_byinfo | `{"typeIdList":[],"areaIdList":[],"itemIdList":[筛得item IDs],"getBeta":0}`；877个源ID |
| POST /marker/get/list_byid | `{"markerIdList":[每批最多200个ID]}`；877个完整点位，源ID集合一致 |
| POST /icon/get/list | 两类item实际iconId48/49查询，得到神像icons/125.png、锚点icons/127.png |
| GET webapp.json | <https://assets.yuanshen.site/webapp.json>，同次生产配置；hash保存在快照与证据JSON |

一次空/全地区item请求返回500，改为与源页面结构一致的逐地区读取后成功。没有隐藏失败、猜造地图接口或无限重试。完整性指本次返回ID集合，不保证全游戏永久最新。

产物[快照](../public/data/kongying-map.json)只含必要配置/点位/地区字段，去除creator/账号等无关字段：**877=822锚点+55神像**。蒙德27（23+4）；纳塔NATA2为39（36+3）；至冬1为66（61+5），继承生产twt672瓦片。原始坐标全部非空，层级来自真实extra.underground.region_levels。底图/图标/叠层图片在线按需加载，未下载进Git。代码许可证与游戏素材、服务使用条件分开，个人非商业用途不当作再分发授权；本轮仅私有本机演示，没有公开部署。

可重现脚本：[采集](../scripts/capture-kongying-anchors.mjs)、[归一化](../scripts/normalize-kongying-map.mjs)。需要npm依赖、本机Edge与正常可访问上游；手动执行`node scripts/capture-kongying-anchors.mjs`后`node scripts/normalize-kongying-map.mjs`，再运行检查。原始数据只存忽略目录.local，控制台仅数量，不输出认证。刷新地图前检查上游源码/配置版本与数据差异，固定参考提交并非未来自动兼容承诺。归一化不覆盖已有音乐库。

## 数据与页面验证

- 严格vue-tsc与Vite7.3.7生产构建通过；npm audit已知漏洞0。
- `npm run test:data`：7个阶段3测试+5个地区导出测试通过。覆盖实际数量、空音乐、所有末端地区继承解析、canonical往返/负索引/空间隔离、同名不同ID/神像多对多、引用/重复/父链/安全URL/证据拒绝、搜索与坏导入保留，以及同瓦片集跨地区全部高亮/独立地图逐点切换。
- `npm run test:ui -- --workers=1`：9/9本机Edge生产页面通过。真实在线瓦片、27个蒙德点位点击、神像键盘/原生dialog/Esc、至冬66/纳塔39/天蛇船叠层、空库/测试元数据反向高亮、真实触发503与abort瓦片、390/320手机无横溢出和地图≥240px、无坐标关联不创建假标记、缩放贴合。
- 三个不共线源点6290/6557/6554：DOM相对位置与原V3投影预期初始最大误差0.312px，半级缩放后0.642px（四舍五入上界）。这是浏览器投影一致性，不是对照游戏全877点位逐点标校。截图目视星落湖神像、风龙废墟神像与其它锚点贴合底图；无游戏客户端独立精度基准。
- Codex实际查看最终1440×900桌面、390/320×844手机和点位空库弹窗截图。截图/控制点明细/trace位于被忽略.local/browser-tests，不把截图当播放或路线通过。

测试元数据标题明确为自动化条目、无音频，不包含捏造的OST信息，不进产品快照或数据库。默认曲目与关系均0，因此真实音乐地点/作曲/发行事实及真实曲目闭环延期，非“真实OST检索已通过”。pending仅展示/核对，不自动选曲。

## MySQL与补全表

已有本机MySQL80/8.0.40，授权root凭据连接成功，未重置root或改其它库。独立gs_map_music四表：area47、anchor877、music_track0、track_anchor0。初始化脚本经本机配置文件认证，不在命令行泄密；[数据库说明](../database/README.md)。页面仍读JSON，导入仅当前会话，没有数据库HTTP持久化。

[点位Excel](../outputs/map-anchors-20261007/空荧锚点与神像补全表.xlsx)与[CSV](../outputs/map-anchors-20261007/空荧锚点与神像补全表.csv)：877行18列，源Key/ID/类型/国家/地区ID与code/分层values和路径/坐标/说明/版本/来源保留。J:L黄色列填写音乐细地点、目录Key、说明。空字段不代填音乐关系。原[地区目录](../outputs/map-regions-20261006/空荧地图地区分类与分层目录.xlsx)可对照使用，层value不是自身API地区ID。

表格由artifact-tool创建；保存后以openpyxl只读核对877行18列的CSV值（CRLF/LF换行规范化）、源ID/地区/坐标与快照一致、55神像/822锚点及填写列为空，冻结B8与筛选A7:R884保留；实际查看主列和填写列预览，无公式错误。未实操Excel客户端，冻结/筛选验证为保存文件结构检查。

提交前本地Markdown链接89个有效；本机数据库密码在待交付文件中精确匹配0，.local凭据被忽略，构建/依赖/音乐文件不入库。脚本语法及git diff --check通过。最终提交/推送哈希以交付回复与远程HEAD核对为准。

## 后续限制

当前没有音源解析、播放、队列、收藏/简介持久化或路线模拟。阶段4需基于用户补充音乐和可用原神音源，安全接入数据库/音源服务；网易CLI登录不等于浏览器实际播放。地区标签不构成空间边界，阶段5仍需明确判区数据/近似方法。外部瓦片可能失败/变更，离线可用性和公开资源发行授权未完成。
