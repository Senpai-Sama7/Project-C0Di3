# Testing Guide - Project C0Di3

Comprehensive guide for testing the Project C0Di3 codebase.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Project C0Di3 uses **Jest** as the testing framework with TypeScript support via **ts-jest**.

### Test Philosophy

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test interactions between components
- **Performance Tests**: Benchmark critical operations
- **Security Tests**: Validate security measures

### Current Status

- Total Test Files: 9
- Test Coverage: ~20% (target: 85%+)
- Passing Tests: 71/82
- Test Framework: Jest 29.7.0

---

## Test Structure

```
test/
├── benchmark.test.ts              # Performance benchmarks
├── equivalence.test.ts            # Equivalence testing
├── integration.test.ts            # Integration tests
├── reasoning/                     # Reasoning engine tests
│   └── darwin-godel-engine.test.ts
└── utils/                         # Utility tests
    ├── error-handling.test.ts
    ├── performance.test.ts
    ├── rate-limiter.test.ts
    └── validation.test.ts
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns on file changes)
npm test -- --watch

# Run tests with coverage report
npm test -- --coverage

# Run specific test file
npm test -- test/utils/validation.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="email validation"
```

### With Environment Variables

Some tests require environment variables:

```bash
# Set encryption key for integration tests
MEMORY_ENCRYPTION_KEY="test-key-minimum-32-characters-long" npm test

# Run with custom configuration
NODE_ENV=test LOG_LEVEL=error npm test
```

### Advanced Options

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests in band (sequentially, useful for debugging)
npm test -- --runInBand

# Update snapshots
npm test -- --updateSnapshot

# Run only failed tests from previous run
npm test -- --onlyFailures

# Set custom timeout (in milliseconds)
npm test -- --testTimeout=10000
```

---

## Writing Tests

### Unit Test Template

```typescript
/**
 * Test file for [Component Name]
 */

import { functionToTest } from '../../path/to/module';

describe('Component Name', () => {
  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest('input');
      expect(result).toBe('expected output');
    });

    it('should handle edge case', () => {
      expect(() => functionToTest(null))
        .toThrow('Expected error message');
    });

    it('should validate input', () => {
      const result = functionToTest('valid input');
      expect(result).toBeDefined();
      expect(result).toMatch(/pattern/);
    });
  });
});
```

### Async Test Example

```typescript
describe('Async Operations', () => {
  it('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBe('expected');
  });

  it('should handle async errors', async () => {
    await expect(asyncFunctionThatFails())
      .rejects
      .toThrow('Expected error');
  });

  it('should resolve within timeout', async () => {
    const result = await promiseFunction();
    expect(result).toBeDefined();
  }, 5000); // 5 second timeout
});
```

### Mock Examples

```typescript
import { jest } from '@jest/globals';

