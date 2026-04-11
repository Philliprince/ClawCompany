/**
 * LLM Error Semantic Classifier
 *
 * Distinguishes between LLM API error categories so the orchestrator can
 * apply the correct recovery strategy:
 *
 *   rate_limit        → Wait 60 s then retry (transient, same account)
 *   billing           → Mark task failed, emit SSE event (account invalid)
 *   timeout           → Immediate retry with back-off (transient)
 *   context_too_long  → Trigger history compression then retry
 *   unknown           → Fall back to generic retry logic
 */

export type LLMErrorCategory =
  | 'rate_limit'
  | 'billing'
  | 'timeout'
  | 'context_too_long'
  | 'unknown'

export interface LLMErrorClassification {
  category: LLMErrorCategory
  /** Human-readable reason picked from the raw error message */
  reason: string
  /** Suggested wait before retry in ms (0 = no wait / not retryable) */
  retryDelayMs: number
  /** Whether the error is retryable at all */
  retryable: boolean
}

// ─── Pattern tables ───────────────────────────────────────────────────────────

/**
 * Patterns that indicate a rate-limit (HTTP 429) but NOT a billing issue.
 * These are transient: the same API key will work again after a cooldown.
 */
const RATE_LIMIT_PATTERNS: RegExp[] = [
  /429/,
  /rate.?limit/i,
  /too many requests/i,
  /request.?limit/i,
  /quota.*exceeded.*daily/i,       // daily quota is rate-limit style
  /capacity.*exceeded/i,
  /model.*overloaded/i,
  /retry.?after/i,
  /x-ratelimit/i,
]

/**
 * Patterns that indicate a billing / authentication failure.
 * These are NOT transient: retrying with the same account won't help.
 */
const BILLING_PATTERNS: RegExp[] = [
  /insufficient.?funds/i,
  /billing/i,
  /payment.?required/i,
  /402/,
  /account.*suspend/i,
  /account.*deactivat/i,
  /credit.*balance/i,
  /quota.*exceeded.*billing/i,     // "billing quota exceeded" vs "daily quota"
  /exceeded.*billing.?quota/i,
  /organization.*disabled/i,
  /invalid.?api.?key/i,
  /api.?key.*invalid/i,
  /authentication.*failed/i,
  /401/,
  /403/,
  /unauthorized/i,
  /permission.?denied/i,
]

/**
 * Patterns for context-window overflows.
 */
const CONTEXT_TOO_LONG_PATTERNS: RegExp[] = [
  /context.?length/i,
  /context.?window/i,
  /maximum.?context/i,
  /token.*limit/i,
  /max.?tokens.*exceeded/i,
  /prompt.?too.?long/i,
  /input.*too.?long/i,
  /string.*too.?long/i,
  /context.*exceeded/i,
]

/**
 * Patterns for timeouts / network-level errors.
 */
const TIMEOUT_PATTERNS: RegExp[] = [
  /timeout/i,
  /timed.?out/i,
  /ETIMEDOUT/,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /aborted/i,
  /network.?error/i,
  /socket.?hang.?up/i,
  /503/,
  /502/,
  /504/,
  /service.?unavailable/i,
  /bad.?gateway/i,
]

// ─── Classifier ──────────────────────────────────────────────────────────────

/**
 * Classify an LLM API error into a semantic category.
 *
 * Evaluation order matters:
 *   billing > rate_limit > context_too_long > timeout > unknown
 *
 * Billing is checked first because some providers return 401/403 messages
 * that would otherwise match timeout/rate-limit patterns.
 */
export function classify(error: unknown): LLMErrorClassification {
  const message = extractMessage(error)

  // 1. Billing — not retryable with the same account
  if (BILLING_PATTERNS.some(p => p.test(message))) {
    return {
      category: 'billing',
      reason: message,
      retryDelayMs: 0,
      retryable: false,
    }
  }

  // 2. Rate limit — retryable after a mandatory cooldown
  if (RATE_LIMIT_PATTERNS.some(p => p.test(message))) {
    return {
      category: 'rate_limit',
      reason: message,
      retryDelayMs: 60_000,   // 60 s hard wait as specified
      retryable: true,
    }
  }

  // 3. Context too long — retryable after compression
  if (CONTEXT_TOO_LONG_PATTERNS.some(p => p.test(message))) {
    return {
      category: 'context_too_long',
      reason: message,
      retryDelayMs: 0,         // No time-based wait; needs compression first
      retryable: true,
    }
  }

  // 4. Timeout / transient network error — retryable with back-off
  if (TIMEOUT_PATTERNS.some(p => p.test(message))) {
    return {
      category: 'timeout',
      reason: message,
      retryDelayMs: 5_000,    // Short initial back-off; UnifiedRetry will increase it
      retryable: true,
    }
  }

  // 5. Anything else
  return {
    category: 'unknown',
    reason: message,
    retryDelayMs: 5_000,
    retryable: true,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    if (typeof obj['message'] === 'string') return obj['message']
    if (typeof obj['error'] === 'string') return obj['error']
    if (obj['error'] && typeof obj['error'] === 'object') {
      const inner = obj['error'] as Record<string, unknown>
      if (typeof inner['message'] === 'string') return inner['message']
    }
  }
  return String(error)
}
