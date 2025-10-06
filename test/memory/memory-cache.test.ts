/**
 * Tests for Memory Cache utility
 */

import { MemoryCache } from '../../memory/memory-cache';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>({ maxSize: 3, ttl: 1000 });
  });

  describe('initialization', () => {
    it('should create cache with default options', () => {
      const defaultCache = new MemoryCache();
      expect(defaultCache).toBeDefined();
    });

    it('should create cache with custom options', () => {
      const customCache = new MemoryCache({ maxSize: 10, ttl: 5000 });
      expect(customCache).toBeDefined();
    });
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('size limits', () => {
    it('should respect max size limit', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict oldest

      expect(cache.has('key4')).toBe(true);
    });

    it('should evict items when size limit reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');

      // At least one of the first keys should be evicted
      const firstKeyEvicted = !cache.has('key1') || !cache.has('key2');
      expect(firstKeyEvicted).toBe(true);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new MemoryCache<string>({ ttl: 100 });
      
      shortCache.set('key1', 'value1');
      expect(shortCache.get('key1')).toBe('value1');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortCache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', async () => {
      const longCache = new MemoryCache<string>({ ttl: 1000 });
      
      longCache.set('key1', 'value1');
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(longCache.get('key1')).toBe('value1');
    });
  });

  describe('update operations', () => {
    it('should update existing values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('complex types', () => {
    it('should cache objects', () => {
      const objectCache = new MemoryCache<{ data: string }>();
      const obj = { data: 'test' };
      
      objectCache.set('obj', obj);
      expect(objectCache.get('obj')).toEqual(obj);
    });

    it('should cache arrays', () => {
      const arrayCache = new MemoryCache<number[]>();
      const arr = [1, 2, 3];
      
      arrayCache.set('arr', arr);
      expect(arrayCache.get('arr')).toEqual(arr);
    });
  });
});
