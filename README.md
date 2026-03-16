# ClawCompany - AI 虚拟团队协作系统

> **一人企业家 + AI 团队 = 无限可能**

基于 OpenClaw 的 AI 虚拟团队协作平台，让一个人也能像拥有一支完整团队一样工作。

## 🎯 项目简介

ClawCompany 将 OpenClaw 定位为"包工头"（Orchestrator），协调三个智能 Agent 组成虚拟团队：

- **📋 PM Agent** - 需求分析、任务拆分、团队协调（GLM-5）
- **💻 Dev Agent** - 代码实现、功能开发（OpenClaw spawn + GLM-5）
- **🔍 Review Agent** - 代码审查、质量保证（GLM-5）

### 核心创新

1. **OpenClaw 作为包工头** - 利用已有的 spawn、exec、LLM 能力
2. **真实 AI 智能分析** - 不是硬编码，而是 GLM-5 真实调用
3. **Mock 模式支持** - Demo 录制时 <1 秒响应
4. **TDD 开发流程** - 45 个测试用例全部通过

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────┐
│                  用户界面层                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Landing  │  │  Chat    │  │   Demo   │     │
│  │   Page   │  │   Page   │  │   Page   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              OpenClaw Orchestrator              │
│  ┌──────────────────────────────────────────┐  │
│  │  接收需求 → 分配任务 → 协调协作 → 返回结果  │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │   PM    │   │   Dev   │   │ Review  │
   │  Agent  │   │  Agent  │   │  Agent  │
   └─────────┘   └─────────┘   └─────────┘
        ↓             ↓             ↓
   ┌─────────────────────────────────────┐
   │          GLM-5 大语言模型            │
   └─────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/felix-miao/ClawCompany.git
cd ClawCompany
```

### 2. 安装依赖

```bash
cd ai-team-demo
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# GLM API Key（从智谱 AI 获取）
GLM_API_KEY=your_api_key_here
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions

# 可选：启用 Mock 模式（用于 Demo 录制）
# USE_MOCK_LLM=true
```

### 4. 启动开发服务器

```bash
# 使用自动清理端口的启动脚本
./dev.sh

# 或手动启动
npm run dev
```

访问 http://localhost:3000

## 🧪 测试

```bash
npm test              # 运行所有测试
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率报告
```

### 测试统计

- **测试套件**: 7 个
- **测试用例**: 45 个
- **通过率**: 100%
- **测试时间**: 0.5 秒

## 📁 项目结构

```
ClawCompany/
├── ai-team-demo/           # Next.js 应用
│   ├── src/
│   │   ├── app/            # 页面
│   │   │   ├── page.tsx        # Landing Page
│   │   │   ├── chat/           # Chat Page
│   │   │   └── demo/           # Demo Page
│   │   ├── lib/
│   │   │   ├── agents/         # Agent 实现
│   │   │   │   ├── pm-agent.ts
│   │   │   │   ├── dev-agent.ts
│   │   │   │   └── review-agent.ts
│   │   │   ├── llm/            # LLM 提供者
│   │   │   │   ├── glm.ts      # 真实 GLM-5
│   │   │   │   ├── mock.ts     # Mock Provider
│   │   │   │   └── factory.ts
│   │   │   └── orchestrator.ts # 协调器
│   │   └── components/     # React 组件
│   └── dev.sh              # 启动脚本（自动清理端口）
└── docs/                   # 文档
    ├── ARCHITECTURE-v2.md  # 系统架构
    ├── PROJECT-DESCRIPTION.md  # 项目说明书
    ├── POSTER-DESIGN.md    # 海报设计
    ├── DEMO-STORYBOARD.md  # Demo 分镜
    └── TDD-CHECKLIST.md    # TDD 检查清单
```

## 📊 项目统计

- **Commits**: 29
- **代码行数**: ~3650 行（核心代码）
- **开发周期**: 4 天（2026-03-15 至 2026-03-19）
- **技术栈**: Next.js 14 + React 18 + TypeScript + Tailwind + GLM-5

## 🔧 技术栈

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion (动画)
- React Markdown (渲染)

### 后端
- Next.js API Routes
- OpenClaw Orchestrator

### AI
- GLM-5 (智谱 AI)
- OpenClaw Agent 编排

### 开发工具
- Jest (测试)
- Git (版本控制)
- GitHub (代码托管)

## 📖 文档

- [系统架构](./docs/ARCHITECTURE-v2.md) - 新架构设计
- [项目说明书](./docs/PROJECT-DESCRIPTION.md) - 10 页 PDF 框架
- [海报设计](./docs/POSTER-DESIGN.md) - 海报设计指南
- [Demo 分镜](./docs/DEMO-STORYBOARD.md) - 录制脚本
- [TDD 检查清单](./docs/TDD-CHECKLIST.md) - 测试规范

## 🗺️ 路线图

### Phase 1: 基础架构 ✅
- [x] OpenClaw Orchestrator
- [x] PM/Dev/Review Agent
- [x] GLM-5 集成
- [x] Mock Provider
- [x] Web UI (Landing + Chat + Demo)

### Phase 2: Demo & 提交 🚧
- [ ] Demo 视频录制
- [ ] 项目说明书 PDF
- [ ] 项目海报

### Phase 3: 增强 Agent 能力
- [ ] OpenCode/Codex 真实代码生成
- [ ] 文件系统共享
- [ ] 多项目管理

## 📄 License

MIT

---

**Built with ❤️ for OpenClaw 龙虾大赛 2026**
