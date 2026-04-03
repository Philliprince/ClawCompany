import { NextRequest } from 'next/server'

import { withRateLimit, withErrorHandling, successResponse, errorResponse } from '@/lib/api/route-utils'
import { InputValidator } from '@/lib/security/utils'

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'

const POLL_MAX_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

export const POST = withRateLimit(async (request: NextRequest) => {
  const body = await request.json()
  const { action, userRequest } = body

  if (action !== 'orchestrate') {
    return errorResponse('Invalid action. Supported: orchestrate', 400)
  }

  const validation = InputValidator.validateMessage(userRequest || '')
  if (!validation.valid) {
    return errorResponse(validation.error || 'userRequest is required', 400)
  }

  console.log('[OpenClaw API] Starting orchestration for:', userRequest)

  const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/sessions/spawn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runtime: 'subagent',
      task: `你是 PM Claw (产品经理)。\n\n用户需求：${userRequest}\n\n请分析需求并给出专业回复。使用 Markdown 格式。`,
      thinking: 'high',
      mode: 'run',
      runTimeoutSeconds: 60,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenClaw Gateway error: ${response.status}`)
  }

  const data = await response.json()
  console.log('[OpenClaw API] Session spawned:', data.sessionKey)

  const result = await pollForResult(data.sessionKey)

  return successResponse({
    messages: result.messages,
    sessionKey: data.sessionKey,
  }, request)
}, 'OpenClaw API')

async function pollForResult(sessionKey: string): Promise<{ messages: Array<{ agent: string; content: string; timestamp: string }> }> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    try {
      const response = await fetch(
        `${OPENCLAW_GATEWAY_URL}/api/sessions/history?sessionKey=${sessionKey}&limit=10`,
      )

      if (!response.ok) {
        throw new Error(`History fetch error: ${response.status}`)
      }

      const history = await response.json()

      if (history && history.length > 0) {
        const lastMessage = history[0]

        if (lastMessage.status === 'completed') {
          return {
            messages: [{
              agent: 'pm',
              content: lastMessage.content,
              timestamp: new Date().toISOString(),
            }],
          }
        }

        if (lastMessage.status === 'failed') {
          throw new Error(`Session failed: ${lastMessage.content}`)
        }
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    } catch (error) {
      console.error('[OpenClaw API] Poll error:', error)
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  throw new Error('Timeout waiting for session completion')
}

export const GET = withErrorHandling(async () => {
  const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    return successResponse({
      connected: false,
      error: `Gateway returned ${response.status}`,
    })
  }

  const data = await response.json()

  return successResponse({ connected: true, gateway: data })
}, 'OpenClaw Status API')
