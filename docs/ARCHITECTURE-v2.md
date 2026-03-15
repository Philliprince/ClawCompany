# ClawCompany 架构设计 v2 - OpenClaw 作为包工头

## 🎯 核心概念

**ClawCompany = OpenClaw + Sub-Agents**

> OpenClaw 作为"包工头"，spawn 多个 AI agent 组建虚拟团队，实现一人企业家的梦想。

---

## 📐 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Landing Page │  │  Chat Page   │  │  Task Dashboard  │  │
│  │  (展示概念)   │  │ (实时对话)    │  │  (任务看板)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  OpenClaw (包工头)                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Orchestrator 角色：                                 │    │
│  │  1. 接收用户需求                                      │    │
│  │  2. Spawn PM Agent (subagent)                       │    │
│  │  3. Spawn Dev Agent (acp/opencode)                  │    │
│  │  4. Spawn Review Agent (subagent)                   │    │
│  │  5. 协调 Agent 之间的通信                            │    │
│  │  6. 整合结果，返回给用户                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  使用 OpenClaw 能力：                                        │
│  - sessions_spawn: 创建 sub-agents                          │
│  - sessions_send: Agent 之间通信                            │
│  - exec/read/write: 文件操作                                │
│  - LLM (GLM-5): 思考和生成                                  │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 │ sessions_spawn
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sub-Agent 层                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PM Agent    │  │  Dev Agent   │  │ Review Agent │      │
│  │              │  │              │  │              │      │
│  │ runtime:     │  │ runtime:     │  │ runtime:     │      │
│  │  "subagent"  │  │  "acp"       │  │  "subagent"  │      │
│  │              │  │              │  │              │      │
│  │ agentId:     │  │ agentId:     │  │ agentId:     │      │
│  │  (default)   │  │  "opencode"  │  │  (default)   │      │
│  │              │  │              │  │              │      │
│  │ 能力：       │  │ 能力：       │  │ 能力：       │      │
│  │  - 分析需求  │  │  - 写代码    │  │  - 审查代码  │      │
│  │  - 拆分任务  │  │  - 生成文件  │  │  - 检查质量  │      │
│  │  - 分配工作  │  │  - 运行测试  │  │  - 提出建议  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  共享 Context：                                               │
│  - 任务列表 (通过 sessions_send 传递)                        │
│  - 代码文件 (通过文件系统)                                   │
│  - 对话历史 (通过 session)                                   │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      执行层                                   │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  File System     │  │  Git Repository  │                │
│  │  (保存代码)       │  │  (版本控制)       │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 三个 Agent 的定义

### 1. PM Agent (产品经理)

```typescript
const pmAgent = await sessions_spawn({
  runtime: "subagent",
  task: `你是 PM Agent (产品经理)。

用户需求：${userRequest}

你的职责：
1. 分析用户需求
2. 拆分成可执行的子任务
3. 为每个任务指定负责人 (dev/review)
4. 设置任务依赖关系

