# 🎬 Demo 录制检查清单

**录制前（5分钟准备）**

## 1. 启用 Mock 模式
```bash
cd /Users/felixmiao/Projects/ClawCompany/ai-team-demo
echo "USE_MOCK_LLM=true" >> .env.local
```

## 2. 启动开发服务器
```bash
./dev.sh
```

## 3. 打开浏览器
- 访问 http://localhost:3000
- 确认页面加载正常
- 点击 "Start Chatting"
- 确认看到欢迎消息

## 4. 测试 Mock Provider
在 Chat Page 输入：
- "创建一个登录页面" → 应该 <1 秒响应
- "帮我创建一个简单的计算器" → 应该 <1 秒响应

## 5. 准备录制环境
- [ ] 关闭所有通知（手机、电脑）
- [ ] 清理桌面
- [ ] 浏览器全屏（F11）
- [ ] 隐藏书签栏（Cmd+Shift+B）
- [ ] 关闭开发者工具
- [ ] 窗口大小：1920x1080 或 1280x720

---

**录制中（2-3 分钟）**

按照 `docs/DEMO-STORYBOARD.md` 的步骤：

### Landing Page（20秒）
1. 页面加载，等待动画（5秒）
2. 慢慢滚动，展示三个 Agent 卡片（10秒）
3. 点击 "Start Chatting"（5秒）

### Chat Page（60秒）
4. 等待页面加载，看到欢迎消息（5秒）
5. 在输入框输入："创建一个登录页面"（10秒）
6. 点击 "Send"，等待响应（<1 秒，因为 Mock 模式）
7. 展示 PM Agent 的响应（15秒）
8. 右侧任务列表出现，鼠标指向任务（10秒）
9. Dev Agent 和 Review Agent 消息出现（自动，15秒）
10. 慢慢滚动，展示完整对话（10秒）
11. 点击左上角 "← Back"（5秒）

### Demo Page（35秒）
12. 回到首页，点击 "View Demo"（5秒）
13. Demo Page 加载，观看打字动画（15秒）
14. 等待几轮对话完成（10秒）
15. 停留在 Demo Page（5秒）

### GitHub（30秒）
16. 新标签页打开 https://github.com/felix-miao/ClawCompany
17. 滚动 README，展示项目介绍（10秒）
18. 点击 docs/ARCHITECTURE-v2.md，展示架构图（10秒）
19. 切回 Landing Page，结束（5秒）

---

**录制后（5分钟）**

## 1. 关闭 Mock 模式
```bash
# 编辑 .env.local，删除或注释掉：
# USE_MOCK_LLM=true
```

## 2. 重启服务器
```bash
# 停止当前服务器（Ctrl+C）
./dev.sh
```

## 3. 测试真实 API
在 Chat Page 输入一个简单的需求，确认真实 GLM API 正常工作

## 4. 检查视频
- [ ] 视频质量清晰
- [ ] 时长 2-3 分钟
- [ ] 操作流畅，没有卡顿
- [ ] 音频正常（如果有旁白）

## 5. 压缩视频（可选）
- 分辨率：1920x1080 或 1280x720
- 格式：MP4 (H.264)
- 帧率：30fps
- 大小：< 50MB

---

## 💡 录制技巧

### 画面控制
1. **慢** - 所有操作都要慢
2. **稳** - 鼠标不要抖
3. **停** - 关键画面停 3 秒
4. **滑** - 滚动要平滑

### 常见问题
- **Q: Mock 模式下会调用真实 API 吗？**
  A: 不会，完全跳过 API 调用

- **Q: 如果响应很慢怎么办？**
  A: 确认 .env.local 中有 `USE_MOCK_LLM=true`

- **Q: 录制时出现错误怎么办？**
  A: 先停止录制，检查控制台错误，修复后重新开始

---

**准备好了吗？** 开始录制你的 Demo 吧！🎬

**提示：** 先录一遍练手，第二遍正式录。
