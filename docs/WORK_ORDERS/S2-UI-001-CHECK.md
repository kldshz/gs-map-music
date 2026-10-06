# S2-UI-001-CHECK：大工单超时后连通性检查

原 S2-UI-001 在600秒后超时，没有交付，不做自动原样重试。本工单仅检查同一指定模型服务是否仍可用；不生成前端，不改文件、不用工具、不操作Git，不公开内部推理。

只返回有效JSON：{"ticket_id":"S2-UI-001-CHECK","status":"completed","marker":"STAGE2_CLAUDE_AVAILABLE","files":[]}。不可宣称基于提示词确认模型身份；Codex从实际CLI响应另行核对。CLI指定claude-opus-5-5、effort=high，不替换模型。
