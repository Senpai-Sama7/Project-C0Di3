/**
 * Comprehensive tests for performance optimization utilities
 */

import {
  memoize,
  debounce,
  throttle,
  BatchProcessor,
  Lazy,
  AsyncLazy
} from '../../utils/performance';

describe('Performance Optimization Utilities', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache different arguments separately', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(6)).toBe(12);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect TTL and evict stale entries', async () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn, { ttl: 100 });

      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect max size and evict oldest entries', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoize(fn, { maxSize: 2 });

      memoized(1);
      memoized(2);
      memoized(3); // Should evict entry for 1

      expect(fn).toHaveBeenCalledTimes(3);

      memoized(1); // Should call fn again since it was evicted
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should handle async functions', async () => {
      const fn = jest.fn(async (x: number) => x * 2);
      const memoized = memoize(fn);

      expect(await memoized(5)).toBe(10);
      expect(await memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom key generator', () => {
      const fn = jest.fn((obj: {a: number, b: number}) => obj.a + obj.b);
      const memoized = memoize(fn, {
        keyGenerator: (obj) => `${obj.a}-${obj.b}`
      });

      expect(memoized({a: 1, b: 2})).toBe(3);
      expect(memoized({a: 1, b: 2})).toBe(3);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', async () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', async () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass latest arguments', async () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledWith('third');
    });

    // Note: Current implementation does not support leading edge execution option
  });

  describe('throttle', () => {
    it('should limit function execution rate', async () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 150));

      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should preserve first call', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');

      expect(fn).toHaveBeenCalledWith('first');
    });

    // Note: Current implementation does not support trailing edge execution option
  });

  describe('batchAsync', () => {
    it('should batch async operations', async () => {
      const operation = jest.fn(async (x: number) => x * 2);
      const batched = batchAsync(operation, { batchSize: 3, batchDelay: 50 });

      const results = await Promise.all([
        batched(1),
        batched(2),
        batched(3)
      ]);

      expect(results).toEqual([2, 4, 6]);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should execute batch after delay', async () => {
      const operation = jest.fn(async (x: number) => x * 2);
      const batched = batchAsync(operation, { batchSize: 10, batchDelay: 50 });

      const promise = batched(1);
      expect(operation).not.toHaveBeenCalled();

      await promise;
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should execute batch when size reached', async () => {
      const operation = jest.fn(async (x: number) => x * 2);
      const batched = batchAsync(operation, { batchSize: 2, batchDelay: 1000 });

      const results = await Promise.all([
        batched(1),
        batched(2)
      ]);

      expect(results).toEqual([2, 4]);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const operation = jest.fn(async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return x * 2;
      });

      const batched = batchAsync(operation, { 
        batchSize: 10, 
        batchDelay: 10,
        concurrency: 2
      });

      await Promise.all([
        batched(1),
        batched(2),
        batched(3),
        batched(4)
      ]);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('lazyInit', () => {
    it('should initialize value on first access', () => {
      const initializer = jest.fn(() => 'value');
      const lazy = lazyInit(initializer);

      expect(initializer).not.toHaveBeenCalled();
      expect(lazy.value).toBe('value');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should cache initialized value', () => {
      const initializer = jest.fn(() => 'value');
      const lazy = lazyInit(initializer);

      expect(lazy.value).toBe('value');
      expect(lazy.value).toBe('value');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should report initialization status', () => {
      const lazy = lazyInit(() => 'value');

      expect(lazy.isInitialized).toBe(false);
      lazy.value;
      expect(lazy.isInitialized).toBe(true);
    });

    it('should support reset', () => {
      const initializer = jest.fn(() => 'value');
      const lazy = lazyInit(initializer);

      lazy.value;
      expect(initializer).toHaveBeenCalledTimes(1);

      lazy.reset();
      expect(lazy.isInitialized).toBe(false);

      lazy.value;
      expect(initializer).toHaveBeenCalledTimes(2);
    });
  });

  describe('lazyInitAsync', () => {
    it('should initialize value asynchronously on first access', async () => {
      const initializer = jest.fn(async () => 'value');
      const lazy = lazyInitAsync(initializer);

      expect(initializer).not.toHaveBeenCalled();
      expect(await lazy.value()).toBe('value');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should cache initialized value', async () => {
      const initializer = jest.fn(async () => 'value');
      const lazy = lazyInitAsync(initializer);

      expect(await lazy.value()).toBe('value');
      expect(await lazy.value()).toBe('value');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent access', async () => {
      const initializer = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'value';
      });
      const lazy = lazyInitAsync(initializer);

      const results = await Promise.all([
        lazy.value(),
        lazy.value(),
        lazy.value()
      ]);

      expect(results).toEqual(['value', 'value', 'value']);
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('should report initialization status', async () => {
      const lazy = lazyInitAsync(async () => 'value');

      expect(lazy.isInitialized).toBe(false);
      await lazy.value();
      expect(lazy.isInitialized).toBe(true);
    });

    it('should support reset', async () => {
      const initializer = jest.fn(async () => 'value');
      const lazy = lazyInitAsync(initializer);

      await lazy.value();
      expect(initializer).toHaveBeenCalledTimes(1);

      lazy.reset();
      expect(lazy.isInitialized).toBe(false);

      await lazy.value();
      expect(initializer).toHaveBeenCalledTimes(2);
    });
  });
});
