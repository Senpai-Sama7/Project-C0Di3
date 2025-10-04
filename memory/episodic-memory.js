"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemory = void 0;
class EpisodicMemory {
    constructor() {
        this.events = [];
    }
    add(item) {
        return __awaiter(this, void 0, void 0, function* () {
            this.events.push(item);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.find(event => event.key === key) || null;
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events;
        });
    }
    find(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.filter(event => (event.content && typeof event.content === 'object' && !Array.isArray(event.content)
                ? Object.values(event.content)
                : []).some(value => typeof value === 'string' && value.includes(query)));
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events = [];
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.events = this.events.filter(event => event.key !== key);
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.length;
        });
    }
    update(key, newItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.events.findIndex(event => event.key === key);
            if (index !== -1) {
                this.events[index] = newItem;
            }
            else {
                throw new Error(`Item with key ${key} not found.`);
            }
        });
    }
    load(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    persist(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement actual persistence logic to filePath
            // Example:
            // fs.writeFileSync(filePath, JSON.stringify({ events: this.events }, null, 2));
            // console.log(`EpisodicMemory persisted to ${filePath}`);
            console.warn(`EpisodicMemory.persist() called with ${filePath}, but not implemented.`);
        });
    }
}
exports.EpisodicMemory = EpisodicMemory;
