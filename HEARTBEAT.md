# HEARTBEAT.md - ClawCompany 自动优化

## Cron 任务配置

### 每 30 分钟迭代任务
- **任务名**: clawcompany-iterate
- **频率**: 每 30 分钟
- **工作目录**: `/Users/felixmiao/Projects/ClawCompany`
- **详细 Prompt**: `~/.openclaw/workspace/memory/clawcompany-iterate-prompt.md`
- **执行内容**:
  1. **检查项目状态**（测试、编译、覆盖率）
  2. **Review 迭代计划**（`docs/phaser-iteration-plan.md` 和 `docs/phaser-version-progress.md`）
  3. **优化迭代计划**（调整顺序、拆分任务、更新进度）
  4. **执行改进**（使用 OpenCode + TDD）
  5. **提交代码**（commit + push）
  6. **更新进度文件**（记录完成状态和 commit hash）

### 每天早上 8 点研究任务
- **任务名**: daily-multiagent-research
- **频率**: 每天 08:00 (Asia/Shanghai)
- **执行内容**:
  1. 搜索前沿多 agent 项目
  2. 分析特点和创新点
  3. 与 ClawCompany 对比
  4. 提供启发建议

## 项目结构

```
/Users/felixmiao/Projects/ClawCompany/
├── ai-team-demo/      # Next.js 应用
├── skill/             # OpenClaw Skill
├── docs/              # 文档
├── scripts/           # 工具脚本
├── memory/            # 开发日志
└── README.md          # 项目说明
```

---
*最后更新: 2026-03-30 21:46*
