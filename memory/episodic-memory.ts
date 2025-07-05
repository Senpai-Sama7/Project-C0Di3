import { IMemory, MemoryItem } from '../types';

export class EpisodicMemory implements IMemory {
  private events: MemoryItem[] = [];

  async add(item: MemoryItem): Promise<void> {
    this.events.push(item);
  }

  async get(key: string): Promise<MemoryItem | null> {
    return this.events.find(event => event.key === key) || null;
  }

  async getAll(): Promise<MemoryItem[]> {
    return this.events;
  }

  async find(query: string): Promise<MemoryItem[]> {
    return this.events.filter(event =>
      (event.content && typeof event.content === 'object' && !Array.isArray(event.content)
        ? Object.values(event.content)
        : []).some(value =>
        typeof value === 'string' && value.includes(query)
      )
    );
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}
