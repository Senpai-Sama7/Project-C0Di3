import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';

export interface GeminiClientOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  caching?: boolean;
  configManager?: ConfigManager;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private logger: Logger;
  private configManager?: ConfigManager;
  private options: GeminiClientOptions;

  constructor(options: GeminiClientOptions = {}) {
    this.options = options;
    this.configManager = options.configManager;
    this.logger = new Logger('GeminiClient');

    // Get API key from config, environment, or options
    const apiKey = options.apiKey ||
      this.configManager?.get('gemini.apiKey') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable or provide in config.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    const modelName =
      options.model || this.configManager?.get('gemini.model', 'gemini-2.0-flash-exp') || 'gemini-2.0-flash-exp';

    const generationConfig = {
      temperature: options.temperature ?? this.configManager?.get('gemini.temperature', 0.7),
      maxOutputTokens: options.maxTokens ?? this.configManager?.get('gemini.maxTokens', 8192),
      topP: options.topP ?? this.configManager?.get('gemini.topP', 0.9)
    };

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig
    });
  }

  async generate(prompt: string, options: any = {}): Promise<any> {
    try {
      this.logger.debug('Generating response for prompt:', prompt.substring(0, 100) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.debug('Generated response length:', text.length);

      return {
        text,
        usage: {
          promptTokens: 0, // Gemini doesn't provide token counts in the same way
          completionTokens: 0,
          totalTokens: 0
        },
        model: this.options.model || 'gemini-2.0-flash-exp'
      };
    } catch (error) {
      this.logger.error('Error generating content:', error);
      throw error;
    }
  }

  async generateStream(
    prompt: string,
    options: { abortSignal?: AbortSignal } = {}
  ): Promise<AsyncGenerator<string, void, unknown>> {
    try {
      this.logger.debug('Starting streaming generation for prompt:', prompt.substring(0, 100) + '...');

      if (!this.model.generateContentStream) {
        throw new Error('Streaming is not supported by the configured Gemini model');
      }

      const rawResult = await this.model.generateContentStream(prompt);
      const stream =
        rawResult && typeof (rawResult as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function'
          ? (rawResult as AsyncIterable<any>)
          : (rawResult as { stream?: AsyncIterable<any> }).stream;

      if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
        throw new Error('Gemini streaming response is not iterable');
      }

      const resolvedStream = stream as AsyncIterable<unknown>;
      const iterator = resolvedStream[Symbol.asyncIterator]();
      const abortSignal = options.abortSignal;
      let aborted = false;
      let abortListener: (() => void) | undefined;

      const extractTextSegments = (chunk: unknown): string[] => {
        const segments: string[] = [];
        if (!chunk || typeof chunk !== 'object') {
          return segments;
        }

        const maybeText = (chunk as { text?: unknown }).text;
        if (typeof maybeText === 'string' && maybeText.length > 0) {
          segments.push(maybeText);
        } else if (typeof maybeText === 'function') {
          try {
            const result = maybeText.call(chunk);
            if (typeof result === 'string' && result.length > 0) {
              segments.push(result);
            }
          } catch (error) {
            this.logger.warn('Gemini chunk text() accessor threw', error);
          }
        }

        const candidates = (chunk as { candidates?: unknown }).candidates;
        if (Array.isArray(candidates)) {
          for (const candidate of candidates) {
            const parts = (candidate as { content?: { parts?: unknown } })?.content?.parts;
            if (!Array.isArray(parts)) {
              continue;
            }

            for (const part of parts) {
              const partText = (part as { text?: unknown })?.text;
              if (typeof partText === 'string' && partText.length > 0) {
                segments.push(partText);
              }
            }
          }
        }

        return segments;
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          aborted = true;
          iterator.return?.();
        } else {
          abortListener = () => {
            aborted = true;
            iterator.return?.();
          };
          abortSignal.addEventListener('abort', abortListener, { once: true });
        }
      }

      const cleanup = () => {
        if (abortSignal && abortListener) {
          abortSignal.removeEventListener('abort', abortListener);
        }
      };

      const streamGenerator = async function* (this: GeminiClient) {
        try {
          while (!aborted) {
            const { value, done } = await iterator.next();
            if (done) {
              break;
            }

            for (const segment of extractTextSegments(value)) {
              yield segment;
            }
          }
        } finally {
          cleanup();
          if (typeof iterator.return === 'function') {
            await iterator.return();
          }
        }
      }.bind(this);

      return streamGenerator();
    } catch (error) {
      this.logger.error('Error in streaming generation:', error);
      throw error;
    }
  }

  async embedText(text: string): Promise<number[]> {
    const errorMessage = 'GeminiClient.embedText is intentionally disabled. Configure a supported embedding model before enabling embeddings.';
    this.logger.error(errorMessage);
    console.error(`CRITICAL: ${errorMessage} Input text (first 50 chars): "${text.substring(0,50)}"`);
    throw new Error(errorMessage);
    // To implement this, you would typically use a specific embedding model from Gemini:
    // Example (conceptual, check official Gemini SDK/API docs):
    // const embeddingModel = this.genAI.getGenerativeModel({ model: "models/embedding-001" }); // Or appropriate model
    // const result = await embeddingModel.embedContent(text);
    // return result.embedding.values;
  }

  async generateContent(prompt: string, options?: any): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: options?.model || 'gemini-pro' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  getModel(): GenerativeModel {
    return this.model;
  }

  getModelName(): string {
    return this.options.model || this.configManager?.get('gemini.model', 'gemini-2.0-flash-exp') || 'gemini-2.0-flash-exp';
  }
}
