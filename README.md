# SoloOS

SoloOS 是一个本地桌面版「一人公司操作系统」。v0.2 聚焦项目总览、项目列表、项目看板、项目详情、任务、决策、时间轴和 AI 建议沉淀，不做复杂 Agent 自动化。

## 推荐技术方案

- 桌面壳：Electron，优先保证 Mac 本地可打开、开发简单、生态稳定。
- 前端：React + Vite，页面结构轻量，便于 Codex 和 WorkBuddy 继续迭代。
- 本地数据：v0.1 使用 `data/projects.json` 文件存储；后续可按 `docs/project_database_design.md` 迁移到 SQLite。
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