返回格式 (JSON):
{
  "analysis": "需求分析...",
  "tasks": [
    {
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
```

**职责：**
- 分析用户需求
- 拆分成可执行的子任务
- 分配任务给合适的 Agent
- 协调团队进度

---

### 2. Dev Agent (开发者)

```typescript
const devAgent = await sessions_spawn({
  runtime: "acp",
  agentId: "opencode",
  task: `你是 Dev Agent (开发者)。

任务：${task.description}
文件路径：${task.path}

你的职责：
1. 实现这个功能
2. 创建/修改代码文件
3. 确保代码可运行
4. 提交给 Review Agent

要求：
- 使用 TypeScript
- 遵循最佳实践
- 添加必要的注释`,
  mode: "run",
  cwd: "/Users/felixmiao/Projects/ClawCompany"
})
```

**职责：**
- 理解任务需求
- 生成/修改代码
- 确保代码可运行
- 提交给 Review Agent

**为什么用 OpenCode？**
- ✅ 真实的编码代理，不是模拟
- ✅ 可以直接操作文件系统
- ✅ 可以运行测试
- ✅ 可以使用 Git

---

### 3. Review Agent (代码审查)

```typescript
const reviewAgent = await sessions_spawn({
  runtime: "subagent",
  task: `你是 Review Agent (代码审查)。

代码文件：${filePath}
代码内容：
\`\`\`
${codeContent}
\`\`\`

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
```

**职责：**
- 检查代码质量
- 安全性审查
- 性能优化建议
- 批准或要求修改

---

## 🔄 完整工作流程

### OpenClaw (包工头) 的执行逻辑

```typescript
async function orchestrate(userRequest: string) {
  // 1. Spawn PM Agent
  const pmSession = await sessions_spawn({
    runtime: "subagent",
    task: `你是 PM Agent。分析需求并拆分任务。
           需求：${userRequest}`,
    mode: "run"
  })

  // 等待 PM Agent 完成
  const pmResult = await waitForCompletion(pmSession)
  const tasks = JSON.parse(pmResult).tasks

  // 2. 按顺序执行每个任务
  const allFiles = []

  for (const task of tasks) {
    // 2.1 Spawn Dev Agent
    const devSession = await sessions_spawn({
      runtime: "acp",
      agentId: "opencode",
      task: `实现这个任务：${task.description}
             文件路径：${task.path}`,
      mode: "run",
      cwd: projectPath
    })

    // 等待 Dev Agent 完成
    const devResult = await waitForCompletion(devSession)
    allFiles.push(...devResult.files)

    // 2.2 Spawn Review Agent
    const reviewSession = await sessions_spawn({
      runtime: "subagent",
      task: `审查这段代码：${devResult.code}
             文件：${task.path}`,
      mode: "run"
    })

    // 等待 Review Agent 完成
    const reviewResult = await waitForCompletion(reviewSession)

    // 2.3 如果需要修改，重新 spawn Dev Agent
    if (!reviewResult.approved) {
      // 重新执行...
    }
  }

  // 3. 返回结果给用户
  return {
    tasks,
    files: allFiles,
    messages: getAllMessages()
  }
}
```

---

## 📊 与旧架构的对比

| 项目 | 旧架构 | 新架构（OpenClaw 包工头） |
|------|--------|---------------------------|
| Orchestrator | 自定义类 | **OpenClaw 本身** ✅ |
| PM Agent | 自定义类 | **OpenClaw spawn 的 sub-agent** ✅ |
| Dev Agent | 自定义类 | **真实的 OpenCode** ✅ |
| Review Agent | 自定义类 | **OpenClaw spawn 的 sub-agent** ✅ |
| LLM | 自定义调用 | **OpenClaw 已有（GLM-5）** ✅ |
| 文件系统 | 自定义 | **OpenClaw 的 read/write** ✅ |
| 消息系统 | 自定义 | **OpenClaw 的 sessions_send** ✅ |

---

## ✅ 优势

### 1. 真实的团队协作
- ✅ 不是模拟，是真的 spawn 多个 agent
- ✅ 每个 agent 有独立的思考过程
- ✅ 真实的编码能力（OpenCode）

### 2. 利用 OpenClaw 能力
- ✅ 不重复造轮子
- ✅ 已有的消息、工具、LLM 集成
- ✅ 已有的编码代理（OpenCode, Codex）

### 3. 更好的演示效果
- ✅ 可以看到每个 agent 的独立工作
- ✅ 可以看到真实的协作过程
- ✅ 符合"One Person + AI Team"的概念

### 4. 可扩展性
- ✅ 可以添加更多 agent（Tester, Doc Writer）
- ✅ 可以接入更多编码代理（Codex, Claude Code）
- ✅ 可以支持更多 LLM

---

## 🚀 实现计划

### Phase 1: 基础架构（今天晚上）
- [ ] 实现 OpenClaw orchestration 逻辑
- [ ] 实现 PM Agent spawn
- [ ] 实现 Dev Agent spawn (OpenCode)
- [ ] 实现 Review Agent spawn

### Phase 2: 完整流程（明天）
- [ ] 实现完整工作流
- [ ] 添加文件系统共享
- [ ] 添加消息传递
- [ ] 测试端到端流程

### Phase 3: UI 集成（后天）
- [ ] Web UI 展示 agent 协作
- [ ] 实时显示每个 agent 的工作
- [ ] 代码预览
- [ ] 任务看板

---

## 📝 示例对话

```
用户: 帮我创建一个登录页面

OpenClaw: 好的！我作为包工头，开始调度团队...

[Spawn PM Agent]
PM Agent: 分析需求...
          拆分为 3 个任务：
          1. 创建登录表单组件 (Dev)
          2. 添加表单验证 (Dev)
          3. 实现 API 接口 (Dev)

[Spawn Dev Agent for Task 1]
Dev Agent (OpenCode): 创建 LoginForm.tsx...
                      实现表单逻辑...
                      生成文件成功 ✅

[Spawn Review Agent for Task 1]
Review Agent: 检查代码质量... ✅
              检查安全性... ✅
              检查性能... ⚠️ 建议优化
              审查通过 ✅

[继续执行 Task 2, 3...]

OpenClaw: 所有任务完成！
          生成了 3 个文件：
          - src/components/LoginForm.tsx
          - src/lib/validation.ts
          - src/app/api/login/route.ts
```

---

## 🎯 关键技术点

### 1. OpenClaw 作为 Orchestrator
- 利用 OpenClaw 已有的 spawn 能力
- 利用 OpenClaw 已有的消息系统
- 利用 OpenClaw 已有的 LLM (GLM-5)

### 2. 真实的编码代理
- OpenCode 可以直接操作文件
- OpenCode 可以运行测试
- OpenCode 可以使用 Git

### 3. Context 共享
- 通过文件系统共享代码
- 通过 sessions_send 传递消息
- 通过 JSON 传递任务列表

---

**文档版本**: v2
**创建时间**: 2026-03-15 20:45
**作者**: OpenClaw + 老苗
