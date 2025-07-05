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
}
