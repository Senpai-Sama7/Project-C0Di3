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

  async remove(key: string): Promise<void> {
    this.events = this.events.filter(event => event.key !== key);
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  async update(key: string, newItem: MemoryItem): Promise<void> {
    const index = this.events.findIndex(event => event.key === key);
    if (index !== -1) {
      this.events[index] = newItem;
    } else {
      throw new Error(`Item with key ${key} not found.`);
    }
  }
}
