# 测试 ClawCompany Orchestrator

## 测试用例 1：简单需求

**输入：**
```
使用 ClawCompany orchestrator 处理用户需求："创建一个计数器组件"
```

**期望输出：**
1. PM Agent 分析需求
2. Dev Agent 生成代码
3. Review Agent 审查代码
4. 返回完整结果

## 测试用例 2：复杂需求

**输入：**
```
使用 ClawCompany orchestrator 处理用户需求："做一个待办事项列表，可以添加、删除、标记完成"
```

**期望输出：**
1. PM Agent 拆分成多个任务
2. Dev Agent 逐个实现
3. Review Agent 审查每个任务
4. 返回完整结果

## 测试用例 3：回退模式

**输入：**
在没有 OpenClaw 工具的情况下调用 `orchestrate()`

**期望输出：**
- 使用回退模式
- 返回基本结果
- 不抛出错误

---

## 如何测试

### 方法 1：在 OpenClaw 中运行

```typescript
import { orchestrate } from './skill/orchestrator'

// 在 OpenClaw main session 中运行
const result = await orchestrate('创建一个计数器组件', {
  sessions_spawn,
  sessions_history
})

console.log(result)
```

### 方法 2：通过 HTTP API

```bash
curl -X POST http://localhost:3000/api/openclaw \
  -H "Content-Type: application/json" \
  -d '{"userRequest": "创建一个计数器组件"}'
```

---

*创建时间: 2026-03-17 14:25*
