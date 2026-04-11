/**
 * TokenBudgetTracker unit tests
 */

import { TokenBudgetTracker, estimateCost, DEFAULT_TOKEN_BUDGET } from '../token-budget-tracker'

// Mock cacheMetrics
jest.mock('../cache-metrics', () => ({
  cacheMetrics: {
    snapshot: jest.fn(),
  },
}))

// Mock GameEventStore
jest.mock('@/game/data/GameEventStore', () => ({
  getGameEventStore: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

import { cacheMetrics } from '../cache-metrics'
import { getGameEventStore } from '@/game/data/GameEventStore'

const mockCacheMetrics = cacheMetrics as jest.Mocked<typeof cacheMetrics>
const mockStore = { push: jest.fn() }
;(getGameEventStore as jest.Mock).mockReturnValue(mockStore)

function makeMockSnapshot(input: number, output: number, cacheRead = 0, cacheCreation = 0) {
  return {
    inputTokens: input,
    outputTokens: output,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreation,
    totalRequests: 1,
    hitRate: 0,
  }
}

describe('estimateCost', () => {
  it('estimates cost for known models', () => {
    const result = estimateCost(1_000_000, 1_000_000, 'claude-3-5-sonnet-20241022')
    // $3 input + $15 output = $18
    expect(result.estimatedCostUsd).toBeCloseTo(18, 2)
    expect(result.tokens.totalTokens).toBe(2_000_000)
  })

  it('uses default pricing for unknown models', () => {
    const result = estimateCost(1_000_000, 0, 'unknown-model')
    // Default $3/M input
    expect(result.estimatedCostUsd).toBeCloseTo(3, 2)
  })

  it('returns zero cost for zero tokens', () => {
    const result = estimateCost(0, 0, 'claude-3-5-haiku-20241022')
    expect(result.estimatedCostUsd).toBe(0)
  })
})

describe('TokenBudgetTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getGameEventStore as jest.Mock).mockReturnValue(mockStore)
  })

  it('defaults to 100K token budget', () => {
    mockCacheMetrics.snapshot.mockReturnValue(makeMockSnapshot(0, 0))
    const tracker = new TokenBudgetTracker()
    expect(tracker.getRemainingBudget()).toBe(DEFAULT_TOKEN_BUDGET)
  })

  it('records delta tokens correctly', () => {
    // Baseline: 0 tokens
    mockCacheMetrics.snapshot.mockReturnValueOnce(makeMockSnapshot(0, 0))
    const tracker = new TokenBudgetTracker()

    // After first LLM call: 1000 input, 500 output
    mockCacheMetrics.snapshot.mockReturnValueOnce(makeMockSnapshot(1000, 500))
    const delta = tracker.recordLLMCall()

    expect(delta?.inputTokens).toBe(1000)
    expect(delta?.outputTokens).toBe(500)
    expect(delta?.totalTokens).toBe(1500)
    expect(tracker.getSessionTokens().totalTokens).toBe(1500)
  })

  it('emits cost:update event on checkBudget', () => {
    mockCacheMetrics.snapshot
      .mockReturnValueOnce(makeMockSnapshot(0, 0))   // baseline
      .mockReturnValueOnce(makeMockSnapshot(500, 200)) // after call

    const tracker = new TokenBudgetTracker({ tokenBudget: 10_000 })
    tracker.recordLLMCall()
    tracker.checkBudget()

    expect(mockStore.push).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cost:update' })
    )
  })

  it('emits cost:budget-exceeded when budget is exceeded', () => {
    mockCacheMetrics.snapshot
      .mockReturnValueOnce(makeMockSnapshot(0, 0))         // baseline
      .mockReturnValueOnce(makeMockSnapshot(80_000, 30_000)) // 110K tokens > 100K budget

    const tracker = new TokenBudgetTracker({ tokenBudget: 100_000 })
    const exceeded = tracker.recordAndCheck()

    expect(exceeded).toBe(true)
    expect(mockStore.push).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cost:budget-exceeded' })
    )
    expect(tracker.isBudgetExceeded()).toBe(true)
  })

  it('does not re-emit budget-exceeded on subsequent calls', () => {
    mockCacheMetrics.snapshot
      .mockReturnValueOnce(makeMockSnapshot(0, 0))         // baseline
      .mockReturnValueOnce(makeMockSnapshot(80_000, 30_000)) // 110K — exceed
      .mockReturnValueOnce(makeMockSnapshot(90_000, 40_000)) // 130K — still exceeded

    const tracker = new TokenBudgetTracker({ tokenBudget: 100_000 })
    tracker.recordAndCheck()

    const budgetExceededCalls = mockStore.push.mock.calls.filter(
      (call: [{ type: string }]) => call[0]?.type === 'cost:budget-exceeded'
    ).length
    expect(budgetExceededCalls).toBe(1)

    // Second call — budget already exceeded, no new event
    tracker.recordAndCheck()
    const budgetExceededCalls2 = mockStore.push.mock.calls.filter(
      (call: [{ type: string }]) => call[0]?.type === 'cost:budget-exceeded'
    ).length
    expect(budgetExceededCalls2).toBe(1)
  })

  it('returns null when no new tokens recorded', () => {
    mockCacheMetrics.snapshot
      .mockReturnValueOnce(makeMockSnapshot(100, 50)) // baseline
      .mockReturnValueOnce(makeMockSnapshot(100, 50)) // no change

    const tracker = new TokenBudgetTracker()
    const delta = tracker.recordLLMCall()
    expect(delta).toBeNull()
  })

  it('computes remaining budget correctly', () => {
    mockCacheMetrics.snapshot
      .mockReturnValueOnce(makeMockSnapshot(0, 0))
      .mockReturnValueOnce(makeMockSnapshot(10_000, 5_000))

    const tracker = new TokenBudgetTracker({ tokenBudget: 50_000 })
    tracker.recordLLMCall()

    expect(tracker.getRemainingBudget()).toBe(35_000) // 50K - 15K
  })
})
