import { SlidingWindowRateLimiter, check, getRemaining, resetRateLimit, getRateLimiterStats } from '../rate-limiter';

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      windowMs: 60000,
      maxRequests: 10,
    });
  });

  afterEach(() => {
    limiter.stopCleanup();
    limiter.clear();
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const defaultLimiter = new SlidingWindowRateLimiter();
      expect(defaultLimiter.getStats().maxRequests).toBe(10);
      expect(defaultLimiter.getStats().windowMs).toBe(60000);
    });

    it('should accept custom windowMs and maxRequests', () => {
      const customLimiter = new SlidingWindowRateLimiter({
        windowMs: 30000,
        maxRequests: 5,
      });
      expect(customLimiter.getStats().maxRequests).toBe(5);
      expect(customLimiter.getStats().windowMs).toBe(30000);
    });
  });

  describe('check()', () => {
    it('should allow first request', () => {
      const result = limiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should allow requests until limit is reached', () => {
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('192.168.1.1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('should reject request when limit exceeded', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.1');
      }

      const result = limiter.check('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different IPs independently', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.1');
      }

      const result = limiter.check('192.168.1.2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should provide correct limit in response', () => {
      const result = limiter.check('192.168.1.1');
      expect(result.limit).toBe(10);
    });

    it('should provide resetAt timestamp', () => {
      const result = limiter.check('192.168.1.1');
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });
  });

  describe('getRemaining()', () => {
    it('should return maxRequests for unknown identifier', () => {
      expect(limiter.getRemaining('unknown-ip')).toBe(10);
    });

    it('should return correct remaining after some requests', () => {
      limiter.check('192.168.1.1');
      limiter.check('192.168.1.1');
      limiter.check('192.168.1.1');

      expect(limiter.getRemaining('192.168.1.1')).toBe(7);
    });

    it('should return 0 when limit exhausted', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.1');
      }

      expect(limiter.getRemaining('192.168.1.1')).toBe(0);
    });
  });

  describe('reset()', () => {
    it('should allow requests after reset', () => {
      for (let i = 0; i < 10; i++) {
        limiter.check('192.168.1.1');
      }

      expect(limiter.check('192.168.1.1').allowed).toBe(false);

      limiter.reset('192.168.1.1');

      const result = limiter.check('192.168.1.1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('clear()', () => {
    it('should clear all records', () => {
      limiter.check('192.168.1.1');
      limiter.check('192.168.1.2');
      limiter.check('192.168.1.3');

      expect(limiter.activeIdentifiers).toBe(3);

      limiter.clear();

      expect(limiter.activeIdentifiers).toBe(0);
    });
  });

  describe('cleanup()', () => {
    it('should remove expired records', () => {
      const shortLimiter = new SlidingWindowRateLimiter({
        windowMs: 1000,
        maxRequests: 10,
        cleanupIntervalMs: 100,
      });

      shortLimiter.check('192.168.1.1');
      expect(shortLimiter.activeIdentifiers).toBe(1);

      jest.useFakeTimers();
      jest.advanceTimersByTime(2000);

      shortLimiter.cleanup();
      expect(shortLimiter.activeIdentifiers).toBe(0);

      jest.useRealTimers();
      shortLimiter.stopCleanup();
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      limiter.check('192.168.1.1');
      limiter.check('192.168.1.2');

      const stats = limiter.getStats();
      expect(stats.activeIdentifiers).toBe(2);
      expect(stats.maxRequests).toBe(10);
      expect(stats.windowMs).toBe(60000);
    });
  });
});

describe('Module-level functions', () => {
  let moduleLimiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    resetRateLimit('test-ip');
    resetRateLimit('ip-1');
    resetRateLimit('ip-2');
    resetRateLimit('reset-ip');
    resetRateLimit('new-ip');
    moduleLimiter = new SlidingWindowRateLimiter();
  });

  afterEach(() => {
    moduleLimiter.clear();
  });

  describe('check()', () => {
    it('should return correct result structure', () => {
      const result = check('test-ip');
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('resetAt');
      
      if (!result.allowed) {
        expect(result).toHaveProperty('retryAfter');
      }
    });

    it('should track requests per IP', () => {
      const ip1 = 'ip-1';
      const ip2 = 'ip-2';

      for (let i = 0; i < 5; i++) {
        check(ip1);
      }

      const result1 = check(ip1);
      const result2 = check(ip2);

      expect(result1.remaining).toBeLessThan(result2.remaining);
    });
  });

  describe('getRemaining()', () => {
    it('should return 10 for new IP', () => {
      expect(getRemaining('new-ip')).toBe(10);
    });
  });

  describe('resetRateLimit()', () => {
    it('should reset rate limit for IP', () => {
      for (let i = 0; i < 10; i++) {
        check('reset-ip');
      }

      expect(check('reset-ip').allowed).toBe(false);

      resetRateLimit('reset-ip');

      expect(check('reset-ip').allowed).toBe(true);
    });
  });

  describe('getRateLimiterStats()', () => {
    it('should return current stats', () => {
      const stats = getRateLimiterStats();
      
      expect(stats).toHaveProperty('activeIdentifiers');
      expect(stats).toHaveProperty('maxRequests');
      expect(stats).toHaveProperty('windowMs');
      
      expect(stats.maxRequests).toBe(10);
      expect(stats.windowMs).toBe(60000);
    });
  });
});

describe('Edge cases', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
    });
  });

  afterEach(() => {
    limiter.stopCleanup();
    limiter.clear();
  });

  it('should handle concurrent checks for same IP', () => {
    const results = [
      limiter.check('192.168.1.1'),
      limiter.check('192.168.1.1'),
    ];

    expect(results.filter(r => r.allowed)).toHaveLength(1);
  });

  it('should handle empty string identifier', () => {
    const result = limiter.check('');
    expect(result.allowed).toBe(true);
  });

  it('should handle special characters in identifier', () => {
    const result = limiter.check('192.168.1.1:8080');
    expect(result.allowed).toBe(true);
  });

  it('should handle very long identifier', () => {
    const longIp = 'a'.repeat(1000);
    const result = limiter.check(longIp);
    expect(result.allowed).toBe(true);
  });
});
