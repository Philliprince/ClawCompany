# HEARTBEAT.md - ClawCompany 自动优化

## Cron 任务配置

### 每2小时迭代任务
- **任务名**: clawcompany-iterate
- **频率**: 每 2 小时
- **工作目录**: `/Users/felixmiao/Projects/ClawCompany`
- **执行内容**:
  1. 调用 OpenCode 检查项目代码
  2. 分析改进点（代码质量、测试覆盖、文档、架构）
  3. 选择最有价值的改进
  4. 用 OpenCode 实现（TDD优先）
  5. 提交代码
  6. 报告结果

### 每天早上8点研究任务
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
