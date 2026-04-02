# OpenCode 进程追踪 - 2026-04-02

## ✅ 正确启动方式（2026-04-02 22:32 更新）

### **OpenCode 调用规范**

**重要**：不要使用 `sessions_spawn`，应该用 `exec` + `pty:true`！

#### **正确方式**：
```bash
# 前台运行
exec({
  command: "cd ~/project && opencode run '任务描述'",
  pty: true,           // 必须！
  workdir: "/path/to/project"
})

# 后台运行（推荐）
exec({
  command: "cd ~/project && opencode run '任务描述'",
  pty: true,           // 必须！
  background: true,    // 后台运行
  timeout: 3600,       // 1 小时超时
  workdir: "/path/to/project"
})
```

#### **监控方式**：
```bash
# 查看输出
process({ action: "log", sessionId: "session-id", limit: 50 })

# 检查是否还在运行
process({ action: "poll", sessionId: "session-id" })

# 发送输入（如果需要交互）
process({ action: "write", sessionId: "session-id", data: "y" })

# 杀掉进程
process({ action: "kill", sessionId: "session-id" })
```

#### **为什么不用 sessions_spawn？**
- `sessions_spawn` + `mode="session"` 需要 `thread=true`
- Telegram channel 不支持 thread binding
- 会报错：`"Thread bindings do not support ACP thread spawn for telegram."`

---

## 当前运行的 OpenCode 进程

**记录时间**: 2026-04-02 22:32 (Asia/Shanghai)

### 进程列表

| PID  | Session ID | 启动时间 | 任务 |
|------|-----------|----------|------|
| 67904 | rapid-harbor | 22:32 | **Version 4: 自动导航系统** |

**启动方式**：
```typescript
exec({
  command: "cd ~/Projects/ClawCompany && opencode run '实现 Version 4...'",
  pty: true,
  background: true,
  timeout: 3600,
  workdir: "/Users/felixmiao/Projects/ClawCompany"
})
```

**当前状态**: ⏳ 运行中

---

## 历史记录

### 架构设计任务（已失败）
**启动时间**: 2026-04-02 16:00
**问题**: 使用 `sessions_spawn` 方式，进程立即退出

### Version 4 任务（当前）
**启动时间**: 2026-04-02 22:32
**方式**: `exec` + `pty:true` + `background:true`
**Session**: `rapid-harbor`

---

*最后更新: 2026-04-02 22:32*
