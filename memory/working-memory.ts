import { IMemory, MemoryItem } from '../types';

export class WorkingMemory {
  private items: MemoryItem[] = [];
  private capacity: number;

  constructor({ capacity = 10 }) {
    this.capacity = capacity;
  }

  add(item: MemoryItem): void {
    if (this.items.length >= this.capacity) {
      this.items.shift(); // Remove the oldest item
    }
    this.items.push(item);
  }

  getAll(): MemoryItem[] {
    return this.items;
  }

  clear(): void {
    this.items = [];
  }

  remove(key: string): void {
    this.items = this.items.filter(item => item.key !== key);
  }

  count(): number {
    return this.items.length;
  }

  update(key: string, newItem: MemoryItem): void {
    const index = this.items.findIndex(item => item.key === key);
    if (index !== -1) {
      this.items[index] = newItem;
    } else {
      throw new Error(`Item with key ${key} not found.`);
    }
  }
}
