/**
 * Equivalence and performance tests for vector operations
 * Ensures fused implementations maintain correctness while improving performance
 */

import { cosineSimilarity, cosineSimilarityFused, cosineSimilarityAuto } from '../reasoning/vector-ops';

describe('Vector Operations - Equivalence Tests', () => {
  // Helper to generate random vectors
  function randomVector(size: number, min = -1, max = 1): number[] {
    return Array.from({ length: size }, () => Math.random() * (max - min) + min);
  }

  // Helper to check if two numbers are approximately equal
  function approxEqual(a: number, b: number, epsilon = 1e-10): boolean {
    return Math.abs(a - b) < epsilon;
  }

  describe('Cosine Similarity - Correctness', () => {
    test('should handle identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      
      const baseline = cosineSimilarity(vec, vec);
      const fused = cosineSimilarityFused(vec, vec);
      
      expect(approxEqual(baseline, 1.0)).toBe(true);
      expect(approxEqual(fused, 1.0)).toBe(true);
      expect(approxEqual(baseline, fused)).toBe(true);
    });

    test('should handle orthogonal vectors', () => {
      const vec1 = [1, 0, 0, 0];
      const vec2 = [0, 1, 0, 0];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(approxEqual(baseline, 0.0)).toBe(true);
      expect(approxEqual(fused, 0.0)).toBe(true);
      expect(approxEqual(baseline, fused)).toBe(true);
    });

    test('should handle opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(approxEqual(baseline, -1.0)).toBe(true);
      expect(approxEqual(fused, -1.0)).toBe(true);
      expect(approxEqual(baseline, fused)).toBe(true);
    });

    test('should handle empty vectors', () => {
      const vec1: number[] = [];
      const vec2: number[] = [];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(baseline).toBe(0);
      expect(fused).toBe(0);
      expect(baseline).toBe(fused);
    });

    test('should handle zero vectors', () => {
      const vec1 = [0, 0, 0, 0];
      const vec2 = [1, 2, 3, 4];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(baseline).toBe(0);
      expect(fused).toBe(0);
      expect(baseline).toBe(fused);
    });

    test('should handle different length vectors', () => {
      const vec1 = [1, 2, 3, 4, 5];
      const vec2 = [1, 2, 3];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(approxEqual(baseline, fused)).toBe(true);
    });

    test('should handle unit vectors at angles', () => {
      // Two unit vectors at 45 degrees
      const angle = Math.PI / 4;
      const vec1 = [1, 0];
      const vec2 = [Math.cos(angle), Math.sin(angle)];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(approxEqual(baseline, Math.cos(angle))).toBe(true);
      expect(approxEqual(fused, Math.cos(angle))).toBe(true);
      expect(approxEqual(baseline, fused)).toBe(true);
    });
  });

  describe('Cosine Similarity - Randomized Equivalence Tests', () => {
    test('should match baseline on 100 random small vectors', () => {
      for (let i = 0; i < 100; i++) {
        const size = Math.floor(Math.random() * 20) + 1;
        const vec1 = randomVector(size);
        const vec2 = randomVector(size);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });

    test('should match baseline on 50 random medium vectors', () => {
      for (let i = 0; i < 50; i++) {
        const size = Math.floor(Math.random() * 100) + 20;
        const vec1 = randomVector(size);
        const vec2 = randomVector(size);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });

    test('should match baseline on 20 random large vectors', () => {
      for (let i = 0; i < 20; i++) {
        const size = Math.floor(Math.random() * 500) + 100;
        const vec1 = randomVector(size);
        const vec2 = randomVector(size);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });

    test('should match baseline with extreme values', () => {
      for (let i = 0; i < 50; i++) {
        const size = Math.floor(Math.random() * 50) + 10;
        const vec1 = randomVector(size, -1000, 1000);
        const vec2 = randomVector(size, -1000, 1000);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });

    test('should match baseline with tiny values', () => {
      for (let i = 0; i < 50; i++) {
        const size = Math.floor(Math.random() * 50) + 10;
        const vec1 = randomVector(size, -0.001, 0.001);
        const vec2 = randomVector(size, -0.001, 0.001);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });
  });

  describe('Cosine Similarity - Edge Cases', () => {
    test('should handle vectors with NaN values gracefully', () => {
      const vec1 = [1, 2, NaN, 4];
      const vec2 = [1, 2, 3, 4];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      // Both should produce NaN or handle it consistently
      expect(isNaN(baseline) === isNaN(fused)).toBe(true);
    });

    test('should handle vectors with Infinity values', () => {
      const vec1 = [1, 2, Infinity, 4];
      const vec2 = [1, 2, 3, 4];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      // Both should handle infinity consistently
      expect(approxEqual(baseline, fused) || (isNaN(baseline) && isNaN(fused))).toBe(true);
    });

    test('should handle very small magnitude vectors', () => {
      const vec1 = [1e-150, 2e-150, 3e-150];
      const vec2 = [1e-150, 2e-150, 3e-150];
      
      const baseline = cosineSimilarity(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      // Should be close to 1.0 or both be 0
      expect(approxEqual(baseline, fused, 1e-5) || (baseline === 0 && fused === 0)).toBe(true);
    });

    test('should handle non-multiple-of-4 sized vectors', () => {
      // Test various sizes that are not multiples of 4
      const sizes = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13];
      
      for (const size of sizes) {
        const vec1 = randomVector(size);
        const vec2 = randomVector(size);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });

    test('should handle exact-multiple-of-4 sized vectors', () => {
      // Test sizes that are exact multiples of 4
      const sizes = [4, 8, 12, 16, 20, 100, 256];
      
      for (const size of sizes) {
        const vec1 = randomVector(size);
        const vec2 = randomVector(size);
        
        const baseline = cosineSimilarity(vec1, vec2);
        const fused = cosineSimilarityFused(vec1, vec2);
        
        expect(approxEqual(baseline, fused, 1e-9)).toBe(true);
      }
    });
  });

  describe('Cosine Similarity Auto - Feature Flag', () => {
    const originalEnv = process.env.FUSION_ON;

    afterEach(() => {
      // Restore original environment
      if (originalEnv !== undefined) {
        process.env.FUSION_ON = originalEnv;
      } else {
        delete process.env.FUSION_ON;
      }
    });

    test('should use baseline when FUSION_ON is not set', () => {
      delete process.env.FUSION_ON;
      
      const vec1 = [1, 2, 3, 4];
      const vec2 = [2, 3, 4, 5];
      
      const result = cosineSimilarityAuto(vec1, vec2);
      const baseline = cosineSimilarity(vec1, vec2);
      
      expect(approxEqual(result, baseline)).toBe(true);
    });

    test('should use baseline when FUSION_ON is 0', () => {
      process.env.FUSION_ON = '0';
      
      const vec1 = [1, 2, 3, 4];
      const vec2 = [2, 3, 4, 5];
      
      const result = cosineSimilarityAuto(vec1, vec2);
      const baseline = cosineSimilarity(vec1, vec2);
      
      expect(approxEqual(result, baseline)).toBe(true);
    });

    test('should use fused when FUSION_ON is 1', () => {
      process.env.FUSION_ON = '1';
      
      const vec1 = [1, 2, 3, 4];
      const vec2 = [2, 3, 4, 5];
      
      const result = cosineSimilarityAuto(vec1, vec2);
      const fused = cosineSimilarityFused(vec1, vec2);
      
      expect(approxEqual(result, fused)).toBe(true);
    });

    test('auto should always produce correct results regardless of flag', () => {
      const vec1 = randomVector(100);
      const vec2 = randomVector(100);
      
      // Test with flag off
      delete process.env.FUSION_ON;
      const resultOff = cosineSimilarityAuto(vec1, vec2);
      
      // Test with flag on
      process.env.FUSION_ON = '1';
      const resultOn = cosineSimilarityAuto(vec1, vec2);
      
      // Both should produce approximately the same result
      expect(approxEqual(resultOff, resultOn, 1e-9)).toBe(true);
    });
  });
});
