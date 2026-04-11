/**
 * OpenClawBridgeTool 单元测试
 *
 * 覆盖：
 * - OpenClawBridgeTool.execute：成功调用
 * - OpenClawBridgeTool.execute：客户端未连接时自动重连
 * - OpenClawBridgeTool.execute：connect 失败
 * - OpenClawBridgeTool.execute：call 抛异常
 * - OpenClawBridgeTool.execute：远端返回 error
 * - OpenClawBridgeTool.formatResult：各种情况
 * - createOpenClawExecTool：基本属性验证
 * - createOpenClawReadTool：基本属性验证
 * - createOpenClawWriteTool：基本属性验证
 * - createOpenClawSearchTool：基本属性验证
 * - 工厂工具 execute 转发给 bridge
 */

import {
  OpenClawBridgeTool,
  createOpenClawExecTool,
  createOpenClawReadTool,
  createOpenClawWriteTool,
  createOpenClawSearchTool,
  BridgeInput,
} from '../openclaw-bridge'
import { OpenClawGatewayClient } from '../../gateway/client'

// ---------------------------------------------------------------------------
// 辅助：构造 mock client
// ---------------------------------------------------------------------------

function makeMockClient(overrides?: Partial<Pick<OpenClawGatewayClient, 'isConnected' | 'connect' | 'call'>>) {
  return {
    isConnected: jest.fn().mockReturnValue(true),
    connect: jest.fn().mockResolvedValue(undefined),
    call: jest.fn().mockResolvedValue({ success: true, data: 'ok' }),
    ...overrides,
  } as unknown as OpenClawGatewayClient
}

// ---------------------------------------------------------------------------
// OpenClawBridgeTool
// ---------------------------------------------------------------------------

