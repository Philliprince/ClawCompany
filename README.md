# ClawCompany - AI 虚拟团队协作系统

基于 OpenClaw multi-agent 架构的 AI 虚拟团队协作系统。

## 项目状态

**当前阶段**: 🚧 开发阶段（Phase 4 功能开发中）

### P0 虚拟办公室重构 ✅ 已完成 (100%)

- ✅ 去掉重力物理
- ✅ 角色尺寸放大（32x32 → 64x64）
- ✅ 美术资源（Tiny Town + Tiny Dungeon, CC0）
- ✅ 角色精灵系统
- ✅ 地图生成器
- ✅ 任务流转系统
- ✅ 状态可视化增强

## 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **游戏引擎**: Phaser 3
- **AI 模型**: GLM-5
- **架构**: OpenClaw 原生 multi-agent

## 快速开始

```bash
# 安装依赖
cd ai-team-demo
npm install

# 运行开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

## 项目结构

```
ClawCompany/
├── ai-team-demo/      # Next.js 应用
│   ├── src/
│   │   ├── game/      # Phaser 游戏引擎
│   │   ├── lib/       # 核心库
│   │   └── app/       # Next.js 路由
│   └── public/        # 静态资源
├── skill/             # OpenClaw Skill
├── docs/              # 文档
├── memory/            # 开发日志
└── scripts/           # 工具脚本
```

## Multi-Agent 架构

- **sidekick** - 消息路由器
- **pm** - 项目经理
- **developer** - 开发工程师
- **tester** - 测试工程师
- **reviewer** - 审核官

## 测试

- 测试套件: 170 个
- 测试用例: 3414 个
- 覆盖率: 85%+

## 许可证

MIT

## 相关资源

- [OpenClaw 文档](https://docs.openclaw.ai)
- [Kenney.nl 美术资源](https://kenney.nl) (CC0)
