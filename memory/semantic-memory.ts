import { IMemory, MemoryItem } from '../types';
import { VectorStore } from './vector-store';

export class SemanticMemory implements IMemory {
  constructor(private vectorStore: VectorStore) {}

  async add(item: MemoryItem): Promise<void> {
    // Assuming item.content is text that can be vectorized
    await this.vectorStore.add(item.key, item.content as string);
  }

  async get(key: string): Promise<MemoryItem | null> {
    // Semantic memory is not designed for direct key-based retrieval
    return null;
  }

  async find(query: string, threshold = 0.7): Promise<MemoryItem[]> {
    const results = await this.vectorStore.findSimilar(query, 10, threshold);
    return results.map(result => ({ key: result.id, content: result.text, score: result.score }));
  }

  async getAll(): Promise<MemoryItem[]> {
    // Not practical for semantic memory
    return [];
  }

  async clear(): Promise<void> {
    // This would depend on the VectorStore implementation
  }

  async remove(key: string): Promise<void> {
    // Assuming the vector store supports removal
    console.warn('Remove operation is not implemented for SemanticMemory.');
  }

  async count(): Promise<number> {
    console.warn('Count operation is not implemented for SemanticMemory.');
    return 0;
  }

  async update(key: string, newItem: MemoryItem): Promise<void> {
    console.warn('Update operation is not implemented for SemanticMemory.');
  }
}
