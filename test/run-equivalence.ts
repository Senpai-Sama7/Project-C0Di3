#!/usr/bin/env node
/**
 * Simple test runner for equivalence tests
 * Since Jest has module issues, we'll run tests directly
 */

// Mock Jest describe/test/expect API
const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
const describes: Array<{ name: string; tests: typeof tests }> = [];
let currentDescribe: { name: string; tests: typeof tests } | null = null;

global.describe = function(name: string, fn: () => void) {
  const prev = currentDescribe;
  currentDescribe = { name, tests: [] };
  describes.push(currentDescribe);
  fn();
  currentDescribe = prev;
} as any;

global.test = function(name: string, fn: () => void | Promise<void>) {
  if (currentDescribe) {
    currentDescribe.tests.push({ name, fn });
  } else {
    tests.push({ name, fn });
  }
} as any;

global.expect = function(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    }
  };
} as any;

// Load the test file
require('./test/equivalence.test.ts');

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  console.log('\n=== Running Equivalence Tests ===\n');
  
  for (const desc of describes) {
    console.log(`\n${desc.name}`);
    for (const test of desc.tests) {
      try {
        await test.fn();
        console.log(`  ✓ ${test.name}`);
        passed++;
      } catch (error) {
        console.log(`  ✗ ${test.name}`);
        console.log(`    Error: ${(error as Error).message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
