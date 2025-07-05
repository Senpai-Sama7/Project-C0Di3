import { EmbeddingService } from '../../services/embedding-service';
import { DocumentChunk, SearchResult, VectorStore, VectorizedData } from '../vector-store';

export class InMemoryVectorStore implements VectorStore {
  private readonly data: Map<string, VectorizedData> = new Map();
  private readonly embedSvc = new EmbeddingService();

  async add(id: string, text: string): Promise<void> {
    // Generate vector embedding using the embedding service
    const vector = await this.embedSvc.getEmbedding(text);
    this.data.set(id, { id, text, vector, metadata: {} });
  }

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    for (const doc of documents) {
      await this.add(doc.id, doc.text);
    }
  }

  async findSimilar(query: string, k: number, threshold: number): Promise<SearchResult[]> {
    // Compute query embedding
    const queryVec = await this.embedSvc.getEmbedding(query);
    // Compute cosine similarity
    const results: SearchResult[] = [];
    for (const { id, text, vector } of this.data.values()) {
      const dot = vector.reduce((sum, val, i) => sum + val * (queryVec[i] || 0), 0);
      const magA = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(queryVec.reduce((sum, val) => sum + val * val, 0));
      const score = magA && magB ? dot / (magA * magB) : 0;
      if (score >= threshold) {
        results.push({ id, text, score });
      }
    }
    // Sort by score desc and return top k
    const sorted = results.sort((a, b) => b.score - a.score);
    return sorted.slice(0, k);
  }
}
