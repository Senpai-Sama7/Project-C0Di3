/**
 * Rate limiting utilities for resource protection
 */

/**
 * Token bucket rate limiter
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume tokens
   * Returns true if successful, false if rate limit exceeded
   */
  consume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait until tokens are available
   */
  async wait(tokens: number = 1): Promise<void> {
    while (!this.consume(tokens)) {
      const timeToRefill = this.getTimeUntilAvailable(tokens);
      await new Promise(resolve => setTimeout(resolve, timeToRefill));
    }
  }

  /**
   * Get time in ms until tokens are available
   */
  getTimeUntilAvailable(tokens: number): number {
    this.refill();

    if (this.tokens >= tokens) {
      return 0;
    }

    const tokensNeeded = tokens - this.tokens;
    return Math.ceil((tokensNeeded / this.refillRate) * 1000);
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset to full capacity
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Attempt to record a request
   * Returns true if allowed, false if rate limit exceeded
   */
  allow(): boolean {
    const now = Date.now();
    this.cleanup(now);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Wait until request is allowed
   */
  async wait(): Promise<void> {
    while (!this.allow()) {
      const waitTime = this.getWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get time in ms to wait until next request is allowed
   */
  getWaitTime(): number {
    const now = Date.now();
    this.cleanup(now);

    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    return Math.max(0, this.windowMs - (now - oldestRequest) + 1);
  }

  /**
   * Remove requests outside the sliding window
   */
  private cleanup(now: number): void {
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter(time => time > cutoff);
  }

  /**
   * Get current request count in window
   */
  getRequestCount(): number {
    this.cleanup(Date.now());
    return this.requests.length;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * Rate limiter with multiple strategies
 */
export interface RateLimiterConfig {
  strategy: 'token-bucket' | 'sliding-window';
  maxRequests?: number;
  windowMs?: number;
  capacity?: number;
  refillRate?: number;
}

export class RateLimiter {
  private limiter: TokenBucketRateLimiter | SlidingWindowRateLimiter;

  constructor(config: RateLimiterConfig) {
    if (config.strategy === 'token-bucket') {
      if (!config.capacity || !config.refillRate) {
        throw new Error('Token bucket strategy requires capacity and refillRate');
      }
      this.limiter = new TokenBucketRateLimiter(config.capacity, config.refillRate);
    } else {
      if (!config.maxRequests || !config.windowMs) {
        throw new Error('Sliding window strategy requires maxRequests and windowMs');
      }
      this.limiter = new SlidingWindowRateLimiter(config.maxRequests, config.windowMs);
    }
  }

  /**
   * Attempt to execute operation
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.limiter instanceof TokenBucketRateLimiter) {
      await this.limiter.wait(1);
    } else {
      await this.limiter.wait();
    }
    return await operation();
  }

  /**
   * Check if operation can proceed immediately
   */
  canProceed(): boolean {
    if (this.limiter instanceof TokenBucketRateLimiter) {
      return this.limiter.consume(1);
    } else {
      return this.limiter.allow();
    }
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.limiter.reset();
  }

  /**
   * Get metrics
   */
  getMetrics(): Record<string, unknown> {
    if (this.limiter instanceof TokenBucketRateLimiter) {
      return {
        type: 'token-bucket',
        availableTokens: this.limiter.getTokens()
      };
    } else {
      return {
        type: 'sliding-window',
        requestCount: this.limiter.getRequestCount()
      };
    }
  }
}

/**
 * Resource-specific rate limiters
 */
export class ResourceRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  private readonly defaultConfig: RateLimiterConfig;

  constructor(defaultConfig: RateLimiterConfig) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create rate limiter for resource
   */
  private getLimiter(resourceId: string, config?: RateLimiterConfig): RateLimiter {
    let limiter = this.limiters.get(resourceId);
    
    if (!limiter) {
      limiter = new RateLimiter(config || this.defaultConfig);
      this.limiters.set(resourceId, limiter);
    }
    
    return limiter;
  }

  /**
   * Execute operation with rate limiting for specific resource
   */
  async execute<T>(
    resourceId: string,
    operation: () => Promise<T>,
    config?: RateLimiterConfig
  ): Promise<T> {
    const limiter = this.getLimiter(resourceId, config);
    return await limiter.execute(operation);
  }

  /**
   * Check if operation can proceed for resource
   */
  canProceed(resourceId: string, config?: RateLimiterConfig): boolean {
    const limiter = this.getLimiter(resourceId, config);
    return limiter.canProceed();
  }

  /**
   * Reset limiter for specific resource
   */
  reset(resourceId: string): void {
    const limiter = this.limiters.get(resourceId);
    limiter?.reset();
  }

  /**
   * Reset all limiters
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  /**
   * Get metrics for all resources
   */
  getMetrics(): Map<string, Record<string, unknown>> {
    const metrics = new Map<string, Record<string, unknown>>();
    
    for (const [resourceId, limiter] of this.limiters.entries()) {
      metrics.set(resourceId, limiter.getMetrics());
    }
    
    return metrics;
  }

  /**
   * Remove limiter for resource
   */
  remove(resourceId: string): void {
    this.limiters.delete(resourceId);
  }

  /**
   * Clear all limiters
   */
  clear(): void {
    this.limiters.clear();
  }
}

/**
 * Global rate limiter instance for LLM API calls
 */
export const llmRateLimiter = new RateLimiter({
  strategy: 'token-bucket',
  capacity: 10, // 10 requests
  refillRate: 1  // 1 request per second
});

/**
 * Global rate limiter for tool executions
 */
export const toolRateLimiter = new ResourceRateLimiter({
  strategy: 'sliding-window',
  maxRequests: 5,  // 5 requests
  windowMs: 60000  // per minute
});

/**
 * Global rate limiter for memory operations
 */
export const memoryRateLimiter = new RateLimiter({
  strategy: 'token-bucket',
  capacity: 100,  // 100 operations
  refillRate: 10  // 10 operations per second
});

/**
 * Decorator for rate limiting methods
 */
export function rateLimit(config: RateLimiterConfig) {
  const limiter = new RateLimiter(config);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await limiter.execute(async () => {
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Helper to wrap async function with rate limiting
 */
export function withRateLimit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: RateLimiterConfig
): (...args: TArgs) => Promise<TResult> {
  const limiter = new RateLimiter(config);

  return async (...args: TArgs): Promise<TResult> => {
    return await limiter.execute(() => fn(...args));
  };
}
