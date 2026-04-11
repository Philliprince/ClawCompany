/**
 * Token Budget Tracker
 *
 * Tracks cumulative token usage per workflow session and enforces per-session
 * token budgets. Also provides cost estimation based on model pricing.
 *
 * Design:
 *  - Per-session tracking (not a global singleton like cacheMetrics)
 *  - Reads deltas from the cacheMetrics singleton after each LLM call
 *  - Emits SSE events (cost:update, cost:budget-exceeded) via GameEventStore
 *  - Cost estimates are local — no external API calls
 *
 * Model pricing (as of 2025):
 *   claude-3-5-haiku  → $0.80 / $4.00 per 1M tokens (input/output)
 *   claude-3-5-sonnet → $3.00 / $15.00 per 1M tokens (input/output)
 *   gpt-4o-mini       → $0.15 / $0.60 per 1M tokens
 *   gpt-4o            → $2.50 / $10.00 per 1M tokens
 *   glm-4             → $0.10 / $0.10 per 1M tokens (approx)
 *   default           → $3.00 / $15.00 per 1M tokens (conservative fallback)
 */

import { cacheMetrics, CacheUsageSnapshot } from './cache-metrics'
import { getGameEventStore } from '@/game/data/GameEventStore'

// ─── Pricing table ───────────────────────────────────────────────────────────

interface ModelPricing {
  /** USD per 1M input tokens */
  inputPerMillion: number
  /** USD per 1M output tokens */
  outputPerMillion: number
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 3.5 family
  'claude-3-5-haiku-20241022': { inputPerMillion: 0.80, outputPerMillion: 4.00 },
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  // Claude 3 family
  'claude-3-haiku-20240307': { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  'claude-3-sonnet-20240229': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-opus-20240229': { inputPerMillion: 15.00, outputPerMillion: 75.00 },
  // OpenAI
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gpt-4-turbo': { inputPerMillion: 10.00, outputPerMillion: 30.00 },
  // GLM
  'glm-4': { inputPerMillion: 0.10, outputPerMillion: 0.10 },
  'glm-4-flash': { inputPerMillion: 0.01, outputPerMillion: 0.01 },
}

const DEFAULT_PRICING: ModelPricing = { inputPerMillion: 3.00, outputPerMillion: 15.00 }

/** Default token budget per workflow session (100K tokens) */
export const DEFAULT_TOKEN_BUDGET = 100_000

// ─── Cost estimation ─────────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface CostEstimate {
  tokens: TokenUsage
  estimatedCostUsd: number
  model: string
}

/**
 * Estimate cost for a given token usage and model.
 * Purely local — no network calls.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): CostEstimate {
  // Normalise model name: prefix match for versioned names
  const pricing =
    MODEL_PRICING[model] ??
    Object.entries(MODEL_PRICING).find(([key]) => model.startsWith(key))?.[1] ??
    DEFAULT_PRICING

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion

  return {
    tokens: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
    estimatedCostUsd: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
    model,
  }
}

// ─── TokenBudgetTracker ───────────────────────────────────────────────────────

export interface BudgetTrackerOptions {
  /** Maximum tokens before budget-exceeded event fires. Default: 100K */
  tokenBudget?: number
  /** Model name for cost estimation. Default: reads env or falls back to 'claude-3-5-sonnet-20241022' */
  model?: string
  /** Session / workflow identifier for event tagging */
  sessionId?: string
}

export class TokenBudgetTracker {
  private tokenBudget: number
  private model: string
  private sessionId: string

  /** Snapshot of cacheMetrics at the START of this session */
  private baselineSnapshot: CacheUsageSnapshot

  /** Accumulated tokens for this session (delta from baseline) */
  private sessionInputTokens = 0
  private sessionOutputTokens = 0

  private budgetExceeded = false

  constructor(options: BudgetTrackerOptions = {}) {
    this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET
    this.model = options.model ?? process.env.ANTHROPIC_MODEL ?? process.env.LLM_MODEL ?? 'claude-3-5-sonnet-20241022'
    this.sessionId = options.sessionId ?? `session-${Date.now()}`

    // Capture the current state so we only count deltas from now on
    this.baselineSnapshot = cacheMetrics.snapshot()
  }

