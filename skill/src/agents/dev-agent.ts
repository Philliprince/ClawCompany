/**
 * Dev Agent (开发者)
 * 
 * 职责：实现功能、生成代码、确保可运行
 * 
 * 注意：sessions_spawn, sessions_history 是 OpenClaw 的内置工具，
 * 在 OpenClaw 环境中全局可用，无需导入。
 */

import type { Task, DevResult } from '../orchestrator'

// 声明 OpenClaw 全局工具（用于类型检查）
declare const sessions_spawn: typeof import('openclaw').sessions_spawn
declare const sessions_history: typeof import('openclaw').sessions_history

export interface DevAgentConfig {
  runtime?: 'acp' | 'subagent'
  agentId?: string
  thinking?: 'low' | 'medium' | 'high'
}

export class DevAgent {
  private config: DevAgentConfig

  constructor(config: DevAgentConfig = {}) {
    this.config = {
      runtime: 'acp',
      agentId: 'opencode',
      thinking: 'medium',
      ...config
    }
  }

  /**
   * 执行开发任务
   */
  async execute(task: Task, projectPath: string): Promise<DevResult> {
    const prompt = this.buildPrompt(task)
    
    try {
      // 尝试使用 ACP runtime (真实编码代理)
      if (this.config.runtime === 'acp') {
        const session = await sessions_spawn({
          runtime: 'acp',
          agentId: this.config.agentId || 'opencode',
          task: prompt,
          mode: 'run',
          cwd: projectPath
        })
        return await this.parseResult(session)
      }
    } catch (error) {
      console.log('⚠ ACP runtime 不可用，切换到 subagent')
    }

    // Fallback to subagent
    const session = await sessions_spawn({
      runtime: 'subagent',
      task: prompt,
      thinking: this.config.thinking,
      mode: 'run'
    })
    
    return await this.parseResult(session)
  }

  /**
   * 构建 Dev Agent prompt
   */
  private buildPrompt(task: Task): string {
    return `你是 Dev Agent (开发者)。

任务：${task.title}
描述：${task.description}

你的职责：
1. 理解任务需求
2. 设计技术方案
3. 实现/修改代码文件
4. 确保代码可运行

技术要求：
- 使用 TypeScript
- 遵循最佳实践
- 添加必要的注释
- 考虑错误处理
- 保持代码简洁

完成后返回 JSON:
{
  "success": true,
  "files": ["创建/修改的文件路径"],
  "summary": "实现总结"
}

注意：只返回 JSON。`
  }

  /**
   * 解析 Dev Agent 结果
   */
  private async parseResult(session: any): Promise<DevResult> {
    try {
      const history = await sessions_history({ sessionKey: session.sessionKey })
      const lastMessage = history.messages?.[history.messages.length - 1]
      
      if (lastMessage?.content) {
        const content = lastMessage.content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (error) {
      console.error('❌ 解析 Dev 结果失败:', error)
    }
    
    return {
      success: true,
      files: [],
      summary: '任务完成'
    }
  }
}

/**
 * 便捷函数：执行开发任务
 */
export async function executeTask(
  task: Task,
  projectPath: string,
  config?: DevAgentConfig
): Promise<DevResult> {
  const agent = new DevAgent(config)
  return await agent.execute(task, projectPath)
}
