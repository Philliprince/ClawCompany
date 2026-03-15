# OpenClaw Orchestrator - 包工头实现

这个模块实现 OpenClaw 作为"包工头"，spawn 多个 AI agent 组建虚拟团队。

## 核心逻辑

```typescript
import { sessions_spawn, sessions_send, sessions_history } from 'openclaw'

// OpenClaw 作为 Orchestrator
export async function orchestrateProject(userRequest: string) {
  console.log('🏗️ OpenClaw 包工头开始调度团队...')

  // 1. Spawn PM Agent (subagent)
  const pmSession = await sessions_spawn({
    runtime: "subagent",
    task: `你是 PM Agent (产品经理)。

用户需求：${userRequest}

你的职责：
1. 分析用户需求
2. 拆分成可执行的子任务
3. 为每个任务指定负责人 (dev)
4. 设置任务依赖关系

返回格式 (JSON):
{
  "analysis": "需求分析...",
  "tasks": [
    {
      "id": "task-1",
      "title": "任务标题",
      "description": "任务描述",
      "assignedTo": "dev",
      "dependencies": []
    }
  ]
}`,
    thinking: "high",
    mode: "run"
  })

  // 等待 PM Agent 完成
  const pmHistory = await sessions_history({ sessionKey: pmSession.sessionKey })
  const pmResult = JSON.parse(pmHistory.messages[pmHistory.messages.length - 1].content)
  const tasks = pmResult.tasks

  console.log(`📋 PM Agent 拆分了 ${tasks.length} 个任务`)

  // 2. 按顺序执行每个任务
  const allFiles = []

  for (const task of tasks) {
    console.log(`\n🔨 开始执行任务: ${task.title}`)

    // 2.1 Spawn Dev Agent (OpenCode)
    const devSession = await sessions_spawn({
      runtime: "acp",
      agentId: "opencode",
      task: `你是 Dev Agent (开发者)。

任务：${task.title}
描述：${task.description}

你的职责：
1. 实现这个功能
2. 创建/修改代码文件
3. 确保代码可运行

要求：
- 使用 TypeScript
- 遵循最佳实践
- 添加必要的注释`,
      mode: "run",
      cwd: "/Users/felixmiao/Projects/ClawCompany"
    })

    // 等待 Dev Agent 完成
    const devHistory = await sessions_history({ sessionKey: devSession.sessionKey })
    const devResult = devHistory.messages[devHistory.messages.length - 1].content

    console.log(`✅ Dev Agent 完成了任务: ${task.title}`)

    // 2.2 Spawn Review Agent (subagent)
    const reviewSession = await sessions_spawn({
      runtime: "subagent",
      task: `你是 Review Agent (代码审查)。

任务：${task.title}
Dev Agent 的实现：
${devResult}

你的职责：
1. 检查代码质量
2. 安全性审查
3. 性能优化建议
4. 提出改进建议

审查清单：
- ✅ 代码风格
- ✅ TypeScript 类型安全
- ✅ 错误处理
- ✅ 可访问性 (a11y)
- ✅ 性能优化
- ✅ 安全性检查
- ✅ 测试覆盖

返回格式 (JSON):
{
  "approved": true/false,
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "summary": "审查总结"
}`,
      thinking: "high",
      mode: "run"
    })

    // 等待 Review Agent 完成
    const reviewHistory = await sessions_history({ sessionKey: reviewSession.sessionKey })
    const reviewResult = JSON.parse(reviewHistory.messages[reviewHistory.messages.length - 1].content)

    if (reviewResult.approved) {
      console.log(`✅ Review Agent 批准了任务: ${task.title}`)
    } else {
      console.log(`⚠️ Review Agent 要求修改任务: ${task.title}`)
      // TODO: 重新 spawn Dev Agent
    }

    allFiles.push({
      task: task.title,
      devResult,
      reviewResult
    })
  }

  // 3. 返回结果
  console.log('\n🎉 所有任务完成！')

  return {
    success: true,
    analysis: pmResult.analysis,
    tasks,
    files: allFiles,
    summary: `完成了 ${tasks.length} 个任务`
  }
}
```

## 使用示例

```typescript
// 在 OpenClaw 中调用
const result = await orchestrateProject('帮我创建一个登录页面')

// 返回结果
{
  success: true,
  analysis: "用户需要一个登录页面...",
  tasks: [
    { id: "task-1", title: "创建登录表单组件", ... },
    { id: "task-2", title: "添加表单验证", ... },
    { id: "task-3", title: "实现 API 接口", ... }
  ],
  files: [
    { task: "创建登录表单组件", devResult: "...", reviewResult: {...} },
    ...
  ],
  summary: "完成了 3 个任务"
}
```

## 关键点

1. **OpenClaw 是 Orchestrator**
   - 不需要自己实现 Agent 类
   - 使用 OpenClaw 已有的 spawn 能力

2. **真实的编码代理**
   - Dev Agent 用 OpenCode
   - 可以真的写代码、运行测试

3. **Context 共享**
   - 通过消息传递任务列表
   - 通过文件系统共享代码

4. **可扩展**
   - 可以添加更多 agent（Tester, Doc Writer）
   - 可以接入更多编码代理（Codex, Claude Code）

---

**注意**：这是一个概念设计文档，实际实现需要根据 OpenClaw 的 API 调整。
