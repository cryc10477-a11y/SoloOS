# SoloOS

SoloOS 是一个本地桌面版「一人公司操作系统」。当前核心方向不是普通项目管理，而是成为所有 AI 工具的统一记忆中枢。

未来无论使用 ChatGPT、Codex、WorkBuddy、Claude、Gemini 还是新的 AI 工具，都先从 SoloOS 导出上下文，再把 AI 输出回填到 SoloOS。SoloOS 是唯一真相源，老板不再做人肉同步器。

## 推荐技术方案

- 桌面壳：Electron，优先保证 Mac 本地可打开、开发简单、生态稳定。
- 前端：React + Vite，页面结构轻量，便于 Codex 和 WorkBuddy 继续迭代。
- 本地数据：当前使用 `data/projects.json`、`data/ai_handoff_logs.json`、`data/project_updates.json` 文件存储；后续可按 `docs/project_database_design.md` 迁移到 SQLite。
- 规则库：Markdown 文档保存在 `docs/` 和 `agents/`，作为人和 AI 的共同上下文。
- 版本管理：Git 本地仓库，远程目标仓库名 `SoloOS`。

## 文件夹结构

```text
~/Desktop/SoloOS
├── app/                      # Electron + React 桌面应用
├── data/                     # 本地数据文件
├── docs/                     # 公司规则、路线图、数据库设计
├── agents/                   # AI 角色 Prompt
├── logs/                     # 本地日志
├── README.md
└── CHANGELOG.md
```

## 当前核心功能

- 统一记忆库：读取 `docs/owner.md`、项目库、决策、任务、AI 建议、交接日志和项目更新。
- 项目库：记录项目状态、最新进展、下一步行动、决策记录和相关 AI 建议。
- AI Context Hub：按 ChatGPT、Codex、WorkBuddy、Claude、Gemini 生成不同格式上下文包。
- AI 回填：粘贴 AI 输出后归类为项目进展、决策记录、新任务、AI 建议和风险提醒。
- 本地优先：第一阶段不做 AI 聊天系统，不做服务器，不做复杂 Agent 自动化。

## v0.1 功能清单

- 打开 Mac 本地桌面软件。
- 查看所有项目。
- 新增、编辑、删除项目。
- 修改项目状态：想法池、待立项、验证中、暂停、放弃、完成。
- 记录项目名称、一句话描述、优先级、下一步行动、负责人、创建时间、更新时间。
- 为项目保存决策记录。
- 为项目维护任务列表。
- 为项目添加聊天/讨论记录。
- 保存 AI 给出的建议。

## v0.2 功能清单

- 项目总览首页：统计区、今日重点、最近活动。
- 项目列表：搜索、筛选、排序、负责人和更新时间展示。
- 项目看板：按状态分列，拖拽项目卡片自动修改状态。
- 项目详情：基础信息、当前目标、醒目的下一步行动和截止时间。
- 任务系统：待办、进行中、已完成。
- 决策记录、项目聊天记录、AI 建议区。
- 项目评分：赚钱速度、成功概率、投入成本、兴趣度、长期价值和总分。
- 时间轴：自动记录创建项目、修改状态、新增任务和完成任务。

## 第一天开发计划

1. 初始化 Git 仓库和标准目录。
2. 写入基础文档与 AI 角色 Prompt。
3. 搭建 Electron + React 本地桌面壳。
4. 实现项目库 CRUD 与本地 JSON 存储。
5. 完成首次 commit；如 GitHub 权限可用则创建远程仓库并 push。

## 本地运行

```bash
cd ~/Desktop/SoloOS/app
npm install
npm run dev
```

## 生成 Mac 应用

```bash
cd ~/Desktop/SoloOS/app
npm run package:mac
open ~/Desktop/SoloOS/app/release/mac-arm64/SoloOS.app
```

生成后的应用位置：

```text
~/Desktop/SoloOS/app/release/mac-arm64/SoloOS.app
```

## GitHub 状态

当前环境未检测到可用的 GitHub CLI `gh`，因此无法自动创建 GitHub 仓库或验证 push 权限。请安装并登录后执行：

```bash
brew install gh
gh auth login
cd ~/Desktop/SoloOS
gh repo create SoloOS --private --source=. --remote=origin --push
```
