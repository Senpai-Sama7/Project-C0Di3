/**
 * Comprehensive error handling utilities for the Core Agent system
 */

/**
 * Base error class for all Core Agent errors
 */
export class CoreAgentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = Date.now();
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Reasoning engine errors
 */
export class ReasoningError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'REASONING_ERROR', 500, context);
  }
}

/**
 * Memory system errors
 */
export class MemoryError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MEMORY_ERROR', 500, context);
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends CoreAgentError {
  public readonly toolName: string;
  
  constructor(toolName: string, message: string, context?: Record<string, unknown>) {
    super(message, 'TOOL_EXECUTION_ERROR', 500, { ...context, toolName });
    this.toolName = toolName;
  }
}

/**
 * Authentication/authorization errors
 */
export class AuthenticationError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
  }
}

export class AuthorizationError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CoreAgentError {
  public readonly field?: string;
  
  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, { ...context, field });
    this.field = field;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', 500, context);
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends CoreAgentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, context);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends CoreAgentError {
  public readonly timeoutMs: number;
  
  constructor(message: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', 504, { ...context, timeoutMs });
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends CoreAgentError {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, { ...context, retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends CoreAgentError {
  public readonly resourceType: string;
  public readonly resourceId: string;
  
  constructor(resourceType: string, resourceId: string, context?: Record<string, unknown>) {
    super(
      `${resourceType} not found: ${resourceId}`,
      'NOT_FOUND_ERROR',
      404,
      { ...context, resourceType, resourceId }
    );
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error handler with retry logic
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: (error) => {
    // Retry on network errors, timeouts, and rate limits
    return error instanceof NetworkError ||
           error instanceof TimeoutError ||
           error instanceof RateLimitError;
  }
};

/**
 * Execute an operation with exponential backoff retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delayMs = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === opts.maxRetries || !opts.retryableErrors!(lastError)) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError!;
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy<T> {
  canHandle: (error: Error) => boolean;
  recover: (error: Error, context?: Record<string, unknown>) => Promise<T>;
}

/**
 * Error handler with fallback strategies
 */
export class ErrorHandler<T> {
  private strategies: ErrorRecoveryStrategy<T>[] = [];
  private defaultValue?: T;

  /**
   * Add a recovery strategy
   */
  addStrategy(strategy: ErrorRecoveryStrategy<T>): this {
    this.strategies.push(strategy);
    return this;
  }

  /**
   * Set default fallback value
   */
  setDefaultValue(value: T): this {
    this.defaultValue = value;
    return this;
  }

  /**
   * Handle an error with registered strategies
   */
  async handle(
    error: Error,
    context?: Record<string, unknown>
  ): Promise<T> {
    // Try each strategy
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        try {
          return await strategy.recover(error, context);
        } catch (recoveryError) {
          // Continue to next strategy if recovery fails
          continue;
        }
      }
    }

    // Return default value if set
    if (this.defaultValue !== undefined) {
      return this.defaultValue;
    }

    // No strategy worked, rethrow the original error
    throw error;
  }

  /**
   * Execute operation with error handling
   */
  async execute(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return await this.handle(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
    }
  }
}

/**
 * Circuit breaker pattern for fault tolerance
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeoutMs: options.resetTimeoutMs || 60000,
      halfOpenRequests: options.halfOpenRequests || 3
    };
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Utility to wrap async functions with comprehensive error handling
 */
export function withErrorHandling<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  errorHandler?: (error: Error, args: TArgs) => Promise<TResult> | TResult
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (errorHandler) {
        return await errorHandler(err, args);
      }
      
      throw err;
    }
  };
}

/**
 * Safe execution wrapper that catches and logs errors
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  logger?: { error: (message: string, error: Error) => void },
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger?.error('Operation failed', err);
    return fallbackValue;
  }
}
