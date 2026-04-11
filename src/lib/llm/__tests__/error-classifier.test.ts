import { classify, LLMErrorCategory } from '../error-classifier'

describe('LLM Error Classifier', () => {
  const cases: Array<{ input: string; expected: LLMErrorCategory; retryable: boolean }> = [
    // ─── billing ──────────────────────────────────────────────────────────
    { input: 'Error 402: payment required', expected: 'billing', retryable: false },
    { input: 'Insufficient funds in your account', expected: 'billing', retryable: false },
    { input: 'OpenAI API error: invalid_api_key — please check your API key', expected: 'billing', retryable: false },
    { input: 'API key invalid or expired', expected: 'billing', retryable: false },
    { input: 'You have exceeded your billing quota', expected: 'billing', retryable: false },
    { input: '401 Unauthorized', expected: 'billing', retryable: false },
    { input: 'Organization disabled', expected: 'billing', retryable: false },
    { input: 'Account suspended due to policy violation', expected: 'billing', retryable: false },
    { input: 'Authentication failed', expected: 'billing', retryable: false },

    // ─── rate_limit ───────────────────────────────────────────────────────
    { input: 'Error 429: too many requests', expected: 'rate_limit', retryable: true },
    { input: 'Rate limit exceeded, retry after 60s', expected: 'rate_limit', retryable: true },
    { input: 'OpenAI API error: rate_limit_exceeded', expected: 'rate_limit', retryable: true },
    { input: 'Model is currently overloaded with other requests', expected: 'rate_limit', retryable: true },
    { input: 'Request limit reached for your tier', expected: 'rate_limit', retryable: true },

    // ─── context_too_long ────────────────────────────────────────────────
    { input: 'This model\'s maximum context length is 4097 tokens', expected: 'context_too_long', retryable: true },
    { input: 'Context window exceeded', expected: 'context_too_long', retryable: true },
    { input: 'Prompt too long for the selected model', expected: 'context_too_long', retryable: true },
    { input: 'Input too long: 128001 tokens, max 128000', expected: 'context_too_long', retryable: true },
    { input: 'max_tokens exceeded by 500 tokens', expected: 'context_too_long', retryable: true },

    // ─── timeout ─────────────────────────────────────────────────────────
    { input: 'Request timed out after 30000ms', expected: 'timeout', retryable: true },
    { input: 'ETIMEDOUT connecting to api.openai.com', expected: 'timeout', retryable: true },
    { input: 'ECONNRESET by remote host', expected: 'timeout', retryable: true },
    { input: '503 Service Unavailable', expected: 'timeout', retryable: true },
    { input: '502 Bad Gateway', expected: 'timeout', retryable: true },
    { input: 'Network error occurred', expected: 'timeout', retryable: true },
    { input: 'socket hang up', expected: 'timeout', retryable: true },

    // ─── unknown ─────────────────────────────────────────────────────────
    { input: 'Something went horribly wrong', expected: 'unknown', retryable: true },
    { input: 'Unexpected response format', expected: 'unknown', retryable: true },
  ]

  test.each(cases)('classifies "$input" as $expected (retryable=$retryable)', ({ input, expected, retryable }) => {
    const result = classify(new Error(input))
    expect(result.category).toBe(expected)
    expect(result.retryable).toBe(retryable)
  })

  describe('retryDelayMs', () => {
    it('should be 60000ms for rate_limit', () => {
      const result = classify(new Error('429 rate limit exceeded'))
      expect(result.retryDelayMs).toBe(60_000)
    })

    it('should be 0ms for billing (not retryable)', () => {
      const result = classify(new Error('insufficient funds'))
      expect(result.retryDelayMs).toBe(0)
    })

    it('should be 0ms for context_too_long (no time wait, needs compression)', () => {
      const result = classify(new Error('context window exceeded'))
      expect(result.retryDelayMs).toBe(0)
    })
  })

  describe('handles non-Error inputs', () => {
    it('should handle string error', () => {
      const result = classify('429 too many requests')
      expect(result.category).toBe('rate_limit')
    })

    it('should handle plain object error', () => {
      const result = classify({ message: 'insufficient_funds billing error' })
      expect(result.category).toBe('billing')
    })

    it('should handle unknown object', () => {
      const result = classify({ code: 42 })
      expect(result.category).toBe('unknown')
    })

    it('should handle null/undefined gracefully', () => {
      expect(() => classify(null)).not.toThrow()
      expect(() => classify(undefined)).not.toThrow()
    })
  })

  describe('billing takes priority over rate_limit patterns', () => {
    it('should classify 401 as billing, not timeout', () => {
      const result = classify(new Error('401 Unauthorized'))
      expect(result.category).toBe('billing')
    })

    it('should classify 403 Forbidden as billing', () => {
      const result = classify(new Error('403 Forbidden — invalid API key'))
      expect(result.category).toBe('billing')
    })
  })
})
