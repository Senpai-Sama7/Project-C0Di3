/**
 * Performance optimization utilities
 */

/**
 * Memoization decorator with configurable cache
 */
export interface MemoizeOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: any[]) => string;
}

export function memoize<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult | Promise<TResult>,
  options: MemoizeOptions = {}
): (...args: TArgs) => TResult | Promise<TResult> {
  const cache = new Map<string, { value: TResult; timestamp: number }>();
  const maxSize = options.maxSize || 100;
  const ttl = options.ttl;
  const keyGenerator = options.keyGenerator || ((...args: any[]) => JSON.stringify(args));

  return (...args: TArgs): TResult | Promise<TResult> => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);

    // Check if cached value exists and is still valid
    if (cached) {
      if (!ttl || (Date.now() - cached.timestamp) < ttl) {
        return cached.value;
      } else {
        cache.delete(key);
      }
    }

    // Execute function and cache result
    const result = fn(...args);

    // Handle promises
    if (result instanceof Promise) {
      return result.then(value => {
        // Evict oldest entry if cache is full
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value as string;
          if (firstKey) {
            cache.delete(firstKey);
          }
        }

        cache.set(key, { value, timestamp: Date.now() });
        return value;
      });
    }

    // Evict oldest entry if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value as string;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * Debounce function execution
 */
export function debounce<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: TArgs): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle function execution
 */
export function throttle<TArgs extends any[]>(
  fn: (...args: TArgs) => void,
  limitMs: number
): (...args: TArgs) => void {
  let lastCall = 0;

  return (...args: TArgs): void => {
    const now = Date.now();

    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Batch async operations
 */
export class BatchProcessor<TInput, TResult> {
  private queue: Array<{
    input: TInput;
    resolve: (result: TResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing: boolean = false;
  private readonly processor: (inputs: TInput[]) => Promise<TResult[]>;
  private readonly batchSize: number;
  private readonly delayMs: number;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    processor: (inputs: TInput[]) => Promise<TResult[]>,
    options: {
      batchSize?: number;
      delayMs?: number;
    } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.delayMs = options.delayMs || 100;
  }

  /**
   * Add item to batch queue
   */
  async add(input: TInput): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this.queue.push({ input, resolve, reject });

      // Process immediately if batch is full
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else {
        // Otherwise schedule processing
        this.scheduleProcessing();
      }
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(): void {
    if (this.timeoutId) {
      return;
    }

    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.delayMs);
  }

  /**
   * Process queued items
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.processing = true;

    // Take items from queue
    const batch = this.queue.splice(0, this.batchSize);
    const inputs = batch.map(item => item.input);

    try {
      const results = await this.processor(inputs);

      // Resolve promises
      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve(results[i]);
      }
    } catch (error) {
      // Reject all promises in batch
      const err = error instanceof Error ? error : new Error(String(error));
      for (const item of batch) {
        item.reject(err);
      }
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }

  /**
   * Flush all pending items
   */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

/**
 * Parallel execution with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i;
    
    const promise = operation(item).then(result => {
      results[index] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let j = executing.length - 1; j >= 0; j--) {
        if (await Promise.race([executing[j], Promise.resolve('done')]) === 'done') {
          executing.splice(j, 1);
        }
      }
    }
  }

  // Wait for remaining promises
  await Promise.all(executing);

  return results;
}

/**
 * Lazy initialization wrapper
 */
export class Lazy<T> {
  private value?: T;
  private initialized = false;
  private readonly initializer: () => T;

  constructor(initializer: () => T) {
    this.initializer = initializer;
  }

  getValue(): T {
    if (!this.initialized) {
      this.value = this.initializer();
      this.initialized = true;
    }
    return this.value!;
  }

  reset(): void {
    this.value = undefined;
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Async lazy initialization
 */
export class AsyncLazy<T> {
  private value?: T;
  private promise?: Promise<T>;
  private readonly initializer: () => Promise<T>;

  constructor(initializer: () => Promise<T>) {
    this.initializer = initializer;
  }

  async getValue(): Promise<T> {
    if (this.value !== undefined) {
      return this.value;
    }

    if (this.promise) {
      return this.promise;
    }

    this.promise = this.initializer().then(value => {
      this.value = value;
      this.promise = undefined;
      return value;
    });

    return this.promise;
  }

  reset(): void {
    this.value = undefined;
    this.promise = undefined;
  }

  isInitialized(): boolean {
    return this.value !== undefined;
  }
}

/**
 * Object pool for reusing expensive objects
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private readonly factory: () => T;
  private readonly reset?: (obj: T) => void;
  private readonly maxSize: number;

  constructor(options: {
    factory: () => T;
    reset?: (obj: T) => void;
    initialSize?: number;
    maxSize?: number;
  }) {
    this.factory = options.factory;
    this.reset = options.reset;
    this.maxSize = options.maxSize || 100;

    // Pre-create initial objects
    const initialSize = options.initialSize || 0;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * Acquire object from pool
   */
  acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  /**
   * Release object back to pool
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      return;
    }

    this.inUse.delete(obj);

    if (this.reset) {
      this.reset(obj);
    }

    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    available: number;
    inUse: number;
    total: number;
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * Performance measurement utility
 */
export class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Measure async operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const duration = performance.now() - start;
      this.record(name, duration);
    }
  }

  /**
   * Measure sync operation
   */
  measureSync<T>(
    name: string,
    operation: () => T
  ): T {
    const start = performance.now();
    try {
      return operation();
    } finally {
      const duration = performance.now() - start;
      this.record(name, duration);
    }
  }

  /**
   * Record measurement
   */
  private record(name: string, duration: number): void {
    let measurements = this.measurements.get(name);
    if (!measurements) {
      measurements = [];
      this.measurements.set(name, measurements);
    }
    measurements.push(duration);
  }

  /**
   * Get statistics for operation
   */
  getStats(name: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    median: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const total = measurements.reduce((sum, val) => sum + val, 0);

    return {
      count: measurements.length,
      total,
      average: total / measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): Map<string, ReturnType<typeof this.getStats>> {
    const allStats = new Map();
    for (const name of this.measurements.keys()) {
      allStats.set(name, this.getStats(name));
    }
    return allStats;
  }

  /**
   * Clear measurements
   */
  clear(name?: string): void {
    if (name) {
      this.measurements.delete(name);
    } else {
      this.measurements.clear();
    }
  }
}

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();
