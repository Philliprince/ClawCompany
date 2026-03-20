# Commit Quality Standard

**目标：** 让评委看到后觉得这是个专业的 repo

---

## ✅ 允许的 Commit 类型

每次 commit 必须满足以下至少一项：

### 1. feat - 新功能/新模块
- ✅ 必须包含可运行的代码
- ✅ 必须有对应的实现（不仅是接口）
- ✅ 可以是尝试性的新模块（允许不完美，但要完整）
- ✅ 示例：
  - `feat(security): implement API key encryption with AES-256`
  - `feat(storage): add persistent storage with SQLite`
  - `feat(git): implement auto-commit with conventional messages`

### 2. fix - Bug 修复
- ✅ 必须包含问题定位 + 解决方案
- ✅ 必须有测试验证修复
- ✅ 示例：
  - `fix(orchestrator): resolve race condition in agent coordination`
  - `fix(gateway): handle timeout errors gracefully`

### 3. refactor - 代码重构
- ✅ 必须改善代码质量（不改变功能）
- ✅ 必须有测试验证功能不变
- ✅ 示例：
  - `refactor(agents): extract common agent logic to base class`
  - `refactor(api): improve error handling consistency`

### 4. test - 测试完善
- ✅ 必须新增测试用例（不是简单的配置）
- ✅ 必须提高覆盖率
- ✅ 示例：
  - `test(security): add edge case tests for input validator`
  - `test(e2e): add complete workflow test for PM→Dev→Review`

### 5. perf - 性能优化
- ✅ 必须有性能测试数据
- ✅ 必须包含优化前后的对比
- ✅ 示例：
  - `perf(orchestrator): reduce agent response time by 40%`
  - `perf(llm): implement response streaming for better UX`

---

## ❌ 禁止的 Commit 类型

**以下类型不允许单独 commit：**

### 1. docs - 纯文档更新
- ❌ `docs: update README`
- ❌ `docs: add progress report`
- ❌ `docs: update roadmap`

**如何处理：**
- 文档更新必须和代码一起提交
- 例如：`feat(api): add rate limiting + update API docs`

### 2. chore - 简单配置/进度
- ❌ `chore: update dependencies`
- ❌ `chore: 心跳检查 - XX:XX`
- ❌ `chore: 更新进度`

**如何处理：**
- 配置更新必须和功能一起提交
- 例如：`feat(build): upgrade to Node 20 + update CI config`

### 3. style - 代码格式
- ❌ 单独的格式调整
- ❌ `style: format code`

**如何处理：**
- 格式调整应该在功能开发中顺便完成

---

## 📋 Commit Message 格式

**必须使用以下格式：**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例：**

```
feat(security): implement rate limiting for API endpoints

- Add token bucket algorithm implementation
- Support configurable rate limits per endpoint
- Add Redis-based distributed rate limiting
- Include comprehensive test coverage (95%+)

Technical Details:
- Algorithm: Token Bucket
- Storage: Redis with TTL
- Default: 100 req/min per user

Test Results:
- Unit tests: 12 passed
- Integration tests: 8 passed
- Coverage: 97.3%

Closes #123
```

---

## 🎯 每 2 小时的 Commit 任务

**心跳检查时，选择以下任一任务执行：**

### 任务 A：实现新功能模块（30-60分钟）
1. **选择一个待实现的功能**
   - 从功能列表中选择
   - 或自己构思一个有价值的功能

2. **完整实现**
   - 编写核心代码
   - 添加类型定义
   - 编写单元测试
   - 更新相关文档（和代码一起提交）

3. **专业提交**
   - 使用标准的 commit message
   - 包含测试结果和覆盖率

**示例任务：**
- `feat(metrics): add performance monitoring dashboard`
- `feat(cli): implement interactive CLI for agent configuration`
- `feat(integration): add Slack notification for task completion`

---

### 任务 B：完善已有模块（30-60分钟）
1. **选择一个可改进的模块**
   - 代码质量问题
   - 性能瓶颈
   - 缺少错误处理

2. **优化改进**
   - 重构代码
   - 添加错误处理
   - 优化性能
   - 补充测试

3. **专业提交**
   - 说明改进内容
   - 对比改进前后

**示例任务：**
- `refactor(orchestrator): improve agent coordination efficiency`
- `perf(llm): implement response caching for repeated queries`
- `fix(security): add input validation for all API endpoints`

---

### 任务 C：完善测试用例（30-60分钟）
1. **识别测试缺口**
   - 查看覆盖率报告
   - 找出未测试的边界情况

2. **编写测试**
   - 单元测试
   - 集成测试
   - E2E 测试

3. **专业提交**
   - 说明新增的测试场景
   - 展示覆盖率提升

**示例任务：**
- `test(security): add comprehensive tests for encryption module`
- `test(e2e): add error handling tests for full workflow`
- `test(perf): add performance benchmarks for agent coordination`

---

## 🔍 Commit 检查清单

**每次 commit 前检查：**

- [ ] ✅ 是否包含可运行的代码？
- [ ] ✅ 是否有实际功能或改进？
- [ ] ✅ 是否符合 commit message 格式？
- [ ] ✅ 是否有对应的测试？
- [ ] ✅ 是否不是纯文档/配置更新？
- [ ] ✅ 是否让 repo 看起来更专业？

---

## 📊 专业的 Repo 标准**

  ```bash
  git commit -m "feat(security): implement rate limiting

  - Token bucket algorithm
  - Redis-backed storage
  - 100 req/min default
  
  Tests: 15 passed, 98% coverage"
  ```

- ✅ **持续的代码改进**
  ```bash
  git log --oneline -10
  
  feat(security): implement rate limiting
  refactor(orchestrator): improve agent coordination
  test(e2e): add comprehensive workflow tests
  perf(llm): implement response streaming
  fix(gateway): handle timeout gracefully
  ```

- ✅ **完整的测试覆盖**
  - 每个模块都有测试
  - 覆盖率 > 90%
  - E2E 测试完整

- ✅ **清晰的架构**
  - 模块职责清晰
  - 依赖关系明确
  - 易于理解

---

## 🚀 立即执行

**下次心跳检查时：**

1. 选择任务 A/B/C 中的一个
2. 用 30-60 分钟完成
3. 专业地提交代码
4. 让 repo 持续变得更好

---

**目标：让评委看到这个 repo 后说："这是个专业的项目！"** 🎯

---

*创建时间: 2026-03-20 15:37*
*版本: 1.0*
