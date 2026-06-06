# Company Rules

## SoloOS v0.1 规则

- 这不是飞书替代品，而是一人公司的本地操作系统。
- 第一版只做本地运行，不依赖服务器。
- 所有源码、数据、文档、配置、Prompt 和日志统一保存在 `~/Desktop/SoloOS`。
- Codex 和 WorkBuddy 后续都基于同一个文件夹工作。
- 每次完成修改后执行 `git status`、`git add .`、`git commit`、`git push`；如果 push 失败必须明确说明原因。

## 数据规则

- v0.1 使用 `data/projects.json` 存储项目数据。
- 不在代码中写死个人隐私或第三方密钥。
- 后续如数据规模增大，迁移到 SQLite。