  /**
   * Poll cacheMetrics for new token usage since last call.
   * Returns delta tokens since last call, or null if nothing changed.
   *
   * Call this AFTER each LLM call completes.
   */
  recordLLMCall(): TokenUsage | null {
    const current = cacheMetrics.snapshot()

    // Calculate total tokens in current snapshot
    const currentInput = current.inputTokens + current.cacheReadInputTokens + current.cacheCreationInputTokens
    const currentOutput = current.outputTokens

    // Calculate baseline totals
    const baseInput = this.baselineSnapshot.inputTokens +
      this.baselineSnapshot.cacheReadInputTokens +
      this.baselineSnapshot.cacheCreationInputTokens
    const baseOutput = this.baselineSnapshot.outputTokens

    // Delta since session start
    const totalSessionInput = Math.max(0, currentInput - baseInput)
    const totalSessionOutput = Math.max(0, currentOutput - baseOutput)

    // Delta since last call
    const deltaInput = Math.max(0, totalSessionInput - this.sessionInputTokens)
    const deltaOutput = Math.max(0, totalSessionOutput - this.sessionOutputTokens)

    if (deltaInput === 0 && deltaOutput === 0) return null

    // Update running totals
    this.sessionInputTokens = totalSessionInput
    this.sessionOutputTokens = totalSessionOutput

    return {
      inputTokens: deltaInput,
      outputTokens: deltaOutput,
      totalTokens: deltaInput + deltaOutput,
    }
  }

  /**
   * Check if budget is exceeded and emit appropriate SSE events.
   * Returns true if budget has been exceeded (including previously).
   */
  checkBudget(): boolean {
    const totalUsed = this.sessionInputTokens + this.sessionOutputTokens

    // Emit cost:update event
    const cost = estimateCost(this.sessionInputTokens, this.sessionOutputTokens, this.model)
    this.emitCostUpdate(cost)

    // Check budget
    if (!this.budgetExceeded && totalUsed >= this.tokenBudget) {
      this.budgetExceeded = true
      this.emitBudgetExceeded(cost)
    }

    return this.budgetExceeded
  }

  /**
   * Combined: record usage delta and check budget.
   * Returns whether budget is exceeded.
   */
  recordAndCheck(): boolean {
    this.recordLLMCall()
    return this.checkBudget()
  }

  /** Get current session token totals */
  getSessionTokens(): TokenUsage {
    return {
      inputTokens: this.sessionInputTokens,
      outputTokens: this.sessionOutputTokens,
      totalTokens: this.sessionInputTokens + this.sessionOutputTokens,
    }
  }

  /** Get current cost estimate */
  getCostEstimate(): CostEstimate {
    return estimateCost(this.sessionInputTokens, this.sessionOutputTokens, this.model)
  }

  /** Has the budget been exceeded? */
  isBudgetExceeded(): boolean {
    return this.budgetExceeded
  }

  /** Remaining token budget */
  getRemainingBudget(): number {
    return Math.max(0, this.tokenBudget - (this.sessionInputTokens + this.sessionOutputTokens))
  }

  // ─── SSE Event Emission ──────────────────────────────────────────────────

  private emitCostUpdate(cost: CostEstimate): void {
    try {
      getGameEventStore().push({
        type: 'cost:update',
        agentId: 'token-budget-tracker',
        timestamp: Date.now(),
        payload: {
          sessionId: this.sessionId,
          tokens: cost.tokens,
          estimatedCostUsd: cost.estimatedCostUsd,
          model: cost.model,
          budget: this.tokenBudget,
          remainingBudget: this.getRemainingBudget(),
        },
      })
    } catch {
      // Non-fatal — event store errors must never break the workflow
    }
  }

  private emitBudgetExceeded(cost: CostEstimate): void {
    try {
      getGameEventStore().push({
        type: 'cost:budget-exceeded',
        agentId: 'token-budget-tracker',
        timestamp: Date.now(),
        payload: {
          sessionId: this.sessionId,
          tokens: cost.tokens,
          estimatedCostUsd: cost.estimatedCostUsd,
          model: cost.model,
          budget: this.tokenBudget,
          overage: Math.max(0, cost.tokens.totalTokens - this.tokenBudget),
        },
      })
    } catch {
      // Non-fatal
    }
  }
}
