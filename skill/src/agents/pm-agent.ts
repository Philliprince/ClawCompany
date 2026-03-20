/**
 * PM Agent (产品经理)
 * 
 * 职责：分析需求、拆分任务、协调团队
 * 
 * 注意：sessions_spawn, sessions_history 是 OpenClaw 的内置工具，
 * 在 OpenClaw 环境中全局可用，无需导入。
 */

import type { Task, PMResult } from '../orchestrator'

// 声明 OpenClaw 全局工具（用于类型检查）
declare const sessions_spawn: typeof import('openclaw').sessions_spawn
declare const sessions_history: typeof import('openclaw').sessions_history

export interface PMAgentConfig {
  thinking?: 'low' | 'medium' | 'high'
  model?: string
}

export class PMAgent {
  private config: PMAgentConfig

  constructor(config: PMAgentConfig = {}) {
    this.config = {
      thinking: 'high',
      model: 'glm-5',
      ...config
    }
  }

  /**
   * 分析用户需求并拆分任务
   */
  async analyze(userRequest: string): Promise<PMResult> {
    const prompt = this.buildPrompt(userRequest)
    
    const session = await sessions_spawn({
      runtime: 'subagent',
      task: prompt,
      thinking: this.config.thinking,
      mode: 'run',
      model: this.config.model
    })

    return await this.parseResult(session)
  }

  /**
   * 构建 PM Agent prompt
   */
  private buildPrompt(userRequest: string): string {
    return `你是 PM Agent (产品经理)。

用户需求：${userRequest}

你的职责：
1. 分析用户需求，理解核心功能
2. 拆分成可执行的子任务（2-5 个）
3. 为每个任务指定负责人 (dev)
4. 设置任务依赖关系

任务拆分原则：
- 每个任务应该独立可完成
- 任务粒度适中（不要太细也不要太粗）
- 考虑依赖关系（先完成依赖项）

返回格式 (JSON):
{
  "analysis": "需求分析，包括核心功能和技术要点...",
  "tasks": [
    {
      "id": "task-1",
      "title": "任务标题",
      "description": "详细的任务描述",
      "assignedTo": "dev",
      "dependencies": [],
      "status": "pending"
    }
  ]
}

注意：只返回 JSON，不要有其他内容。`
  }

  /**
   * 解析 PM Agent 结果
   */
  private async parseResult(session: any): Promise<PMResult> {
    try {
      const history = await sessions_history({ sessionKey: session.sessionKey })
      const lastMessage = history.messages?.[history.messages.length - 1]
      
      if (lastMessage?.content) {
        const content = lastMessage.content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          // 确保所有任务都有正确的状态
          result.tasks = result.tasks.map((task: any) => ({
            ...task,
            status: task.status || 'pending'
          }))
          return result
        }
      }
    } catch (error) {
      console.error('❌ 解析 PM 结果失败:', error)
    }
    
    // 返回默认任务
    return {
      analysis: '自动生成的任务分解',
      tasks: [{
        id: 'task-1',
        title: '实现用户需求',
        description: '根据用户需求实现核心功能',
        assignedTo: 'dev',
        dependencies: [],
        status: 'pending'
      }]
    }
  }
}

/**
 * 便捷函数：分析需求
 */
export async function analyzeRequest(
  userRequest: string,
  config?: PMAgentConfig
): Promise<PMResult> {
  const agent = new PMAgent(config)
  return await agent.analyze(userRequest)
}
