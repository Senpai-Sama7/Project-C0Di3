import { IMemory, MemoryItem } from '../types';

export class ProceduralMemory implements IMemory {
  private procedures: Map<string, Function> = new Map();

  async add(item: MemoryItem): Promise<void> {
    if (typeof item.content !== 'function') {
      throw new Error('Procedural memory can only store functions.');
    }
    this.procedures.set(item.key, item.content);
  }

  async get(key: string): Promise<MemoryItem | null> {
    const procedure = this.procedures.get(key);
    return procedure ? { key, content: procedure } : null;
  }

  async getAll(): Promise<MemoryItem[]> {
    return Array.from(this.procedures.entries()).map(([key, content]) => ({ key, content }));
  }

  async find(query: string): Promise<MemoryItem[]> {
    // Find procedures by key/name
    const results: MemoryItem[] = [];
    for (const [key, content] of this.procedures.entries()) {
      if (key.includes(query)) {
        results.push({ key, content });
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.procedures.clear();
  }
}
