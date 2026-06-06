# Project Database Design

## 当前存储策略

当前使用本地 JSON 文件作为唯一真相源，字段设计对齐未来 SQLite 迁移。真实运行数据写入 `data/local/`，该目录被 Git 忽略；仓库只保留 `data/*.example.json` 示例结构。

- `data/local/projects.json`：项目库、任务、决策、讨论、AI 建议、时间轴。
- `data/local/ai_handoff_logs.json`：每次 AI 上下文交接和回填原文。
- `data/local/project_updates.json`：从 AI 输出中归类出的项目进展、决策、新任务、AI 建议、风险提醒。
- `docs/owner.md`：Owner 背景和长期上下文。

## SQLite 表设计

### projects

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 项目 ID |
| name | TEXT NOT NULL | 项目名称 |
| description | TEXT | 一句话描述 |
| status | TEXT NOT NULL | 当前状态 |
| priority | TEXT | 优先级 |
| next_action | TEXT | 下一步行动 |
| owner | TEXT | 负责人 |
| created_at | TEXT NOT NULL | 创建时间 |
| updated_at | TEXT NOT NULL | 更新时间 |

### project_decisions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 决策 ID |
| project_id | TEXT NOT NULL | 项目 ID |
| content | TEXT NOT NULL | 决策内容 |
| created_at | TEXT NOT NULL | 创建时间 |

### project_tasks

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 任务 ID |
| project_id | TEXT NOT NULL | 项目 ID |
| title | TEXT NOT NULL | 任务标题 |
| done | INTEGER NOT NULL DEFAULT 0 | 是否完成 |
| created_at | TEXT NOT NULL | 创建时间 |

### project_discussions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 讨论 ID |
| project_id | TEXT NOT NULL | 项目 ID |
| author | TEXT | 发言人 |
| content | TEXT NOT NULL | 内容 |
| created_at | TEXT NOT NULL | 创建时间 |

### project_ai_suggestions

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 建议 ID |
| project_id | TEXT NOT NULL | 项目 ID |
| source | TEXT | AI 来源 |
| content | TEXT NOT NULL | 建议内容 |
| created_at | TEXT NOT NULL | 创建时间 |

### ai_handoff_logs

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 交接日志 ID |
| source | TEXT NOT NULL | AI 来源 |
| project_id | TEXT | 关联项目 ID |
| project_name | TEXT | 关联项目名称快照 |
| categories | TEXT | 归类结果，JSON 数组 |
| content | TEXT NOT NULL | AI 输出原文 |
| created_at | TEXT NOT NULL | 创建时间 |

### project_updates

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 更新记录 ID |
| source | TEXT NOT NULL | AI 来源 |
| project_id | TEXT | 关联项目 ID |
| project_name | TEXT | 关联项目名称快照 |
| category | TEXT NOT NULL | 项目进展 / 决策记录 / 新任务 / AI建议 / 风险提醒 |
| content | TEXT NOT NULL | 归档内容 |
| created_at | TEXT NOT NULL | 创建时间 |

## 状态枚举

- 想法池
- 待立项
- 验证中
- 暂停
- 放弃
- 完成