describe('Mocking', () => {
  it('should mock function calls', () => {
    const mockFn = jest.fn().mockReturnValue('mocked');
    
    const result = mockFn('input');
    
    expect(mockFn).toHaveBeenCalledWith('input');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result).toBe('mocked');
  });

  it('should mock implementation', () => {
    const mockFn = jest.fn((x: number) => x * 2);
    
    expect(mockFn(5)).toBe(10);
    expect(mockFn(3)).toBe(6);
  });

  it('should mock different return values', () => {
    const mockFn = jest.fn()
      .mockReturnValueOnce('first')
      .mockReturnValueOnce('second')
      .mockReturnValue('default');
    
    expect(mockFn()).toBe('first');
    expect(mockFn()).toBe('second');
    expect(mockFn()).toBe('default');
  });
});
```

### Testing Classes

```typescript
describe('MyClass', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass({ config: 'value' });
  });

  afterEach(() => {
    instance.cleanup();
  });

  it('should initialize correctly', () => {
    expect(instance).toBeDefined();
    expect(instance.config).toBe('value');
  });

  it('should handle method calls', () => {
    const result = instance.method('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example

```typescript
describe('Integration: Memory System', () => {
  let memorySystem: MemorySystem;

  beforeAll(() => {
    // Setup shared resources
    process.env.MEMORY_ENCRYPTION_KEY = 'test-key-minimum-32-characters-long';
  });

  beforeEach(() => {
    memorySystem = new MemorySystem({
      vectorStore: 'in-memory',
      cacheSize: 100
    });
  });

  afterEach(async () => {
    await memorySystem.cleanup();
  });

  it('should store and retrieve memories', async () => {
    await memorySystem.store('key', { data: 'value' });
    const result = await memorySystem.retrieve('key');
    expect(result.data).toBe('value');
  });

  it('should handle memory search', async () => {
    await memorySystem.store('doc1', { content: 'security testing' });
    await memorySystem.store('doc2', { content: 'performance tuning' });
    
    const results = await memorySystem.search('security');
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('security');
  });
});
```

---

## Test Coverage

### Viewing Coverage

```bash
# Generate coverage report
npm test -- --coverage

# Coverage report is saved to coverage/
# Open coverage/lcov-report/index.html in browser
```

### Coverage Thresholds

Configure in `jest.config.js`:

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### What to Focus On

**High Priority** (Must have 90%+ coverage):
- Security validation functions
- Authentication/authorization logic
- Error handling utilities
- Input sanitization

**Medium Priority** (Target 80%):
- Core business logic
- Service layer functions
- Memory operations
- Tool execution

**Lower Priority** (Target 60%):
- UI/presentation layer
- Configuration management
- Logging utilities

---

## Continuous Integration

Tests run automatically on:
- Every push to master/main/develop
- Every pull request
- Scheduled weekly runs

### CI Test Commands

```yaml
# In GitHub Actions
- name: Run tests
  env:
    MEMORY_ENCRYPTION_KEY: test-key-minimum-32-chars
  run: npm test -- --coverage --maxWorkers=2
```

### Local CI Simulation

```bash
# Run tests as CI would
npm ci  # Clean install
npm run build
MEMORY_ENCRYPTION_KEY="test-key-minimum-32-characters-long" npm test -- --coverage --maxWorkers=2
```

---

## Best Practices

### 1. Test Naming

```typescript
// ❌ Bad
it('test1', () => { });

// ✅ Good
it('should return error when email is invalid', () => { });
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [1, 2, 3, 4, 5];
  const calculator = new Calculator();
  
  // Act
  const total = calculator.sum(items);
  
  // Assert
  expect(total).toBe(15);
});
```

### 3. Test One Thing

```typescript
// ❌ Bad - tests multiple things
it('should work', () => {
  expect(validate('email')).toBe(true);
  expect(format('email')).toBe('formatted');
  expect(send('email')).toBe('sent');
});

// ✅ Good - separate tests
it('should validate email', () => {
  expect(validate('email')).toBe(true);
});

it('should format email', () => {
  expect(format('email')).toBe('formatted');
});
```

### 4. Use Descriptive Assertions

```typescript
// ❌ Bad
expect(result).toBeTruthy();

// ✅ Good
expect(result.status).toBe('success');
expect(result.data).toHaveLength(3);
```

### 5. Clean Up Resources

```typescript
describe('File Operations', () => {
  const testFile = '/tmp/test-file.txt';

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  it('should create file', () => {
    createFile(testFile, 'content');
    expect(fs.existsSync(testFile)).toBe(true);
  });
});
```

### 6. Test Error Cases

```typescript
describe('Input Validation', () => {
  it('should accept valid input', () => {
    expect(validate('valid')).toBe(true);
  });

  it('should reject empty input', () => {
    expect(() => validate('')).toThrow('Input cannot be empty');
  });

  it('should reject invalid format', () => {
    expect(() => validate('invalid!')).toThrow('Invalid format');
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Module Not Found Errors

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. Type Errors in Tests

```typescript
// Add explicit types
const mockFn: jest.Mock<string, [number]> = jest.fn();
```

#### 3. Timeout Errors

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  await slowOperation();
}, 30000); // 30 seconds
```

#### 4. Environment Variable Issues

```bash
# Set in test command
MEMORY_ENCRYPTION_KEY="test-key-32-chars-minimum" npm test

# Or create .env.test file
cp .env.template .env.test
# Edit .env.test with test values
```

#### 5. Coverage Not Updating

```bash
# Clear coverage directory
rm -rf coverage/

# Run tests with fresh coverage
npm test -- --coverage --no-cache
```

### Debug Mode

```bash
# Run Jest with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect in Chrome
```

### Verbose Output

```bash
# See full test output
npm test -- --verbose --no-coverage

# See only failed tests
npm test -- --verbose --onlyFailures
```

---

## Test Checklist

Before submitting code:

- [ ] All tests pass locally
- [ ] New code has test coverage
- [ ] Tests follow naming conventions
- [ ] No skipped tests without reason
- [ ] Integration tests pass with real dependencies
- [ ] Coverage meets minimum thresholds
- [ ] Tests are documented where complex
- [ ] Mock data is realistic
- [ ] Edge cases are covered
- [ ] Error paths are tested

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing Guide](https://www.typescriptlang.org/docs/handbook/testing.html)

---

**Last Updated**: 2024  
**Version**: 1.0.0
