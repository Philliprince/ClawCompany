/**
 * VerifyTool 单元测试
 *
 * 覆盖：
 * - stripTypeScriptSyntax（通过 language: 'typescript' 间接触发）
 * - runInSandbox：正常执行、超时、运行时错误
 * - execute 模式一：testCases + functionName
 * - execute 模式二：testCases 无 functionName（自动推断）
 * - execute 模式三：直接执行代码
 * - execute：TypeScript 代码剥离类型注解
 * - execute：testCases 为 JSON 字符串
 * - execute：testCases JSON 解析失败
 * - formatResult：直接执行结果格式化
 * - formatResult：测试用例结果格式化
 * - formatResult：错误结果格式化
 */

import { VerifyTool, VerifyInput, VerifyOutput } from '../verify-tool'
import { ToolResult } from '../types'

describe('VerifyTool', () => {
  let tool: VerifyTool

  beforeEach(() => {
    tool = new VerifyTool()
  })

  // ---------------------------------------------------------------------------
  // 基本属性
  // ---------------------------------------------------------------------------

  describe('metadata', () => {
    it('should have name "verify"', () => {
      expect(tool.name).toBe('verify')
    })

    it('should have a non-empty description', () => {
      expect(tool.description.length).toBeGreaterThan(10)
    })

    it('should have correct parameter schema', () => {
      expect(tool.parameters.type).toBe('object')
      expect(tool.parameters.required).toContain('code')
      expect(tool.parameters.properties.code).toBeDefined()
      expect(tool.parameters.properties.functionName).toBeDefined()
      expect(tool.parameters.properties.testCases).toBeDefined()
      expect(tool.parameters.properties.timeoutMs).toBeDefined()
      expect(tool.parameters.properties.language).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // 模式三：直接执行代码
  // ---------------------------------------------------------------------------

  describe('execute – direct execution mode', () => {
    it('should execute simple arithmetic and return result', async () => {
      const input: VerifyInput = { code: '1 + 2' }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.executionResult?.value).toBe(3)
      expect(result.data?.summary.total).toBe(1)
      expect(result.data?.summary.passed).toBe(1)
      expect(result.data?.summary.failed).toBe(0)
    })

    it('should capture console.log output', async () => {
      const input: VerifyInput = { code: 'console.log("hello"); 42' }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.executionResult?.stdout).toContain('"hello"')
    })

    it('should catch runtime errors and return failure', async () => {
      const input: VerifyInput = { code: 'undefined_variable.toString()' }
      const result = await tool.execute(input)
      expect(result.success).toBe(false)
      expect(result.data?.executionResult?.error).toBeTruthy()
      expect(result.data?.summary.failed).toBe(1)
    })

    it('should respect timeout and fail on infinite loop', async () => {
      const input: VerifyInput = {
        code: 'while(true){}',
        timeoutMs: 100,
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(false)
      expect(result.data?.executionResult?.error).toMatch(/timed out|Script execution timed out/i)
    }, 5000)

    it('should execute code with Math and Array globals', async () => {
      const input: VerifyInput = {
        code: 'Math.max(...[3, 1, 4, 1, 5, 9])',
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.executionResult?.value).toBe(9)
    })

    it('should block access to require', async () => {
      const input: VerifyInput = { code: 'typeof require' }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      // require is undefined in sandbox
      expect(result.data?.executionResult?.value).toBe('undefined')
    })
  })

  // ---------------------------------------------------------------------------
  // 模式一：testCases + functionName
  // ---------------------------------------------------------------------------

  describe('execute – testCases with functionName', () => {
    it('should run all test cases and pass when outputs match', async () => {
      const input: VerifyInput = {
        code: 'function add(a, b) { return a + b; }',
        functionName: 'add',
        testCases: [
          { input: [1, 2], expected: 3, description: 'add(1,2)' },
          { input: [0, 0], expected: 0, description: 'add(0,0)' },
          { input: [-1, 1], expected: 0, description: 'add(-1,1)' },
        ],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.summary.passed).toBe(3)
      expect(result.data?.summary.failed).toBe(0)
      expect(result.data?.testResults).toHaveLength(3)
    })

    it('should report failed cases when output does not match', async () => {
      const input: VerifyInput = {
        code: 'function multiply(a, b) { return a * b; }',
        functionName: 'multiply',
        testCases: [
          { input: [2, 3], expected: 6 },
          { input: [2, 3], expected: 99, description: 'intentionally wrong expected' },
        ],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(false)
      expect(result.data?.summary.passed).toBe(1)
      expect(result.data?.summary.failed).toBe(1)
    })

    it('should report error when function throws', async () => {
      const input: VerifyInput = {
        code: 'function boom() { throw new Error("kaboom"); }',
        functionName: 'boom',
        testCases: [{ input: [], expected: null }],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(false)
      expect(result.data?.testResults?.[0].error).toBeTruthy()
    })

    it('should deep-compare objects via JSON.stringify', async () => {
      const input: VerifyInput = {
        code: 'function wrap(x) { return { value: x }; }',
        functionName: 'wrap',
        testCases: [{ input: [42], expected: { value: 42 } }],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.summary.passed).toBe(1)
    })

    it('should include description from test case', async () => {
      const input: VerifyInput = {
        code: 'function noop(x) { return x; }',
        functionName: 'noop',
        testCases: [{ input: ['hello'], expected: 'hello', description: 'identity test' }],
      }
      const result = await tool.execute(input)
      expect(result.data?.testResults?.[0].description).toBe('identity test')
    })
  })

  // ---------------------------------------------------------------------------
  // 模式二：testCases 无 functionName（自动推断）
  // ---------------------------------------------------------------------------

  describe('execute – testCases without functionName (infer)', () => {
    it('should infer function name from function declaration', async () => {
      const input: VerifyInput = {
        code: 'function square(n) { return n * n; }',
        testCases: [
          { input: [3], expected: 9 },
          { input: [5], expected: 25 },
        ],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.summary.passed).toBe(2)
    })

    it('should infer function name from const arrow function', async () => {
      const input: VerifyInput = {
        code: 'const double = (n) => n * 2;',
        testCases: [{ input: [4], expected: 8 }],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // TypeScript 代码（剥离类型注解）
  // ---------------------------------------------------------------------------

  describe('execute – TypeScript stripping', () => {
    it('should strip type annotations and execute', async () => {
      const input: VerifyInput = {
        code: 'function greet(name: string): string { return "Hello " + name; }',
        language: 'typescript',
        functionName: 'greet',
        testCases: [{ input: ['World'], expected: 'Hello World' }],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.summary.passed).toBe(1)
    })

    it('should handle export keyword stripping', async () => {
      // Use a function with no typed params (avoids param-stripping ambiguity)
      // and a typed return annotation to confirm TS stripping works
      const input: VerifyInput = {
        code: 'export function greet(): string { return "hello"; }',
        language: 'typescript',
        functionName: 'greet',
        testCases: [{ input: [], expected: 'hello' }],
      }
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // testCases 作为 JSON 字符串
  // ---------------------------------------------------------------------------

  describe('execute – testCases as JSON string', () => {
    it('should parse testCases when provided as JSON string', async () => {
      const input = {
        code: 'function inc(n) { return n + 1; }',
        functionName: 'inc',
        testCases: JSON.stringify([{ input: [1], expected: 2, description: 'inc(1)' }]),
      } as unknown as VerifyInput
      const result = await tool.execute(input)
      expect(result.success).toBe(true)
      expect(result.data?.summary.passed).toBe(1)
    })

    it('should return failure when testCases JSON is invalid', async () => {
      const input = {
        code: 'function inc(n) { return n + 1; }',
        functionName: 'inc',
        testCases: 'not-valid-json{{{',
      } as unknown as VerifyInput
      const result = await tool.execute(input)
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/testCases/)
    })
  })

  // ---------------------------------------------------------------------------
  // formatResult
  // ---------------------------------------------------------------------------

  describe('formatResult', () => {
    it('should format successful direct execution result', () => {
      const result: ToolResult<VerifyOutput> = {
        success: true,
        data: {
          executionResult: {
            value: 42,
            stdout: [],
            durationMs: 5,
          },
          summary: { total: 1, passed: 1, failed: 0 },
        },
        durationMs: 5,
      }
      const formatted = tool.formatResult(result)
      expect(formatted).toContain('42')
      expect(formatted).toContain('✅')
    })

    it('should format failed direct execution result', () => {
      const result: ToolResult<VerifyOutput> = {
        success: false,
        data: {
          executionResult: {
            value: undefined,
            stdout: [],
            error: 'ReferenceError: x is not defined',
            durationMs: 2,
          },
          summary: { total: 1, passed: 0, failed: 1 },
        },
        durationMs: 2,
      }
      const formatted = tool.formatResult(result)
      expect(formatted).toContain('❌')
      expect(formatted).toContain('ReferenceError')
    })

    it('should format test case results with pass/fail icons', async () => {
      const input: VerifyInput = {
        code: 'function add(a, b) { return a + b; }',
        functionName: 'add',
        testCases: [
          { input: [1, 2], expected: 3 },
          { input: [1, 2], expected: 99 },
        ],
      }
      const execResult = await tool.execute(input)
      const formatted = tool.formatResult(execResult)
      expect(formatted).toContain('✅')
      expect(formatted).toContain('❌')
      expect(formatted).toContain('1/2')
    })

    it('should return error string when result has no data', () => {
      const result: ToolResult<VerifyOutput> = {
        success: false,
        error: 'something went wrong',
        durationMs: 0,
      }
      const formatted = tool.formatResult(result)
      expect(formatted).toContain('something went wrong')
      expect(formatted).toContain('verify error')
    })

    it('should include stdout lines in formatted output', () => {
      const result: ToolResult<VerifyOutput> = {
        success: true,
        data: {
          executionResult: {
            value: undefined,
            stdout: ['line1', 'line2'],
            durationMs: 1,
          },
          summary: { total: 1, passed: 1, failed: 0 },
        },
        durationMs: 1,
      }
      const formatted = tool.formatResult(result)
      expect(formatted).toContain('line1')
      expect(formatted).toContain('line2')
    })
  })
})
