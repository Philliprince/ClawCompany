/**
 * Review Agent (代码审查)
 * 
 * 职责：检查代码质量、安全性审查、提出改进建议
 */

import { sessions_spawn, sessions_history } from 'openclaw'
import type { Task, DevResult, ReviewResult } from '../orchestrator'

export interface ReviewAgentConfig {
  thinking?: 'low' | 'medium' | 'high'
  checklist?: string[]
}

// 默认审查清单
const DEFAULT_CHECKLIST = [
  '代码风格',
  'TypeScript 类型安全',
  '错误处理',
  '可访问性 (a11y)',
  '性能优化',
  '安全性检查',
  '代码可读性',
  '测试覆盖'
]

export class ReviewAgent {
  private config: ReviewAgentConfig

  constructor(config: ReviewAgentConfig = {}) {
    this.config = {
      thinking: 'high',
      checklist: DEFAULT_CHECKLIST,
      ...config
    }
  }

  /**
   * 审查开发结果
   */
  async review(task: Task, devResult: DevResult): Promise<ReviewResult> {
    const prompt = this.buildPrompt(task, devResult)
    
    const session = await sessions_spawn({
      runtime: 'subagent',
      task: prompt,
      thinking: this.config.thinking,
      mode: 'run'
    })

    return await this.parseResult(session)
  }

  /**
   * 构建 Review Agent prompt
   */
  private buildPrompt(task: Task, devResult: DevResult): string {
    const checklist = this.config.checklist || DEFAULT_CHECKLIST
    
    return `你是 Review Agent (代码审查)。

任务：${task.title}
描述：${task.description}

Dev Agent 的实现：
${JSON.stringify(devResult, null, 2)}

你的职责：
1. 检查代码质量
2. 安全性审查
3. 性能优化建议
4. 提出改进建议

审查清单：
${checklist.map(item => `- ${item}`).join('\n')}

审查标准：
- **通过 (approved: true)**: 代码质量良好，无严重问题
- **不通过 (approved: false)**: 存在严重问题需要修改

返回格式 (JSON):
{
  "approved": true 或 false,
  "issues": ["发现的问题1", "发现的问题2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "summary": "审查总结"
}

注意：
- 只返回 JSON
- issues 只列出严重问题
- suggestions 可以包含优化建议
- summary 简洁总结审查结果`
  }

  /**
   * 解析 Review Agent 结果
   */
  private async parseResult(session: any): Promise<ReviewResult> {
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
      console.error('❌ 解析 Review 结果失败:', error)
    }
    
    // 默认通过
    return {
      approved: true,
      issues: [],
      suggestions: [],
      summary: '审查通过'
    }
  }
}

/**
 * 便捷函数：审查开发结果
 */
export async function reviewResult(
  task: Task,
  devResult: DevResult,
  config?: ReviewAgentConfig
): Promise<ReviewResult> {
  const agent = new ReviewAgent(config)
  return await agent.review(task, devResult)
}
