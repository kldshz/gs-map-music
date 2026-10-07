# 本机数据库

阶段3沿用现有MySQL80服务（8.0.40），创建独立数据库`gs_map_music`。保留空荧原始地区/点位ID，传送锚点与神像共用`anchor`表；`music_track`与`track_anchor`支持双向多对多，默认空。没有昼夜字段。没有修改已有root账户或其他数据库。

凭据仅保存在被Git忽略的`.local/mysql-client.ini`，浏览器不连接数据库，不使用`VITE_`变量存凭据。当前地图运行从已核对的JSON快照加载，数据库是本机数据存储基础；阶段3没有开放数据库HTTP接口或公网端口，不能把导入到页面的会话数据声称为已保存数据库。

配置文件的`[client]`段填写host/port/user/password/default-character-set；已按用户提供的本机账户验证。不要将该文件上传。初始化命令`node scripts/setup-mysql.mjs`，默认本机标准安装路径，可用`MYSQL_BIN`指定mysql.exe。脚本创建表并更新来源地区/点位，不删除歌曲或关联。仅对可信来源快照使用；先备份手工修改的点位，再刷新来源数据。

四张表定义见[schema.sql](schema.sql)。原始V3坐标保存为source_lat/source_lng，属于游戏图像坐标，不是地理经纬度；网页的转换逻辑见[kongying-config.ts](../src/adapters/kongying-config.ts)。