describe('OpenClawBridgeTool', () => {
  describe('metadata', () => {
    it('should have name "openclaw_bridge"', () => {
      const client = makeMockClient()
      const tool = new OpenClawBridgeTool(client)
      expect(tool.name).toBe('openclaw_bridge')
    })

    it('should have non-empty description', () => {
      const client = makeMockClient()
      const tool = new OpenClawBridgeTool(client)
      expect(tool.description.length).toBeGreaterThan(10)
    })

    it('should require tool and params in schema', () => {
      const client = makeMockClient()
      const tool = new OpenClawBridgeTool(client)
      expect(tool.parameters.required).toContain('tool')
      expect(tool.parameters.required).toContain('params')
    })
  })

  describe('execute', () => {
    it('should call client.call with tool.invoke and return success', async () => {
      const callMock = jest.fn().mockResolvedValue({
        success: true,
        data: { result: 'file content' },
      })
      const client = makeMockClient({ call: callMock })
      const tool = new OpenClawBridgeTool(client)

      const input: BridgeInput = { tool: 'read', params: { path: '/tmp/test.txt' } }
      const result = await tool.execute(input)

      expect(result.success).toBe(true)
      expect(result.data?.raw).toEqual({ result: 'file content' })
      expect(callMock).toHaveBeenCalledWith('tool.invoke', {
        tool: 'read',
        input: { path: '/tmp/test.txt' },
      })
    })

    it('should auto-connect when client is not connected', async () => {
      const connectMock = jest.fn().mockResolvedValue(undefined)
      const callMock = jest.fn().mockResolvedValue({ success: true, data: 'pong' })
      const client = makeMockClient({
        isConnected: jest.fn().mockReturnValue(false),
        connect: connectMock,
        call: callMock,
      })
      const tool = new OpenClawBridgeTool(client)

      const result = await tool.execute({ tool: 'exec', params: { command: 'echo hi' } })

      expect(connectMock).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
    })

    it('should return failure when connect throws', async () => {
      const client = makeMockClient({
        isConnected: jest.fn().mockReturnValue(false),
        connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      })
      const tool = new OpenClawBridgeTool(client)

      const result = await tool.execute({ tool: 'exec', params: {} })

      expect(result.success).toBe(false)
      expect(result.error).toContain('ECONNREFUSED')
    })

    it('should propagate remote error', async () => {
      const client = makeMockClient({
        call: jest.fn().mockResolvedValue({
          success: false,
          error: 'Permission denied',
        }),
      })
      const tool = new OpenClawBridgeTool(client)

      const result = await tool.execute({ tool: 'write', params: { path: '/etc/passwd', content: '' } })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })

    it('should handle call() throwing an exception', async () => {
      const client = makeMockClient({
        call: jest.fn().mockRejectedValue(new Error('WebSocket disconnected')),
      })
      const tool = new OpenClawBridgeTool(client)

      const result = await tool.execute({ tool: 'web_search', params: { query: 'test' } })

      expect(result.success).toBe(false)
      expect(result.error).toContain('WebSocket disconnected')
    })

    it('should include durationMs in result', async () => {
      const client = makeMockClient()
      const tool = new OpenClawBridgeTool(client)

      const result = await tool.execute({ tool: 'exec', params: { command: 'ls' } })

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('formatResult', () => {
    let tool: OpenClawBridgeTool

    beforeEach(() => {
      tool = new OpenClawBridgeTool(makeMockClient())
    })

    it('should return raw string directly when raw is a string', () => {
      const result = {
        success: true,
        data: { raw: 'file contents here' },
      }
      expect(tool.formatResult(result)).toBe('file contents here')
    })

    it('should JSON-stringify non-string raw values', () => {
      const result = {
        success: true,
        data: { raw: { key: 'value', count: 42 } },
      }
      const formatted = tool.formatResult(result)
      expect(formatted).toContain('"key"')
      expect(formatted).toContain('"value"')
    })

    it('should return error message when success is false', () => {
      const result = {
        success: false,
        error: 'Network error',
        data: undefined,
      }
      expect(tool.formatResult(result)).toContain('Network error')
      expect(tool.formatResult(result)).toContain('openclaw_bridge error')
    })

    it('should return error message when data is undefined', () => {
      const result = {
        success: true,
        data: undefined,
        error: 'No data',
      }
      expect(tool.formatResult(result)).toContain('openclaw_bridge error')
    })
  })
})

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

describe('createOpenClawExecTool', () => {
  it('should create a tool named oc_exec', () => {
    const tool = createOpenClawExecTool(makeMockClient())
    expect(tool.name).toBe('oc_exec')
  })

  it('should have command in required params', () => {
    const tool = createOpenClawExecTool(makeMockClient())
    expect(tool.parameters.required).toContain('command')
  })

  it('should forward execute to the bridge with tool=exec', async () => {
    const callMock = jest.fn().mockResolvedValue({ success: true, data: 'stdout output' })
    const client = makeMockClient({ call: callMock })
    const tool = createOpenClawExecTool(client)

    await tool.execute({ command: 'echo hello' } as Record<string, unknown>)

    expect(callMock).toHaveBeenCalledWith('tool.invoke', expect.objectContaining({ tool: 'exec' }))
  })
})

describe('createOpenClawReadTool', () => {
  it('should create a tool named oc_read', () => {
    const tool = createOpenClawReadTool(makeMockClient())
    expect(tool.name).toBe('oc_read')
  })

  it('should have path in required params', () => {
    const tool = createOpenClawReadTool(makeMockClient())
    expect(tool.parameters.required).toContain('path')
  })

  it('should forward execute to bridge with tool=read', async () => {
    const callMock = jest.fn().mockResolvedValue({ success: true, data: 'content' })
    const client = makeMockClient({ call: callMock })
    const tool = createOpenClawReadTool(client)

    await tool.execute({ path: '/etc/hosts' } as Record<string, unknown>)

    expect(callMock).toHaveBeenCalledWith('tool.invoke', expect.objectContaining({ tool: 'read' }))
  })
})

describe('createOpenClawWriteTool', () => {
  it('should create a tool named oc_write', () => {
    const tool = createOpenClawWriteTool(makeMockClient())
    expect(tool.name).toBe('oc_write')
  })

  it('should have path and content in required params', () => {
    const tool = createOpenClawWriteTool(makeMockClient())
    expect(tool.parameters.required).toContain('path')
    expect(tool.parameters.required).toContain('content')
  })
})

describe('createOpenClawSearchTool', () => {
  it('should create a tool named oc_web_search', () => {
    const tool = createOpenClawSearchTool(makeMockClient())
    expect(tool.name).toBe('oc_web_search')
  })

  it('should have query in required params', () => {
    const tool = createOpenClawSearchTool(makeMockClient())
    expect(tool.parameters.required).toContain('query')
  })

  it('should forward execute to bridge with tool=web_search', async () => {
    const callMock = jest.fn().mockResolvedValue({ success: true, data: [] })
    const client = makeMockClient({ call: callMock })
    const tool = createOpenClawSearchTool(client)

    await tool.execute({ query: 'TypeScript jest' } as Record<string, unknown>)

    expect(callMock).toHaveBeenCalledWith(
      'tool.invoke',
      expect.objectContaining({ tool: 'web_search' }),
    )
  })
})
