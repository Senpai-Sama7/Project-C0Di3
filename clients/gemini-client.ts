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

export interface GeminiStreamOptions {
  signal?: AbortSignal;
}

type GeminiStreamPart = { text?: string | null | undefined };
type GeminiStreamCandidate = {
  content?: {
    parts?: Array<GeminiStreamPart | undefined> | undefined;
  } | null;
};

type GeminiStreamChunk = {
  text?: string | (() => string | undefined) | null;
  candidates?: Array<GeminiStreamCandidate | undefined> | null;
};

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

  async generateStream(prompt: string, options: GeminiStreamOptions = {}): Promise<AsyncGenerator<string, void, unknown>> {
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

      const resolvedStream = stream as AsyncIterable<any>;
      const abortSignal = options.signal;
      let aborted = false;
      const onAbort = () => {
        aborted = true;
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          this.logger.warn('Gemini streaming aborted before consumption started');
          throw new Error('Streaming aborted');
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      const iterator = async function* (client: GeminiClient): AsyncGenerator<string, void, unknown> {
        try {
          for await (const chunk of resolvedStream) {
            if (aborted) {
              client.logger.warn('Gemini streaming cancelled by caller');
              break;
            }

            if (!chunk) {
              continue;
            }

            const pieces = client.extractTextFromChunk(chunk);
            for (const piece of pieces) {
              if (piece.length > 0) {
                yield piece;
              }
            }
          }
        } finally {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', onAbort);
          }
        }
      };

      return iterator(this);
    } catch (error) {
      this.logger.error('Error in streaming generation:', error);
      throw error;
    }
  }

  private extractTextFromChunk(chunk: unknown): string[] {
    const collected: string[] = [];

    if (!chunk || typeof chunk !== 'object') {
      return collected;
    }

    const candidateChunk = chunk as GeminiStreamChunk;

    if (typeof candidateChunk.text === 'string' && candidateChunk.text.length > 0) {
      collected.push(candidateChunk.text);
    } else if (typeof candidateChunk.text === 'function') {
      try {
        const value = candidateChunk.text.call(chunk);
        if (typeof value === 'string' && value.length > 0) {
          collected.push(value);
        }
      } catch (error) {
        this.logger.warn('Failed to evaluate Gemini chunk text() function', error);
      }
    }

    if (Array.isArray(candidateChunk.candidates)) {
      for (const candidate of candidateChunk.candidates) {
        const parts = candidate?.content?.parts;
        if (!Array.isArray(parts)) {
          continue;
        }

        for (const part of parts) {
          const text = part?.text;
          if (typeof text === 'string' && text.length > 0) {
            collected.push(text);
          }
        }
      }
    }

    return collected;
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
