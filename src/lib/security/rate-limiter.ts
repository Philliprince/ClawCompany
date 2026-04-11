/**
 * Sliding Window Rate Limiter
 * 
 * Implements a sliding window rate limiting algorithm using in-memory Map storage.
 * Each identifier (IP address) gets a configurable number of requests per time window.
 */

interface RateLimitRecord {
  timestamps: number[];
}

interface CheckResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  limit: number;
  resetAt: number;
}

export class SlidingWindowRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private cleanupIntervalMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupStarted: boolean = false;

  constructor(options?: { windowMs?: number; maxRequests?: number; cleanupIntervalMs?: number }) {
    this.windowMs = options?.windowMs ?? 60000;
    this.maxRequests = options?.maxRequests ?? 10;
    this.cleanupIntervalMs = options?.cleanupIntervalMs ?? 30000;
  }

  private ensureCleanupStarted(): void {
    if (this.cleanupStarted) return;
    this.cleanupStarted = true;
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  stopCleanup(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.cleanupStarted = false;
    }
  }

  /**
   * Check if a request from the given identifier is allowed
   * @param identifier - IP address or other identifier
   * @returns CheckResult with allowed status and metadata
   */
  check(identifier: string): CheckResult {
    this.ensureCleanupStarted();

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const resetAt = now + this.windowMs;

    let record = this.records.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(identifier, record);
    }

    record.timestamps = record.timestamps.filter(ts => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = Math.min(...record.timestamps);
      const retryAfter = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter),
        limit: this.maxRequests,
        resetAt: oldestTimestamp + this.windowMs,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      limit: this.maxRequests,
      resetAt,
    };
  }

  /**
   * Get the number of remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const record = this.records.get(identifier);
    if (!record) {
      return this.maxRequests;
    }

    const validTimestamps = record.timestamps.filter(ts => ts > windowStart);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.records.delete(identifier);
  }

  /**
   * Clear all rate limit records
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Cleanup expired records
   * @returns Number of cleaned up identifiers
   */
  cleanup(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const toDelete: string[] = [];
    this.records.forEach((record, identifier) => {
      record.timestamps = record.timestamps.filter(ts => ts > windowStart);
      if (record.timestamps.length === 0) {
        toDelete.push(identifier);
      }
    });

    toDelete.forEach(id => this.records.delete(id));
    return toDelete.length;
  }

  /**
   * Get the number of active identifiers being tracked
   */
  get activeIdentifiers(): number {
    return this.records.size;
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): { activeIdentifiers: number; windowMs: number; maxRequests: number } {
    return {
      activeIdentifiers: this.activeIdentifiers,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
}

const DEFAULT_LIMITER = new SlidingWindowRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
});

export function check(ip: string): CheckResult {
  return DEFAULT_LIMITER.check(ip);
}

export function getRemaining(ip: string): number {
  return DEFAULT_LIMITER.getRemaining(ip);
}

export function resetRateLimit(ip: string): void {
  DEFAULT_LIMITER.reset(ip);
}

export function getRateLimiterStats(): ReturnType<SlidingWindowRateLimiter['getStats']> {
  return DEFAULT_LIMITER.getStats();
}

export { CheckResult };
