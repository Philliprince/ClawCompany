import { NextRequest } from 'next/server'

import { orchestrator } from '@/lib/orchestrator'
import { withRateLimit, withErrorHandling, successResponse, errorResponse } from '@/lib/api/route-utils'

export const POST = withRateLimit(async (request: NextRequest) => {
  const body = await request.json()
  const userMessage = body.message

  if (!userMessage) {
    return errorResponse({ error: '消息不能为空' }, 400)
  }

  const result = await orchestrator.executeUserRequest(userMessage)

  return successResponse({
    message: result.messages[result.messages.length - 1]?.content,
    tasks: result.tasks,
    chatHistory: result.messages,
    files: result.files,
  }, request)
}, 'Chat API')

export const GET = withErrorHandling(async () => {
  const status = orchestrator.getStatus()

  return successResponse({
    tasks: status.tasks,
    chatHistory: status.messages,
    stats: status.stats,
    agents: [
      { id: 'pm-agent-1', name: 'PM Claw', role: 'pm', description: '负责需求分析、任务拆分和团队协调' },
      { id: 'dev-agent-1', name: 'Dev Claw', role: 'dev', description: '负责代码实现和功能开发' },
      { id: 'review-agent-1', name: 'Reviewer Claw', role: 'review', description: '负责代码审查和质量保证' },
    ],
  })
}, 'Chat Status API')
