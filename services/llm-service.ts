import axios from 'axios';

export interface LLMServiceOptions {
  apiUrl?: string;
  promptEnhancerUrl?: string;
  timeout?: number;
}

export class LLMService {
  private apiUrl: string;
  private promptEnhancerUrl?: string;
  private timeout: number;

  constructor(options: LLMServiceOptions = {}) {
    this.apiUrl = options.apiUrl || process.env.LLM_API_URL || 'http://localhost:8000';
    this.promptEnhancerUrl = options.promptEnhancerUrl;
    this.timeout = options.timeout || 15000;
  }

  /**
   * Enhance a prompt using an external Python microservice (stub for now)
   */
  async enhancePrompt(prompt: string, context?: any): Promise<string> {
    if (!this.promptEnhancerUrl) return prompt;
    try {
      const response = await axios.post(
        this.promptEnhancerUrl,
        { prompt, context },
        { timeout: this.timeout }
      );
      return response.data.enhanced || prompt;
    } catch (err) {
      // Fallback to original prompt on error
      return prompt;
    }
  }

  /**
   * Send a prompt to llama.cpp and get a completion
   */
  async complete(prompt: string, opts: { n_predict?: number; temperature?: number; stop?: string[] } = {}): Promise<string> {
    try {
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
    } catch (err: any) {
      throw new Error(`LLMService: ${err.message}`);
    }
  }

  /**
   * Summarize and explain tool output for user readability
   */
  async summarizeToolOutput(output: string, toolName: string): Promise<string> {
    const prompt = `Summarize and explain the following output from the tool '${toolName}' for a non-technical user:\n\n${output}\n\nSummary:`;
    return this.complete(prompt, { n_predict: 128, temperature: 0.5 });
  }
}
