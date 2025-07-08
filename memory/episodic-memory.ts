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

  async load(filePath: string): Promise<void> {
    // TODO: Implement actual loading logic from filePath
    // Example:
    // if (fs.existsSync(filePath)) {
    //   const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    //   this.events = data.events || [];
    //   console.log(`EpisodicMemory loaded from ${filePath}`);
    // } else {
    //   console.log(`EpisodicMemory: No persistence file found at ${filePath}. Starting fresh.`);
    // }
    console.warn(`EpisodicMemory.load() called with ${filePath}, but not implemented.`);
  }

  async persist(filePath: string): Promise<void> {
    // TODO: Implement actual persistence logic to filePath
    // Example:
    // fs.writeFileSync(filePath, JSON.stringify({ events: this.events }, null, 2));
    // console.log(`EpisodicMemory persisted to ${filePath}`);
    console.warn(`EpisodicMemory.persist() called with ${filePath}, but not implemented.`);
  }
}
