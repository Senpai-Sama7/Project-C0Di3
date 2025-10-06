---
layout: default
title: Project C0Di3 API Documentation
---

# Project C0Di3 API Documentation

**Version:** 1.0.0  
**Last Updated:** 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Reasoning System](#reasoning-system)
4. [Memory System](#memory-system)
5. [Utilities](#utilities)
6. [Services](#services)
7. [Tools](#tools)
8. [Configuration](#configuration)

---

## Overview

Project C0Di3 is a cybersecurity AI agent system that combines multiple advanced reasoning strategies, comprehensive memory management, and integration with security tools.

### Key Features

- **Multi-Strategy Reasoning**: Darwin-Gödel Engine, Absolute Zero Reasoner, and Zero-Shot Reasoning
- **Comprehensive Memory System**: Semantic, Episodic, Procedural, and Working Memory
- **Security Tools Integration**: Red team and blue team tools
- **Production-Ready**: Input validation, error handling, rate limiting, and performance optimization

---

## Core Components

### GemmaAgent

The main entry point for the system.

```typescript
import { GemmaAgent } from './gemma3n:4B-agent';

const agent = new GemmaAgent({
  client: llmClient,
  memory: memorySystem,
  toolRegistry: toolRegistry,
  eventBus: eventBus
});

// Process user input
const response = await agent.processInput('Analyze this network vulnerability');
```

#### Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `client` | `LLMClient` | LLM client for generating responses |
| `memory` | `MemorySystem` | Memory system instance |
| `toolRegistry` | `ToolRegistry` | Registry of available tools |
| `eventBus` | `EventBus` | Event bus for system events |

---

## Reasoning System

### ReasoningEngine

Main reasoning coordinator that combines multiple strategies.

```typescript
import { ReasoningEngine } from './reasoning/reasoning-engine';

const engine = new ReasoningEngine({
  client: llmClient,
  memory: memorySystem,
  toolRegistry: toolRegistry,
  eventBus: eventBus,
  zeroShotEnabled: true
});

// Generate reasoning plan
const plan = await engine.generatePlan(input, context);

// Validate plan
const isValid = await engine.validateReasoningProcess(plan);

// Execute plan
const result = await engine.executeReasoningPlan(plan, context);
```

#### Key Methods

**`generatePlan(input, context, options)`**
- Generates a structured reasoning plan based on input complexity
- Returns: `Promise<ReasoningPlan>`

**`validateReasoningProcess(plan)`**
- Validates plan structure, dependencies, and tool availability
- Returns: `Promise<boolean>`

**`executeReasoningPlan(plan, context)`**
- Executes a reasoning plan and returns results
- Returns: `Promise<ReasoningResult>`

### Darwin-Gödel Engine

Advanced reasoning system combining evolutionary algorithms with formal logic.

```typescript
import { DarwinGodelEngine } from './reasoning/darwin-godel-engine';

const engine = new DarwinGodelEngine({
  client: llmClient,
  memory: memorySystem,
  evolutionaryParams: {
    mutationRate: 0.1,
    crossoverRate: 0.7,
    populationSize: 5,
    maxGenerations: 3
  },
  verificationParams: {
    threshold: 0.9,
    consistencyCheck: true
  }
});

const plan = await engine.generatePlan(input, context, relevantMemories);
```

#### Evolutionary Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mutationRate` | `number` | `0.1` | Probability of hypothesis mutation |
| `crossoverRate` | `number` | `0.7` | Probability of hypothesis crossover |
| `populationSize` | `number` | `5` | Number of hypotheses in population |
| `maxGenerations` | `number` | `3` | Maximum evolutionary generations |

#### Verification Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | `number` | `0.9` | Verification confidence threshold |
| `consistencyCheck` | `boolean` | `true` | Enable consistency checking |

---

## Memory System

### MemorySystem

Comprehensive memory management with multiple memory types.

```typescript
import { MemorySystem } from './memory/memory-system';

const memory = new MemorySystem({
  vectorStore: 'in-memory', // or 'chromadb', 'postgres'
  persistencePath: './data/memory',
  encryptionKey: process.env.MEMORY_ENCRYPTION_KEY, // Required, min 32 chars
  cacheSize: 10000,
  cacheTTL: 3600
});

// Initialize
await memory.initialize();

// Store interaction
await memory.storeInteraction(input, result, context);

// Query memories
const relevant = await memory.query('security vulnerability', { limit: 5 });
```

#### Constructor Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `vectorStore` | `string` | No | Vector store type: 'in-memory', 'chromadb', 'postgres' |
| `persistencePath` | `string` | No | Path for persisting memory data |
| `encryptionKey` | `string` | **Yes** | Encryption key (min 32 characters) |
| `cacheSize` | `number` | No | Maximum cache size (default: 10000) |
| `cacheTTL` | `number` | No | Cache TTL in seconds (default: 3600) |

⚠️ **Security Note**: The `encryptionKey` is mandatory and must be at least 32 characters. Set via environment variable `MEMORY_ENCRYPTION_KEY`.

#### Key Methods

**`store(memory)`**
- Store a memory entry
- Returns: `Promise<void>`

**`query(query, options)`**
- Query memories by semantic similarity
- Returns: `Promise<Memory[]>`

**`storeInteraction(input, result, context)`**
- Store a complete interaction
- Returns: `Promise<void>`

---

## Utilities

### Validation

Input validation utilities for security and data integrity.

```typescript
import {
  validateNonEmptyString,
  validateEmail,
  validateIPAddress,
  validateFilePath,
  sanitizeInput,
  validateCommandArgs
} from './utils/validation';

// Validate inputs
const email = validateEmail(userInput, 'email');
const ip = validateIPAddress(ipInput, 'ipAddress');
const path = validateFilePath(pathInput, 'filePath');

// Sanitize user input
const safe = sanitizeInput(userInput, {
  maxLength: 1000,
  allowHtml: false
});

// Validate command arguments (prevents injection)
const safeArgs = validateCommandArgs(args);
```

#### Validation Functions

| Function | Description |
|----------|-------------|
| `validateNonEmptyString(value, field)` | Validates non-empty string |
| `validateEmail(value, field)` | Validates email format |
| `validateNumberInRange(value, field, min, max)` | Validates number in range |
| `validateIPAddress(value, field)` | Validates IPv4/IPv6 address |
| `validateHostname(value, field)` | Validates hostname format |
| `validateFilePath(value, field)` | Validates file path (prevents traversal) |
| `validatePattern(value, field, pattern)` | Validates against regex pattern |
| `sanitizeInput(input, options)` | Sanitizes input (prevents injection) |
| `validateCommandArgs(args)` | Validates command arguments (prevents shell injection) |

### Error Handling

Comprehensive error handling with typed errors and recovery strategies.

```typescript
import {
  ReasoningError,
  MemoryError,
  ToolExecutionError,
  ValidationError,
  withRetry,
  CircuitBreaker,
  safeExecute
} from './utils/error-handling';

// Throw typed errors
throw new ReasoningError('Failed to generate plan', { input, context });
throw new ToolExecutionError('nmap', 'Execution failed', { exitCode: 1 });

// Retry with exponential backoff
const result = await withRetry(
  async () => await operation(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2
  }
);

// Circuit breaker pattern
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenRequests: 3
});

const result = await breaker.execute(async () => await externalService());

// Safe execution
const { success, data, error } = await safeExecute(
  async () => await riskyOperation(),
  (error) => console.error('Operation failed:', error)
);
```

#### Error Classes

| Class | Status Code | Description |
|-------|-------------|-------------|
| `CoreAgentError` | 500 | Base error class |
| `ReasoningError` | 500 | Reasoning failures |
| `MemoryError` | 500 | Memory system errors |
| `ToolExecutionError` | 500 | Tool execution failures |
| `ValidationError` | 400 | Input validation errors |
| `AuthenticationError` | 401 | Authentication failures |
| `AuthorizationError` | 403 | Authorization failures |
| `NotFoundError` | 404 | Resource not found |
| `TimeoutError` | 408 | Operation timeout |
| `RateLimitError` | 429 | Rate limit exceeded |
| `NetworkError` | 502 | Network failures |

### Rate Limiting

Rate limiting utilities for resource protection.

```typescript
import {
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter
} from './utils/rate-limiter';

// Token bucket (allows bursts)
const limiter = new TokenBucketRateLimiter(
  10,  // capacity
  5    // refill rate (tokens per second)
);

if (limiter.consume()) {
  // Request allowed
} else {
  // Rate limit exceeded
}

// Wait for tokens
await limiter.wait();

// Sliding window
const windowLimiter = new SlidingWindowRateLimiter(
  100,   // max requests
  60000  // window (ms)
);

if (windowLimiter.allow()) {
  // Request allowed
}

// Wait for window
await windowLimiter.wait();
```

### Performance Optimization

Performance utilities for caching and optimization.

```typescript
import {
  memoize,
  debounce,
  throttle
} from './utils/performance';

// Memoization with TTL
const memoized = memoize(expensiveFunction, {
  ttl: 60000,        // 60 seconds
  maxSize: 100,      // max cache size
  keyGenerator: (args) => JSON.stringify(args)
});

// Debounce (delay execution)
const debounced = debounce(handler, 1000, { leading: false });

// Throttle (limit execution rate)
const throttled = throttle(handler, 1000, { trailing: true });
```

---

## Services

### CybersecurityKnowledgeService

Provides cybersecurity domain knowledge.

```typescript
import { CybersecurityKnowledgeService } from './services/cybersecurity-knowledge-service';

const service = new CybersecurityKnowledgeService({
  client: llmClient,
  memory: memorySystem
});

const knowledge = await service.queryKnowledge({
  query: 'SQL injection',
  maxResults: 5,
  includeCode: true,
  includeTechniques: true
});
```

### HealthMonitoringService

System health monitoring and metrics.

```typescript
import { HealthMonitoringService } from './services/health-monitoring-service';

const monitor = new HealthMonitoringService({
  checkInterval: 60000 // 1 minute
});

await monitor.start();

const health = await monitor.getHealthStatus();
```

---

## Tools

### Tool Registry

Manages available security tools.

```typescript
import { ToolRegistry } from './tools/tool-registry';

const registry = new ToolRegistry();

// Register a tool
registry.registerTool({
  name: 'nmap',
  description: 'Network mapping tool',
  execute: async (args) => {
    // Tool execution logic
  }
});

// Get tool
const tool = registry.getTool('nmap');

// Execute tool
const result = await registry.executeTool('nmap', args, context);
```

### Red Team Tools

- **nmap**: Network scanning and reconnaissance
- **metasploit**: Exploitation framework
- **burpsuite**: Web application security testing
- **sqlmap**: SQL injection testing

### Blue Team Tools

- **suricata**: Network IDS/IPS
- **snort**: Network intrusion detection
- **wazuh**: Security monitoring
- **osquery**: Operating system instrumentation
- **yara**: Pattern matching

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MEMORY_ENCRYPTION_KEY` | **Yes** | Memory encryption key (min 32 chars) |
| `LOG_LEVEL` | No | Logging level (debug, info, warn, error) |
| `LLM_API_URL` | No | LLM API endpoint URL |
| `LLM_MODEL` | No | LLM model name |

### Configuration File

Create a `.env` file in the project root:

```bash
# Required
MEMORY_ENCRYPTION_KEY=your-secure-key-min-32-characters-long

# Optional
LOG_LEVEL=info
LLM_API_URL=http://localhost:11434
LLM_MODEL=gemma3n:4b
```

---

## Best Practices

### Security

1. **Always validate user input** before processing
2. **Use typed errors** for better error handling
3. **Implement rate limiting** for external APIs
4. **Encrypt sensitive data** in memory
5. **Sanitize command arguments** to prevent injection

### Performance

1. **Use memoization** for expensive computations
2. **Implement caching** for frequently accessed data
3. **Use rate limiting** to prevent resource exhaustion
4. **Batch operations** when possible
5. **Use lazy initialization** for expensive resources

### Reliability

1. **Implement retry logic** for transient failures
2. **Use circuit breakers** for external services
3. **Add comprehensive logging** for debugging
4. **Monitor system health** continuously
5. **Validate all inputs and outputs**

---

## Examples

### Complete Example

```typescript
import { GemmaAgent } from './gemma3n:4B-agent';
import { MemorySystem } from './memory/memory-system';
import { LlamaCppClient } from './clients/llama-cpp-client';
import { ToolRegistry } from './tools/tool-registry';
import { EventBus } from './events/event-bus';

// Initialize components
const client = new LlamaCppClient({ /* options */ });
const memory = new MemorySystem({
  encryptionKey: process.env.MEMORY_ENCRYPTION_KEY,
  vectorStore: 'in-memory'
});
const toolRegistry = new ToolRegistry();
const eventBus = new EventBus();

// Initialize memory
await memory.initialize();

// Create agent
const agent = new GemmaAgent({
  client,
  memory,
  toolRegistry,
  eventBus
});

// Process input
const response = await agent.processInput(
  'Scan this network: 192.168.1.0/24 and identify vulnerabilities'
);

console.log('Response:', response);
```

---

## Support

For issues, questions, or contributions, please refer to:
- **Bug Reports**: GitHub Issues
- **Documentation**: `docs/` directory
- **Contributing**: `CONTRIBUTING.md`

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Project C0Di3 Team
