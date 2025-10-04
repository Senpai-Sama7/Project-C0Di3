/**
 * Comprehensive tests for rate limiting utilities
 */

import {
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter
} from '../../utils/rate-limiter';

describe('Rate Limiting Utilities', () => {
  describe('TokenBucketRateLimiter', () => {
    it('should allow requests within rate limit', () => {
      const limiter = new TokenBucketRateLimiter(10, 5);

      for (let i = 0; i < 10; i++) {
        const allowed = limiter.consume();
        expect(allowed).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const limiter = new TokenBucketRateLimiter(2, 1);

      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(false);
    });

    it('should refill tokens over time', async () => {
      const limiter = new TokenBucketRateLimiter(2, 2);

      // Consume all tokens
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(false);

      // Wait for refill (2 tokens per second, need at least 500ms for 1 token)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should have tokens again
      expect(limiter.consume()).toBe(true);
    });

    it('should respect burst capacity', () => {
      const limiter = new TokenBucketRateLimiter(5, 1);

      // Should allow burst of 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.consume()).toBe(true);
      }

      // 6th request should be blocked
      expect(limiter.consume()).toBe(false);
    });

    it('should get current token count', () => {
      const limiter = new TokenBucketRateLimiter(10, 5);

      expect(limiter.getTokens()).toBe(10);
      limiter.consume();
      expect(limiter.getTokens()).toBeLessThan(10);
    });

    it('should reset bucket', () => {
      const limiter = new TokenBucketRateLimiter(2, 1);

      // Consume all tokens
      limiter.consume();
      limiter.consume();
      expect(limiter.consume()).toBe(false);

      // Reset
      limiter.reset();

      // Should have full tokens again
      expect(limiter.consume()).toBe(true);
    });

    it('should calculate time until available', () => {
      const limiter = new TokenBucketRateLimiter(2, 1);

      // Consume all tokens
      limiter.consume();
      limiter.consume();

      const timeNeeded = limiter.getTimeUntilAvailable(1);
      expect(timeNeeded).toBeGreaterThan(0);
    });

    it('should wait for tokens to be available', async () => {
      const limiter = new TokenBucketRateLimiter(1, 10); // 10 tokens per second

      limiter.consume();
      
      const startTime = Date.now();
      await limiter.wait(1);
      const elapsed = Date.now() - startTime;

      // Should have waited some time for refill
      expect(elapsed).toBeGreaterThan(50);
    });
  });

  describe('SlidingWindowRateLimiter', () => {
    it('should allow requests within window', () => {
      const limiter = new SlidingWindowRateLimiter(5, 1000);

      for (let i = 0; i < 5; i++) {
        expect(limiter.consume()).toBe(true);
      }
    });

    it('should block requests exceeding window limit', () => {
      const limiter = new SlidingWindowRateLimiter(2, 1000);

      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(false);
    });

    it('should allow requests after window expires', async () => {
      const limiter = new SlidingWindowRateLimiter(1, 100);

      expect(limiter.consume()).toBe(true);
      expect(limiter.consume()).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(limiter.consume()).toBe(true);
    });

    it('should get remaining requests', () => {
      const limiter = new SlidingWindowRateLimiter(5, 1000);

      expect(limiter.getRemaining()).toBe(5);
      limiter.consume();
      expect(limiter.getRemaining()).toBe(4);
    });

    it('should reset window', () => {
      const limiter = new SlidingWindowRateLimiter(1, 1000);

      limiter.consume();
      expect(limiter.consume()).toBe(false);

      limiter.reset();
      expect(limiter.consume()).toBe(true);
    });

    it('should use sliding window correctly', async () => {
      const limiter = new SlidingWindowRateLimiter(3, 200);

      // Make 3 requests at different times
      limiter.consume();
      await new Promise(resolve => setTimeout(resolve, 50));
      limiter.consume();
      await new Promise(resolve => setTimeout(resolve, 50));
      limiter.consume();

      // Should be blocked now
      expect(limiter.consume()).toBe(false);

      // Wait for first request to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow one more request
      expect(limiter.consume()).toBe(true);
    });

    it('should wait for window to open', async () => {
      const limiter = new SlidingWindowRateLimiter(1, 200);

      limiter.consume();

      const startTime = Date.now();
      await limiter.wait();
      const elapsed = Date.now() - startTime;

      // Should have waited for window to expire
      expect(elapsed).toBeGreaterThanOrEqual(150);
    });
  });
});
