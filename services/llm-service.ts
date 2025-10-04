import axios from 'axios';
import { Logger } from '../utils/logger';
import { TokenBucketRateLimiter } from '../utils/rate-limiter';
import { CircuitBreaker, withRetry } from '../utils/error-handling';

export interface LLMServiceOptions {
  apiUrl?: string;
  promptEnhancerUrl?: string;
  timeout?: number;
  rateLimitRequestsPerSecond?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

export class LLMService {
  private apiUrl: string;
  private promptEnhancerUrl?: string;
  private timeout: number;
  private logger: Logger;
  private rateLimiter: TokenBucketRateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(options: LLMServiceOptions = {}) {
    this.logger = new Logger('LLMService');
    const defaultApiUrl = 'http://localhost:8000'; // Llama.cpp default
    const defaultPromptEnhancerUrl = 'http://localhost:5002/enhance'; // Example default

    if (process.env.LLM_API_URL) {
      this.apiUrl = process.env.LLM_API_URL;
    } else if (options.apiUrl) {
      this.apiUrl = options.apiUrl;
    } else {
      this.apiUrl = defaultApiUrl;
      this.logger.warn(`LLM_API_URL not set, using default: ${this.apiUrl}. This is suitable for local development only.`);
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('CRITICAL WARNING: Using default LLM_API_URL in production environment. This is insecure and likely incorrect.');
      }
    }

    if (process.env.PROMPT_ENHANCER_URL) {
      this.promptEnhancerUrl = process.env.PROMPT_ENHANCER_URL;
    } else if (options.promptEnhancerUrl) {
      this.promptEnhancerUrl = options.promptEnhancerUrl;
    } else {
      // Allowing promptEnhancerUrl to be undefined if not set, as it's optional.
      // If you want a default even if not in env/options, set it here.
      // this.promptEnhancerUrl = defaultPromptEnhancerUrl;
      // this.logger.warn(`PROMPT_ENHANCER_URL not set, using default: ${this.promptEnhancerUrl}`);
    }

    this.timeout = options.timeout || 15000;

    // Initialize rate limiter (default: 10 requests per second)
    const rpsLimit = options.rateLimitRequestsPerSecond || 10;
    this.rateLimiter = new TokenBucketRateLimiter(rpsLimit * 2, rpsLimit);
    
    // Initialize circuit breaker (default: 5 failures, 60s timeout)
    const cbThreshold = options.circuitBreakerThreshold || 5;
    const cbTimeout = options.circuitBreakerTimeout || 60000;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: cbThreshold,
      resetTimeoutMs: cbTimeout,
      halfOpenRequests: 1
    });

    this.logger.info(`LLMService initialized. API URL: ${this.apiUrl}, Prompt Enhancer URL: ${this.promptEnhancerUrl || 'Not configured'}, Rate Limit: ${rpsLimit} req/s`);
  }

  /**
   * Enhance a prompt using an external Python microservice
   */
  async enhancePrompt(prompt: string, context?: any): Promise<string> {
    if (!this.promptEnhancerUrl) {
      this.logger.debug('Prompt enhancer URL not configured, returning original prompt.');
      return prompt;
    }
    try {
      this.logger.debug(`Enhancing prompt via ${this.promptEnhancerUrl}`);
      const response = await axios.post(
        this.promptEnhancerUrl,
        { prompt, context },
        { timeout: this.timeout }
      );
      return response.data.enhanced || prompt;
    } catch (err: any) {
      this.logger.error(`Error calling prompt enhancer service at ${this.promptEnhancerUrl}: ${err.message}. Falling back to original prompt.`);
      return prompt;
    }
  }

  /**
   * Send a prompt to llama.cpp and get a completion
   */
  async complete(prompt: string, opts: { n_predict?: number; temperature?: number; stop?: string[] } = {}): Promise<string> {
    // Apply rate limiting
    await this.rateLimiter.wait(1);
    
    // Execute with circuit breaker and retry logic
    return await this.circuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const response = await axios.post(
            `${this.apiUrl}/completion`,
            {
              prompt,
              n_predict: opts.n_predict || 256,
              temperature: opts.temperature || 0.7,
              stream: false,
              stop: opts.stop || undefined
            },
            { timeout: this.timeout }
          );
          return response.data.content;
        },
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryableErrors: (error: Error) => {
            const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
            return retryableCodes.some(code => error.message.includes(code));
          }
        }
      );
    });
  }

  /**
   * Summarize and explain tool output for user readability
   */
  async summarizeToolOutput(output: string, toolName: string): Promise<string> {
    const prompt = `Summarize and explain the following output from the tool '${toolName}' for a non-technical user:\n\n${output}\n\nSummary:`;
    return this.complete(prompt, { n_predict: 128, temperature: 0.5 });
  }
}
