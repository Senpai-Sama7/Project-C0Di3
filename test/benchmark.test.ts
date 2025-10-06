/**
 * Performance benchmarks for vector operations
 * Measures speedup of fused implementations vs baseline
 */

import { cosineSimilarity, cosineSimilarityFused } from '../reasoning/vector-ops';

// Helper to generate random vectors
function randomVector(size: number, min = -1, max = 1): number[] {
  return Array.from({ length: size }, () => Math.random() * (max - min) + min);
}

// Helper to measure execution time
function benchmark(name: string, fn: () => void, iterations: number): number {
  // Warmup
  for (let i = 0; i < 10; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.log(`${name}: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(4)}ms avg (${iterations} iterations)`);
  
  return totalTime;
}

// Main benchmark suite
function runBenchmarks() {
  console.log('\n=== Vector Operations Performance Benchmarks ===\n');
  
  const results: Array<{
    function: string;
    vectorSize: number;
    iterations: number;
    baselineMs: number;
    fusedMs: number;
    speedup: number;
  }> = [];
  
  // Test different vector sizes
  const testCases = [
    { size: 10, iterations: 100000, name: 'Small vectors (10 dims)' },
    { size: 50, iterations: 50000, name: 'Medium vectors (50 dims)' },
    { size: 128, iterations: 20000, name: 'Common embedding (128 dims)' },
    { size: 384, iterations: 10000, name: 'Sentence embeddings (384 dims)' },
    { size: 768, iterations: 5000, name: 'Large embeddings (768 dims)' },
    { size: 1536, iterations: 2000, name: 'XL embeddings (1536 dims)' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    
    // Generate test vectors
    const vectors: Array<[number[], number[]]> = [];
    for (let i = 0; i < testCase.iterations; i++) {
      vectors.push([randomVector(testCase.size), randomVector(testCase.size)]);
    }
    
    // Benchmark baseline
    const baselineTime = benchmark(
      'Baseline',
      () => {
        const idx = Math.floor(Math.random() * vectors.length);
        const [a, b] = vectors[idx];
        cosineSimilarity(a, b);
      },
      testCase.iterations
    );
    
    // Benchmark fused
    const fusedTime = benchmark(
      'Fused   ',
      () => {
        const idx = Math.floor(Math.random() * vectors.length);
        const [a, b] = vectors[idx];
        cosineSimilarityFused(a, b);
      },
      testCase.iterations
    );
    
    const speedup = baselineTime / fusedTime;
    console.log(`Speedup: ${speedup.toFixed(2)}x`);
    
    results.push({
      function: 'cosineSimilarity',
      vectorSize: testCase.size,
      iterations: testCase.iterations,
      baselineMs: baselineTime,
      fusedMs: fusedTime,
      speedup: speedup
    });
  }
  
  // Summary
  console.log('\n=== Summary ===\n');
  console.log('| Vector Size | Iterations | Baseline (ms) | Fused (ms) | Speedup |');
  console.log('|-------------|------------|---------------|------------|---------|');
  
  for (const result of results) {
    console.log(
      `| ${result.vectorSize.toString().padStart(11)} | ` +
      `${result.iterations.toString().padStart(10)} | ` +
      `${result.baselineMs.toFixed(2).padStart(13)} | ` +
      `${result.fusedMs.toFixed(2).padStart(10)} | ` +
      `${result.speedup.toFixed(2)}x |`
    );
  }
  
  const avgSpeedup = results.reduce((sum, r) => sum + r.speedup, 0) / results.length;
  console.log(`\nAverage speedup: ${avgSpeedup.toFixed(2)}x`);
  
  // Save results to JSON
  const benchmarkData = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    },
    results: results,
    summary: {
      averageSpeedup: avgSpeedup,
      minSpeedup: Math.min(...results.map(r => r.speedup)),
      maxSpeedup: Math.max(...results.map(r => r.speedup))
    }
  };
  
  const fs = require('fs');
  const path = require('path');
  
  // Ensure artifacts directory exists
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  
  // Write benchmark results
  const benchmarkPath = path.join(artifactsDir, 'bench.json');
  fs.writeFileSync(benchmarkPath, JSON.stringify(benchmarkData, null, 2));
  console.log(`\nBenchmark results saved to: ${benchmarkPath}`);
}

// Run benchmarks if executed directly
if (require.main === module) {
  runBenchmarks();
}

export { runBenchmarks };
