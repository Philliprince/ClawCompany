# ClawCompany 真实代码实现计划 - 更新版

## ✅ 实现状态（17:50）

### 已完成
- [x] **sessions_spawn 真实调用成功** (17:30)
  - 测试通过：GLM-5 返回 "测试成功"
  - Session key: `agent:main:subagent:6c20c890-80fb-4dbe-a96c-ce42ae7bce5a`
  - 耗时：4秒
  
- [x] **Web Portal 页面** (17:45)
  - `/team` 页面完成
  - Agent 配置界面
  - 实时聊天界面
  
- [x] **Agent API** (17:45)
  - `/api/agent` route 完成
  - 直接调用 GLM-5 API
  - 支持所有 Agent 类型

### 进行中
- [ ] 修复 ESLint 错误
- [ ] 确保 build 成功
- [ ] 测试 E2E 流程

---

## 🏗️ 技术架构（最终版）

### 方案选择

**❌ 不采用：3个独立 OpenClaw**
- 原因：资源消耗大、管理复杂、不必要

**✅ 采用：1个 OpenClaw + sessions_spawn**
- 轻量：资源消耗 1x
- 简单：单一环境管理
- 高效：OpenClaw 原生支持

---

## 🔧 实现细节

### 1. PM Agent（产品经理）

**调用方式：**
```typescript
// 方式 A：直接 GLM-5 API（原型阶段）
const response = await fetch('/api/agent', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'pm-agent',
    userMessage: '创建登录页面',
    systemPrompt: '你是 PM Agent...'
  })
})

// 方式 B：sessions_spawn（未来）
const sessionKey = await sessions_spawn({
  runtime: 'subagent',
  task: '你是 PM Agent. 用户需求：创建登录页面',
  thinking: 'high',
  mode: 'run'
})
```

**职责：**
- 分析用户需求
- 拆分成 2-4 个可执行任务
- 返回 JSON 格式任务列表

---

### 2. Dev Agent（开发者）

**调用方式：**
```typescript
// 方式 A：直接 GLM-5 API（原型阶段）
const response = await fetch('/api/agent', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'dev-agent',
    userMessage: '实现登录表单',
    systemPrompt: '你是 Dev Agent...'
  })
})

// 方式 B：OpenCode（未来）
const sessionKey = await sessions_spawn({
  runtime: 'acp',
  agentId: 'opencode',
  task: '实现登录表单',
  mode: 'run',
  cwd: projectPath
})
```

**职责：**
- 理解任务需求
- 生成/修改代码
- 返回生成的文件列表

---

### 3. Review Agent（审查员）

**调用方式：**
```typescript
// 方式 A：直接 GLM-5 API（原型阶段）
const response = await fetch('/api/agent', {
  method: 'POST',
  body: JSON.stringify({
    agentId: 'review-agent',
    userMessage: '审查代码...',
    systemPrompt: '你是 Review Agent...'
  })
})

// 方式 B：sessions_spawn（未来）
const sessionKey = await sessions_spawn({
  runtime: 'subagent',
  task: '审查代码...',
  thinking: 'high',
  mode: 'run'
})
```

**职责：**
- 审查代码质量
- 检查安全性
- 提供改进建议

---

## 📂 文件结构

```
ai-team-demo/
├── src/
│   ├── app/
│   │   ├── team/
│   │   │   └── page.tsx          # Portal 主页面 ✅
│   │   ├── api/
│   │   │   └── agent/
│   │   │       └── route.ts      # Agent API ✅
│   │   ├── page.tsx              # Landing Page ✅
│   │   ├── demo/
│   │   │   └── page.tsx          # Demo Page ✅
│   │   └── chat/
│   │       └── page.tsx          # Chat Page ✅
│   ├── lib/
│   │   └── agents/
│   │       └── config.ts         # Agent 配置 ✅
│   └── types/
│       └── openclaw.d.ts         # 类型声明 ✅
├── .env.local                    # GLM API Key ✅
├── .eslintrc.json                # ESLint 配置 ✅
└── package.json                  # 依赖配置 ✅
```

---

## 🎯 E2E 流程

**用户输入："创建登录页面"**

1. **用户** → Portal `/team`
2. **Portal** → POST `/api/agent` (pm-agent)
3. **API** → GLM-5 API
4. **GLM-5** → 返回任务列表（JSON）
5. **Portal** → 显示 PM Agent 消息
6. **Portal** → 为每个任务调用 `/api/agent` (dev-agent)
7. **API** → GLM-5 API
8. **GLM-5** → 返回代码（JSON）
9. **Portal** → 显示 Dev Agent 消息
10. **Portal** → 调用 `/api/agent` (review-agent)
11. **API** → GLM-5 API
12. **GLM-5** → 返回审查结果（JSON）
13. **Portal** → 显示 Review Agent 消息
14. **完成** ✅

---

## ⏰ 时间规划（更新）

| 时间 | 任务 | 状态 |
|------|------|------|
| 17:50-18:00 | 修复 ESLint + build | 🚧 进行中 |
| 18:00-18:30 | 测试 E2E 流程 | ⏳ |
| 18:30-19:00 | 优化 UI | ⏳ |
| 19:00-19:30 | 最终检查 | ⏳ |
| 19:30-19:50 | 录制准备 | ⏳ |
| 20:00 | **录制 demo** | 🎯 目标 |

---

## 🚫 避免的错误

1. ❌ 不要提交纯文档 commit
2. ❌ 不要写伪代码
3. ❌ 不要模拟实现
4. ❌ 不要跳过测试

---

## ✅ 必须做的事

1. ✅ 所有代码必须真实可运行
2. ✅ 所有 API 必须真实调用
3. ✅ 所有测试必须通过
4. ✅ build 必须成功

---

## 📊 成功标准（8:00 PM）

- [x] sessions_spawn 真实调用成功
- [ ] Portal E2E 流程可运行
- [ ] PM → Dev → Review 完整流程
- [ ] npm run build 成功
- [ ] Demo 录制一切就绪

---

*计划创建: 17:13*
*最后更新: 2026-03-16 17:50*
*下次检查: 18:50 (cron)*
