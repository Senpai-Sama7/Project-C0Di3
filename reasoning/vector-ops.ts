/**
 * Optimized vector operations module
 * Contains fused and optimized implementations for hot path computations
 */

/**
 * Standard cosine similarity implementation (baseline)
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity between vectors a and b
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  return (magA && magB) ? dot / (magA * magB) : 0;
}

/**
 * Fused cosine similarity implementation (optimized)
 * Combines operations to reduce loop iterations and improve cache locality
 * Uses manual loop unrolling for better performance
 * 
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity between vectors a and b
 */
export function cosineSimilarityFused(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  
  // Early exit for empty vectors
  if (len === 0) return 0;
  
  let dot = 0;
  let magA = 0;
  let magB = 0;
  
  // Process 4 elements at a time for better performance (loop unrolling)
  const unrollLen = len - (len % 4);
  let i = 0;
  
  for (; i < unrollLen; i += 4) {
    const a0 = a[i], a1 = a[i + 1], a2 = a[i + 2], a3 = a[i + 3];
    const b0 = b[i], b1 = b[i + 1], b2 = b[i + 2], b3 = b[i + 3];
    
    dot += a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
    magA += a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    magB += b0 * b0 + b1 * b1 + b2 * b2 + b3 * b3;
  }
  
  // Handle remaining elements
  for (; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  
  // Fused square root calculation with early exit
  if (magA === 0 || magB === 0) return 0;
  
  // Use faster inverse square root approximation for better performance
  const normA = Math.sqrt(magA);
  const normB = Math.sqrt(magB);
  
  return dot / (normA * normB);
}

/**
 * Select the appropriate cosine similarity implementation based on environment
 * Uses FUSION_ON environment variable to enable optimized path
 * 
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity between vectors a and b
 */
export function cosineSimilarityAuto(a: number[], b: number[]): number {
  const fusionEnabled = process.env.FUSION_ON === '1';
  
  if (fusionEnabled) {
    return cosineSimilarityFused(a, b);
  }
  
  return cosineSimilarity(a, b);
}
