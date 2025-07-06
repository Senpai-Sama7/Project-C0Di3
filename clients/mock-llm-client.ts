import { LLMClient } from '../types';

interface MockCompletionOptions {
  prompt: string;
  n_predict?: number;
  temperature?: number;
  stream?: boolean;
  stop?: string[];
}

/**
 * MockLLMClient provides a simple mock implementation for testing when llama.cpp server is not available
 */
export class MockLLMClient implements LLMClient {
  private timeout: number = 1000; // 1s default timeout for mock responses

  constructor() {
    console.log('MockLLMClient: Using mock LLM client for testing');
  }

  /**
   * Generate a mock completion
   */
  async generate(options: MockCompletionOptions): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, this.timeout));

    const prompt = options.prompt.toLowerCase();

    // Simple mock responses based on prompt content
    if (prompt.includes('sql injection')) {
      return `SQL injection is a code injection technique used to attack data-driven applications. It involves inserting malicious SQL statements into entry fields for execution. Common prevention methods include using parameterized queries, input validation, and proper error handling.`;
    } else if (prompt.includes('network scanning')) {
      return `Network scanning involves discovering hosts, ports, and services on a network. Tools like nmap can be used for port scanning, service detection, and vulnerability assessment. Always ensure you have proper authorization before scanning networks.`;
    } else if (prompt.includes('malware')) {
      return `Malware analysis involves examining malicious software to understand its behavior, purpose, and potential impact. This includes static analysis (examining code without execution) and dynamic analysis (running in controlled environments).`;
    } else if (prompt.includes('phishing')) {
      return `Phishing is a social engineering attack where attackers impersonate legitimate entities to steal sensitive information. Prevention includes user education, email filtering, and multi-factor authentication.`;
    } else {
      return `This is a mock response for testing purposes. The actual system would provide a detailed, context-aware response based on cybersecurity knowledge and reasoning capabilities.`;
    }
  }

  /**
   * Generate a mock streaming completion
   */
  async *generateStream(options: MockCompletionOptions): AsyncGenerator<string, void, unknown> {
    const response = await this.generate(options);
    const words = response.split(' ');

    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming
      yield word + ' ';
    }
  }

  /**
   * Get a mock embedding
   */
  async embed(text: string): Promise<number[]> {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate a simple mock embedding based on text content
    const embedding = new Array(384).fill(0);
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    for (let i = 0; i < Math.min(384, text.length); i++) {
      embedding[i] = Math.sin(hash + i) * 0.5;
    }

    return embedding;
  }
}
