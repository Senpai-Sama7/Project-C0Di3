import { LlamaCppClient } from '../clients/llama-cpp-client';

export class EmbeddingService {
  private llamaClient: LlamaCppClient;

  constructor() {
    this.llamaClient = new LlamaCppClient();
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      return await this.llamaClient.embed(text);
    } catch (error) {
      // Optionally, fallback to OpenAI or another service here
      throw new Error('Embedding failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}
