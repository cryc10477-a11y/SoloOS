# Project Database Design

## v0.1 存储策略

v0.1 使用 `data/projects.json` 作为本地数据文件，字段设计对齐未来 SQLite 迁移。

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

## 状态枚举

- 想法池
- 待立项
- 验证中
- 暂停
- 放弃
- 完成

