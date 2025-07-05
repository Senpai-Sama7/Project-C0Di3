import { IMemory } from '../types';

export class MemoryCache {
  private cache: Map<string, any> = new Map();
  private hitCount = 0;
  private missCount = 0;

  constructor(options: any) {}

  async get(key: string): Promise<any | null> {
    const value = this.cache.get(key);
    if (value) {
      this.hitCount++;
      return value;
    }
    this.missCount++;
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  size(): number {
    return this.cache.size;
  }

  hitRate(): number {
    const total = this.hitCount + this.missCount;
    if (total === 0) {
      return 0;
    }
    return this.hitCount / total;
  }

  async load(): Promise<void> {}

  async persist(): Promise<void> {}
}
