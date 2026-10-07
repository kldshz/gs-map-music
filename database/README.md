# 本机数据库

阶段3沿用现有MySQL80服务（8.0.40），创建独立数据库`gs_map_music`。保留空荧原始地区/点位ID，传送锚点与神像共用`anchor`表；《风与牧歌之城》试做已导入63首/122条关系/40音乐目录。没有昼夜字段，没有修改已有root账户或其他数据库。

凭据仅保存在被Git忽略的`.local/mysql-client.ini`，浏览器不连接数据库，不使用`VITE_`变量存凭据。当前地图运行从已核对的JSON快照加载，数据库是本机数据存储基础；阶段3没有开放数据库HTTP接口或公网端口，不能把导入到页面的会话数据声称为已保存数据库。

配置文件的`[client]`段填写host/port/user/password/default-character-set；已按用户提供的本机账户验证。不要将该文件上传。初始化命令`node scripts/setup-mysql.mjs`，默认本机标准安装路径，可用`MYSQL_BIN`指定mysql.exe。脚本创建表并更新来源地区/点位，不删除歌曲或关联。仅对可信来源快照使用；先备份手工修改的点位，再刷新来源数据。

六张表定义见[schema.sql](schema.sql)：area、anchor、music_track、track_anchor、music_location、track_music_location。music_track新增personal_note独立长文本、netease_encrypted_id、scene_info；track_anchor新增match_type。细目录引用源area，scene目录可能只是剧情/界面归档，不能当地理坐标。

`npm run db:import`先按页面契约校验JSON/地区/神像归档，再幂等迁移旧表并在独立事务补充新数据。DDL在MySQL会隐式提交，数据事务与DDL分开；SQL通过stdin传入，不把密码放命令行。现有歌曲、评价、目录及挂载行不覆盖，也不删除撤去的关系；需修改已有数据时先备份并人工审查合并。此命令不是全量刷新/同步接口。重复执行后仍63曲/122关系/40目录/63曲目目录关系。

页面读取JSON，个人评价只存当前浏览器，不自动写personal_note或反向同步。数据库字段可由后续受控导入/编辑流程使用。原始V3坐标保存为source_lat/source_lng，属于游戏图像坐标，不是地理经纬度；网页的转换逻辑见[kongying-config.ts](../src/adapters/kongying-config.ts)。
