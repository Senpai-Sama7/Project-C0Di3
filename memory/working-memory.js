"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
class WorkingMemory {
    constructor({ capacity = 10 }) {
        this.items = [];
        this.capacity = capacity;
    }
    add(item) {
        if (this.items.length >= this.capacity) {
            this.items.shift(); // Remove the oldest item
        }
        this.items.push(item);
    }
    getAll() {
        return this.items;
    }
    clear() {
        this.items = [];
    }
    remove(key) {
        this.items = this.items.filter(item => item.key !== key);
    }
    count() {
        return this.items.length;
    }
    update(key, newItem) {
        const index = this.items.findIndex(item => item.key === key);
        if (index !== -1) {
            this.items[index] = newItem;
        }
        else {
            throw new Error(`Item with key ${key} not found.`);
        }
    }
}
exports.WorkingMemory = WorkingMemory;
