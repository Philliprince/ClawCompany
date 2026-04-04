import {
  Result,
  ok,
  err,
  isOk,
  isErr,
} from '@ai-team-demo/lib/core/types'

describe('Result monad', () => {
  describe('ok()', () => {
    it('should create a success result with data', () => {
      const result = ok(42)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(42)
      }
    })

    it('should create a success result with string data', () => {
      const result = ok('hello')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('hello')
      }
    })

    it('should create a success result with object data', () => {
      const data = { name: 'test', value: 123 }
      const result = ok(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })

    it('should create a success result with null data', () => {
      const result = ok(null)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeNull()
      }
    })

    it('should create a success result with undefined data', () => {
      const result = ok(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeUndefined()
      }
    })

    it('should create a success result with array data', () => {
      const result = ok([1, 2, 3])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3])
      }
    })

    it('should infer Result<T, never> type', () => {
      const result: Result<number, never> = ok(42)
      expect(result.success).toBe(true)
    })
  })

  describe('err()', () => {
    it('should create an error result with error data', () => {
      const result = err('something went wrong')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('something went wrong')
      }
    })

    it('should create an error result with Error object', () => {
      const error = new Error('boom')
      const result = err(error)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(error)
        expect(result.error.message).toBe('boom')
      }
    })

    it('should create an error result with custom error type', () => {
      interface CustomError {
        code: string
        message: string
      }
      const customErr: CustomError = { code: 'E001', message: 'custom error' }
      const result = err<CustomError>(customErr)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('E001')
        expect(result.error.message).toBe('custom error')
      }
    })

    it('should create an error result with number error', () => {
      const result = err(404)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe(404)
      }
    })

    it('should infer Result<never, E> type', () => {
      const result: Result<never, string> = err('fail')
      expect(result.success).toBe(false)
    })
  })

  describe('isOk()', () => {
    it('should return true for success result', () => {
      const result = ok(42)
      expect(isOk(result)).toBe(true)
    })

    it('should return false for error result', () => {
      const result = err('fail')
      expect(isOk(result)).toBe(false)
    })

    it('should narrow type to success variant', () => {
      const result: Result<number, string> = ok(42)
      if (isOk(result)) {
        expect(result.data).toBe(42)
      }
    })
  })

  describe('isErr()', () => {
    it('should return true for error result', () => {
      const result = err('fail')
      expect(isErr(result)).toBe(true)
    })

    it('should return false for success result', () => {
      const result = ok(42)
      expect(isErr(result)).toBe(false)
    })

    it('should narrow type to error variant', () => {
      const result: Result<number, string> = err('oops')
      if (isErr(result)) {
        expect(result.error).toBe('oops')
      }
    })
  })

  describe('map - transforming success values', () => {
    it('should transform data when result is success', () => {
      const result = ok(5)
      if (result.success) {
        const mapped = ok(result.data * 2)
        expect(mapped.success).toBe(true)
        if (mapped.success) {
          expect(mapped.data).toBe(10)
        }
      }
    })

    it('should not transform when result is error', () => {
      const result: Result<number, string> = err('fail')
      if (!result.success) {
        expect(result.error).toBe('fail')
      }
    })

    it('should chain map operations', () => {
      const result = ok('hello')
      const mapped = result.success
        ? ok((result.data as string).toUpperCase())
        : result
      const mapped2 = mapped.success && mapped.data
        ? ok((mapped.data as string).length)
        : mapped

      if (isOk(mapped2 as Result<number, string>)) {
        expect((mapped2 as { success: true; data: number }).data).toBe(5)
      }
    })
  })

  describe('mapErr - transforming error values', () => {
    it('should transform error when result is error', () => {
      const result = err('fail')
      if (!result.success) {
        const mappedErr = err({ code: 'UNKNOWN', message: result.error })
        expect(mappedErr.success).toBe(false)
        if (!mappedErr.success) {
          expect(mappedErr.error.message).toBe('fail')
        }
      }
    })

    it('should not transform error when result is success', () => {
      const result = ok(42)
      if (result.success) {
        expect(result.data).toBe(42)
      }
    })
  })

  describe('flatMap / chain', () => {
    it('should chain success result into another success', () => {
      const result = ok(5)
      const chained = result.success
        ? ok(result.data * 2)
        : result

      expect(chained.success).toBe(true)
      if (chained.success) {
        expect(chained.data).toBe(10)
      }
    })

    it('should chain success result into an error', () => {
      const result = ok(-1)
      const chained = result.success
        ? (result.data > 0 ? ok(result.data) : err('must be positive'))
        : result

      expect(chained.success).toBe(false)
      if (!chained.success) {
        expect(chained.error).toBe('must be positive')
      }
    })

    it('should propagate error through chain', () => {
      const result: Result<number, string> = err('initial error')
      const chained = result.success
        ? ok(result.data * 2)
        : result

      expect(chained.success).toBe(false)
      if (!chained.success) {
        expect(chained.error).toBe('initial error')
      }
    })

    it('should handle multiple chain steps', () => {
      const parse = (s: string): Result<number, string> => {
        const n = parseInt(s, 10)
        return isNaN(n) ? err('not a number') : ok(n)
      }
      const double = (n: number): Result<number, string> => {
        return n > 100 ? err('too large') : ok(n * 2)
      }
      const addOne = (n: number): Result<number, string> => {
        return n > 100 ? err('overflow') : ok(n + 1)
      }

      const step1 = parse('42')
      const step2 = step1.success ? double(step1.data) : step1
      const step3 = step2.success ? addOne(step2.data) : step2

      expect(step3.success).toBe(true)
      if (step3.success) {
        expect(step3.data).toBe(85)
      }
    })

    it('should short-circuit on first error in chain', () => {
      const parse = (s: string): Result<number, string> => {
        const n = parseInt(s, 10)
        return isNaN(n) ? err('not a number') : ok(n)
      }
      const double = (n: number): Result<number, string> => ok(n * 2)
      const addOne = (n: number): Result<number, string> => ok(n + 1)

      const step1 = parse('abc')
      const step2 = step1.success ? double(step1.data) : step1
      const step3 = step2.success ? addOne(step2.data) : step2

      expect(step3.success).toBe(false)
      if (!step3.success) {
        expect(step3.error).toBe('not a number')
      }
    })
  })

  describe('getOrElse - default value on error', () => {
    it('should return data when result is success', () => {
      const result = ok(42)
      const value = result.success ? result.data : 0
      expect(value).toBe(42)
    })

    it('should return default when result is error', () => {
      const result: Result<number, string> = err('fail')
      const value = result.success ? result.data : 0
      expect(value).toBe(0)
    })

    it('should return default with different types', () => {
      const result: Result<string[], string> = err('no data')
      const value = result.success ? result.data : [] as string[]
      expect(value).toEqual([])
    })
  })

  describe('match - pattern matching', () => {
    it('should call ok handler for success result', () => {
      const result = ok(42)
      const output = result.success
        ? `got ${result.data}`
        : `error: ${result.error}`
      expect(output).toBe('got 42')
    })

    it('should call err handler for error result', () => {
      const result: Result<number, string> = err('fail')
      const output = result.success
        ? `got ${result.data}`
        : `error: ${result.error}`
      expect(output).toBe('error: fail')
    })

    it('should handle both branches with different return types', () => {
      const processResult = (r: Result<number, string>): string => {
        return r.success
          ? `success: ${r.data}`
          : `error: ${r.error}`
      }
      expect(processResult(ok(10))).toBe('success: 10')
      expect(processResult(err('bad'))).toBe('error: bad')
    })
  })

  describe('exception handling - wrapping thrown errors', () => {
    it('should catch synchronous exceptions and return error result', () => {
      const safeDivide = (a: number, b: number): Result<number, string> => {
        try {
          if (b === 0) throw new Error('division by zero')
          return ok(a / b)
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e))
        }
      }

      const result = safeDivide(10, 0)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('division by zero')
      }
    })

    it('should return success for non-throwing operations', () => {
      const safeDivide = (a: number, b: number): Result<number, string> => {
        try {
          if (b === 0) throw new Error('division by zero')
          return ok(a / b)
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e))
        }
      }

      const result = safeDivide(10, 2)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(5)
      }
    })

    it('should handle JSON parsing errors', () => {
      const safeParse = <T>(json: string): Result<T, string> => {
        try {
          return ok(JSON.parse(json))
        } catch (e) {
          return err(e instanceof Error ? e.message : 'parse error')
        }
      }

      const valid = safeParse<{ a: number }>('{"a": 1}')
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.a).toBe(1)
      }

      const invalid = safeParse('not json{')
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(typeof invalid.error).toBe('string')
      }
    })

    it('should handle async operations returning Result', async () => {
      const safeAsyncFetch = async (url: string): Promise<Result<string, string>> => {
        try {
          if (!url.startsWith('http')) throw new Error('invalid url')
          return ok(`response from ${url}`)
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e))
        }
      }

      const valid = await safeAsyncFetch('https://example.com')
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data).toBe('response from https://example.com')
      }

      const invalid = await safeAsyncFetch('ftp://bad')
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error).toBe('invalid url')
      }
    })
  })

  describe('combine / all - aggregating multiple Results', () => {
    it('should combine all success results', () => {
      const results = [ok(1), ok(2), ok(3)]
      const combined = results.every(r => r.success)
        ? ok(results.map(r => (r as { success: true; data: number }).data))
        : err('at least one failed')

      expect(combined.success).toBe(true)
      if (combined.success) {
        expect(combined.data).toEqual([1, 2, 3])
      }
    })

    it('should return first error if any result is error', () => {
      const results: Result<number, string>[] = [ok(1), err('fail2'), ok(3)]
      const firstErr = results.find(r => !r.success)
      const combined = firstErr
        ? err((firstErr as { success: false; error: string }).error)
        : ok(results.map(r => (r as { success: true; data: number }).data))

      expect(combined.success).toBe(false)
      if (!combined.success) {
        expect(combined.error).toBe('fail2')
      }
    })

    it('should handle empty array of results', () => {
      const results: Result<number, string>[] = []
      const combined = results.every(r => r.success)
        ? ok(results.map(r => (r as { success: true; data: number }).data))
        : err('at least one failed')

      expect(combined.success).toBe(true)
      if (combined.success) {
        expect(combined.data).toEqual([])
      }
    })

    it('should combine all errors if all results fail', () => {
      const results: Result<number, string>[] = [err('e1'), err('e2')]
      const errors = results
        .filter((r): r is { success: false; error: string } => !r.success)
        .map(r => r.error)

      expect(errors).toEqual(['e1', 'e2'])
    })
  })

  describe('real-world usage patterns', () => {
    it('should handle validation pipeline', () => {
      type ValidationError = { field: string; message: string }

      const validateName = (name: string): Result<string, ValidationError> => {
        if (!name || name.trim().length === 0) {
          return err({ field: 'name', message: 'Name is required' })
        }
        if (name.length < 2) {
          return err({ field: 'name', message: 'Name too short' })
        }
        return ok(name.trim())
      }

      const validateAge = (age: number): Result<number, ValidationError> => {
        if (age < 0 || age > 150) {
          return err({ field: 'age', message: 'Invalid age' })
        }
        return ok(age)
      }

      interface User {
        name: string
        age: number
      }

      const createUser = (name: string, age: number): Result<User, ValidationError> => {
        const nameResult = validateName(name)
        if (!nameResult.success) return nameResult as Result<User, ValidationError>

        const ageResult = validateAge(age)
        if (!ageResult.success) return ageResult as Result<User, ValidationError>

        return ok({ name: nameResult.data, age: ageResult.data })
      }

      const valid = createUser('Alice', 30)
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data).toEqual({ name: 'Alice', age: 30 })
      }

      const invalidName = createUser('', 30)
      expect(invalidName.success).toBe(false)
      if (!invalidName.success) {
        expect(invalidName.error.field).toBe('name')
      }

      const invalidAge = createUser('Bob', 200)
      expect(invalidAge.success).toBe(false)
      if (!invalidAge.success) {
        expect(invalidAge.error.field).toBe('age')
      }
    })

    it('should handle repository/data access pattern', () => {
      interface NotFoundError {
        entity: string
        id: string
      }

      type RepositoryResult<T> = Result<T, NotFoundError>

      const users = new Map([
        ['1', { id: '1', name: 'Alice' }],
        ['2', { id: '2', name: 'Bob' }],
      ])

      const findUser = (id: string): RepositoryResult<{ id: string; name: string }> => {
        const user = users.get(id)
        return user
          ? ok(user)
          : err({ entity: 'User', id })
      }

      const found = findUser('1')
      expect(found.success).toBe(true)
      if (found.success) {
        expect(found.data.name).toBe('Alice')
      }

      const notFound = findUser('999')
      expect(notFound.success).toBe(false)
      if (!notFound.success) {
        expect(notFound.error.entity).toBe('User')
        expect(notFound.error.id).toBe('999')
      }
    })

    it('should handle parsing and transformation pipeline', () => {
      const parseConfig = (raw: string): Result<Record<string, string>, string> => {
        try {
          const parsed = JSON.parse(raw)
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return err('Config must be an object')
          }
          return ok(parsed as Record<string, string>)
        } catch {
          return err('Invalid JSON')
        }
      }

      const validateRequiredKeys = (
        config: Record<string, string>,
        keys: string[]
      ): Result<Record<string, string>, string> => {
        const missing = keys.filter(k => !(k in config))
        if (missing.length > 0) {
          return err(`Missing keys: ${missing.join(', ')}`)
        }
        return ok(config)
      }

      const raw = '{"host": "localhost", "port": "3000"}'
      const parsed = parseConfig(raw)
      const validated = parsed.success
        ? validateRequiredKeys(parsed.data, ['host', 'port'])
        : parsed

      expect(validated.success).toBe(true)

      const badRaw = '{"host": "localhost"}'
      const badParsed = parseConfig(badRaw)
      const badValidated = badParsed.success
        ? validateRequiredKeys(badParsed.data, ['host', 'port'])
        : badParsed

      expect(badValidated.success).toBe(false)
      if (!badValidated.success) {
        expect(badValidated.error).toContain('port')
      }
    })

    it('should work with async/await patterns', async () => {
      const asyncOperation = async (shouldFail: boolean): Promise<Result<string, Error>> => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return shouldFail ? err(new Error('async fail')) : ok('async success')
      }

      const successResult = await asyncOperation(false)
      expect(successResult.success).toBe(true)
      if (successResult.success) {
        expect(successResult.data).toBe('async success')
      }

      const failResult = await asyncOperation(true)
      expect(failResult.success).toBe(false)
      if (!failResult.success) {
        expect(failResult.error.message).toBe('async fail')
      }
    })
  })

  describe('type safety', () => {
    it('should enforce discriminated union narrowing', () => {
      const result: Result<number, string> = ok(42)

      if (result.success) {
        expect(typeof result.data).toBe('number')
      } else {
        expect(typeof result.error).toBe('string')
      }
    })

    it('should work with generic types', () => {
      const result: Result<string[], number> = ok(['a', 'b'])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should work with union error types', () => {
      type MyError = { type: 'validation'; message: string } | { type: 'network'; status: number }
      const result: Result<string, MyError> = err({ type: 'network', status: 500 })

      expect(result.success).toBe(false)
      if (!result.success) {
        if (result.error.type === 'network') {
          expect(result.error.status).toBe(500)
        }
      }
    })
  })

  describe('edge cases', () => {
    it('should handle Result with boolean data', () => {
      const result = ok(true)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(true)
      }
    })

    it('should handle Result with function data', () => {
      const fn = (x: number) => x + 1
      const result = ok(fn)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data(5)).toBe(6)
      }
    })

    it('should handle deeply nested data', () => {
      const data = { a: { b: { c: [1, 2, { d: 'deep' } as const] } } }
      const result = ok(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.data.a.b.c[2] as { d: string }).d).toBe('deep')
      }
    })

    it('should distinguish between ok(null) and err', () => {
      const successNull = ok(null)
      const errorResult = err('something')

      expect(isOk(successNull)).toBe(true)
      expect(isErr(errorResult)).toBe(true)
      expect(successNull.success).not.toBe(errorResult.success)
    })

    it('should handle Result<undefined, undefined>', () => {
      const result: Result<undefined, undefined> = ok(undefined)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBeUndefined()
      }
    })

    it('should correctly handle Result where T and E are the same type', () => {
      const result: Result<string, string> = ok('data')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('data')
      }

      const errorResult: Result<string, string> = err('error')
      expect(errorResult.success).toBe(false)
      if (!errorResult.success) {
        expect(errorResult.error).toBe('error')
      }
    })
  })
})
