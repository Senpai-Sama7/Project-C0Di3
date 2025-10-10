/**
 * Comprehensive tests for error handling utilities
 */

import {
  CoreAgentError,
  ReasoningError,
  MemoryError,
  ToolExecutionError,
  ValidationError as ErrorHandlingValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
  NotFoundError,
  withRetry,
  CircuitBreaker,
  safeExecute
} from '../../utils/error-handling';

describe('Error Handling Utilities', () => {
  describe('CoreAgentError', () => {
    it('should create error with correct properties', () => {
      const error = new CoreAgentError('Test error', 'TEST_ERROR', 500, { key: 'value' });
      expect(error.name).toBe('CoreAgentError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({ key: 'value' });
      expect(error.timestamp).toBeDefined();
    });

    it('should serialize to JSON correctly', () => {
      const error = new CoreAgentError('Test error', 'TEST_ERROR', 500);
      const json = error.toJSON();
      expect(json.name).toBe('CoreAgentError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.statusCode).toBe(500);
    });
  });

  describe('ReasoningError', () => {
    it('should create reasoning error with correct properties', () => {
      const error = new ReasoningError('Failed to reason', { input: 'test' });
      expect(error.name).toBe('ReasoningError');
      expect(error.message).toBe('Failed to reason');
      expect(error.code).toBe('REASONING_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('MemoryError', () => {
    it('should create memory error with correct properties', () => {
      const error = new MemoryError('Memory full', { size: 1000 });
      expect(error.name).toBe('MemoryError');
      expect(error.message).toBe('Memory full');
      expect(error.code).toBe('MEMORY_ERROR');
    });
  });

  describe('ToolExecutionError', () => {
    it('should create tool execution error with tool name', () => {
      const error = new ToolExecutionError('nmap', 'Execution failed', { exitCode: 1 });
      expect(error.name).toBe('ToolExecutionError');
      expect(error.message).toContain('nmap');
      expect(error.message).toContain('Execution failed');
      expect(error.code).toBe('TOOL_EXECUTION_ERROR');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('Invalid token');
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error', () => {
      const error = new AuthorizationError('No permission');
      expect(error.name).toBe('AuthorizationError');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError('Connection failed', { host: 'example.com' });
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with duration', () => {
      const error = new TimeoutError('Operation timed out', 5000);
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toContain('5000ms');
      expect(error.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry info', () => {
      const error = new RateLimitError('Rate limit exceeded', 60000);
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toContain('60000ms');
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error', () => {
      const error = new NotFoundError('Resource not found', 'user');
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toContain('user');
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(withRetry(fn, { maxRetries: 2, initialDelayMs: 10 }))
        .rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const start = Date.now();
      await withRetry(fn, { maxRetries: 2, initialDelayMs: 100, backoffMultiplier: 2 });
      const elapsed = Date.now() - start;
      
      // Should have waited at least 100ms before retry
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some timing tolerance
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute function when closed', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });

    it('should open after threshold failures', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      
      // First two failures should execute
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      
      // Third attempt should fail immediately with circuit breaker message
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(fn).toHaveBeenCalledTimes(2); // Should not call fn on third attempt
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow('fail');
      
      // Should reject immediately
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should allow one request through (half-open)
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
    });
  });

  describe('safeExecute', () => {
    it('should return success result', async () => {
      const fn = async () => 'success';
      const result = await safeExecute(fn);
      
      expect(result).toBe('success');
    });

    it('should return fallback value on error', async () => {
      const error = new Error('failure');
      const fn = async () => { throw error; };
      const result = await safeExecute(fn, undefined, 'fallback');
      
      expect(result).toBe('fallback');
    });

    it('should return undefined if no fallback provided', async () => {
      const error = new Error('failure');
      const fn = async () => { throw error; };
      const result = await safeExecute(fn);
      
      expect(result).toBeUndefined();
    });

    it('should call logger on error', async () => {
      const error = new Error('failure');
      const logger = { error: jest.fn() };
      const fn = async () => { throw error; };
      
      await safeExecute(fn, logger);
      
      expect(logger.error).toHaveBeenCalledWith('Operation failed', error);
    });
  });
});
