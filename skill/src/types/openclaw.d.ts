/**
 * OpenClaw 类型声明
 * 
 * 这些工具在 OpenClaw 环境中全局可用
 */

declare module 'openclaw' {
  export interface SpawnOptions {
    runtime?: 'subagent' | 'acp'
    task: string
    thinking?: 'low' | 'medium' | 'high'
    mode?: 'run' | 'session'
    model?: string
    agentId?: string
    cwd?: string
  }

  export interface SessionResult {
    sessionKey: string
    status: 'running' | 'completed' | 'failed'
  }

  export interface HistoryOptions {
    sessionKey: string
    limit?: number
    includeTools?: boolean
  }

  export interface HistoryResult {
    messages: Array<{
      role: string
      content: string
    }>
  }

  export function sessions_spawn(options: SpawnOptions): Promise<SessionResult>
  export function sessions_history(options: HistoryOptions): Promise<HistoryResult>
  export function sessions_send(options: { sessionKey: string; message: string }): Promise<void>
  export function sessions_yield(options?: { message?: string }): Promise<void>
}
