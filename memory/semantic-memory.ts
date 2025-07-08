import { IMemory, MemoryItem } from '../types';
import { VectorStore } from './vector-store';

export class SemanticMemory implements IMemory {
  constructor(private vectorStore: VectorStore) {
    // Persistence of SemanticMemory is primarily handled by the underlying VectorStore.
    // If the VectorStore (e.g., ChromaDBVectorStore, PostgresVectorStore) is persistent,
    // then SemanticMemory's data will be persistent.
    // No separate load/persist methods are needed here unless SemanticMemory itself
    // maintains additional state beyond what's in the VectorStore.
  }

  async add(item: MemoryItem): Promise<void> {
    // Assuming item.content is text that can be vectorized
    await this.vectorStore.add(item.key, item.content as string);
  }

  async get(key: string): Promise<MemoryItem | null> {
    // Semantic memory is not designed for direct key-based retrieval
    // as it relies on similarity searches via the vector store.
    console.warn('SemanticMemory.get() is not typically used; query via find() instead.');
    return null;
  }

  async find(query: string, threshold = 0.7): Promise<MemoryItem[]> {
    const results = await this.vectorStore.findSimilar(query, 10, threshold);
    return results.map(result => ({ key: result.id, content: result.text, score: result.score }));
  }

  async getAll(): Promise<MemoryItem[]> {
    // Not practical for semantic memory due to potentially large size.
    // Direct access should go through vectorStore if needed, or be paginated.
    console.warn('SemanticMemory.getAll() is not implemented as it can be very large.');
    return [];
  }

  async clear(): Promise<void> {
    // This would depend on the VectorStore implementation.
    // Example: if vectorStore has a clearAll method: await this.vectorStore.clearAll();
    console.warn('SemanticMemory.clear() should be implemented by calling the VectorStore clear method.');
  }

  async remove(key: string): Promise<void> {
    // Assuming the vector store supports removal by ID (which is item.key here)
    // Example: await this.vectorStore.delete([key]);
    console.warn('SemanticMemory.remove() needs to call vectorStore.delete(key).');
  }

  async count(): Promise<number> {
    // Example: return await this.vectorStore.count();
    console.warn('SemanticMemory.count() needs to call vectorStore.count().');
    return 0;
  }

  async update(key: string, newItem: MemoryItem): Promise<void> {
    // For semantic memory, update usually means removing old and adding new,
    // or if vector store supports update.
    // Example: await this.vectorStore.update(key, newItem.content as string);
    console.warn('SemanticMemory.update() needs to interact with vectorStore update/delete+add.');
  }
}
