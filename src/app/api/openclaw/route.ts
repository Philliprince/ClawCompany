import { NextRequest } from 'next/server'

import { withAuth, withRateLimit, successResponse, errorResponse } from '@/lib/api/route-utils'
import { InputValidator } from '@/lib/security/utils'

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

const POLL_MAX_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

function gatewayHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (OPENCLAW_GATEWAY_TOKEN) {
    headers['Authorization'] = `Bearer ${OPENCLAW_GATEWAY_TOKEN}`
  }
  return headers
}

export const POST = withAuth(withRateLimit(async (request: NextRequest) => {
  const body = await request.json()
  const { action, userRequest } = body

  if (action !== 'orchestrate') {
    return errorResponse('Invalid action', 400)
  }

  if (!userRequest || typeof userRequest !== 'string') {
    return errorResponse('User request is required', 400)
  }

  const sanitizedRequest = InputValidator.sanitize(userRequest)

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: gatewayHeaders(),
      body: JSON.stringify({
        tool: 'sessions_spawn',
        args: { task: sanitizedRequest, mode: 'run' },
        sessionKey: 'main',
      }),
    })

    if (!response.ok) {
      return errorResponse(`Gateway request failed: ${response.status}`, 500)
    }

    const data = await response.json()
    const sessionKey = data.result?.sessionKey ?? data.result
    console.log('[OpenClaw API] Session spawned:', sessionKey)

    const result = await pollForResult(sessionKey)

    return successResponse({
      messages: result.messages,
      sessionKey,
    }, request)
  } catch (error) {
    return errorResponse(error, 500, 'OpenClaw API')
  }
}, 'OpenClaw API'))

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/status`)

    if (!response.ok) {
      return successResponse({
        connected: false,
        error: `Gateway returned ${response.status}`,
      })
    }

    const data = await response.json()

    return successResponse({ connected: true, gateway: data })
  } catch (error) {
    return successResponse({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}, 'OpenClaw Status API')

async function pollForResult(sessionKey: string): Promise<{ messages: Array<{ agent: string; content: string; timestamp: string }> }> {
  const MAX_CONSECUTIVE_ERRORS = 5
  let consecutiveErrors = 0
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    try {
      const response = await fetch(`${OPENCLAW_GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: gatewayHeaders(),
        body: JSON.stringify({
          tool: 'sessions_history',
          args: { sessionKey, limit: 10 },
          sessionKey: 'main',
        }),
      })

      if (!response.ok) {
        throw new Error(`History fetch error: ${response.status}`)
      }

      consecutiveErrors = 0
      const data = await response.json()
      const history = data.result

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
      consecutiveErrors++
      console.error('[OpenClaw API] Poll error:', error)
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`Polling aborted after ${MAX_CONSECUTIVE_ERRORS} consecutive errors: ${error instanceof Error ? error.message : String(error)}`)
      }
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }

  throw new Error('Polling timeout')
}
