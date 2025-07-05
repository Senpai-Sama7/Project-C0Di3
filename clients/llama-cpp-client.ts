import axios, { AxiosResponse } from 'axios';
import { LLMClient } from '../types';

interface LlamaCppCompletionOptions {
  prompt: string;
  n_predict?: number;
  temperature?: number;
  stream?: boolean;
  stop?: string[];
}

/**
 * LlamaCppClient provides an interface to a llama.cpp server for completions and embeddings.
 */
export class LlamaCppClient implements LLMClient {
  private apiUrl: string;
  private timeout: number = 15000; // 15s default timeout
  private maxRetries: number = 3;

  constructor(apiUrl: string = process.env.LLM_API_URL || 'http://localhost:8000') {
    this.apiUrl = apiUrl;
  }

  /**
   * Generate a completion from llama.cpp
   * @param options LlamaCppCompletionOptions
   * @returns Promise<string>
   */
  async generate(options: LlamaCppCompletionOptions): Promise<string> {
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const response: AxiosResponse = await axios.post(
          `${this.apiUrl}/completion`,
          {
            prompt: options.prompt,
            n_predict: options.n_predict || 256,
            temperature: options.temperature || 0.7,
            stream: false,
            stop: options.stop || undefined
          },
          { timeout: this.timeout }
        );
        return response.data.content;
      } catch (error: any) {
        lastError = error;
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
          attempt++;
          if (attempt >= this.maxRetries) break;
          await new Promise(res => setTimeout(res, 500 * attempt));
        } else {
          throw new Error(`LlamaCppClient: ${error.message}`);
        }
      }
    }
    throw new Error(`LlamaCppClient: Failed after ${this.maxRetries} attempts: ${lastError?.message || lastError}`);
  }

  /**
   * Generate a streaming completion from llama.cpp
   * @param options LlamaCppCompletionOptions
   * @returns AsyncGenerator<string>
   */
  async *generateStream(options: LlamaCppCompletionOptions): AsyncGenerator<string, void, unknown> {
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const response = await axios({
          method: 'post',
          url: `${this.apiUrl}/completion`,
          data: {
            prompt: options.prompt,
            n_predict: options.n_predict || 256,
            temperature: options.temperature || 0.7,
            stream: true,
            stop: options.stop || undefined
          },
          responseType: 'stream',
          timeout: this.timeout
        });
        const stream = response.data;
        let buffer = '';
        for await (const chunk of stream) {
          buffer += chunk.toString();
          let lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.content) yield data.content;
              } catch {}
            }
          }
        }
        return;
      } catch (error: any) {
        lastError = error;
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
          attempt++;
          if (attempt >= this.maxRetries) break;
          await new Promise(res => setTimeout(res, 500 * attempt));
        } else {
          throw new Error(`LlamaCppClient (stream): ${error.message}`);
        }
      }
    }
    throw new Error(`LlamaCppClient (stream): Failed after ${this.maxRetries} attempts: ${lastError?.message || lastError}`);
  }

  /**
   * Get an embedding from llama.cpp
   * @param text string
   * @returns Promise<number[]>
   */
  async embed(text: string): Promise<number[]> {
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const response: AxiosResponse = await axios.post(
          `${this.apiUrl}/embedding`,
          { content: text },
          { timeout: this.timeout }
        );
        return response.data.embedding;
      } catch (error: any) {
        lastError = error;
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
          attempt++;
          if (attempt >= this.maxRetries) break;
          await new Promise(res => setTimeout(res, 500 * attempt));
        } else {
          throw new Error(`LlamaCppClient (embed): ${error.message}`);
        }
      }
    }
    throw new Error(`LlamaCppClient (embed): Failed after ${this.maxRetries} attempts: ${lastError?.message || lastError}`);
  }
}
