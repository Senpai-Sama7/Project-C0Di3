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
exports.ProceduralMemory = void 0;
class ProceduralMemory {
    constructor() {
        this.procedures = new Map();
    }
    add(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof item.content !== 'function') {
                throw new Error('Procedural memory can only store functions.');
            }
            this.procedures.set(item.key, item.content);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const procedure = this.procedures.get(key);
            return procedure ? { key, content: procedure } : null;
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.procedures.entries()).map(([key, content]) => ({ key, content }));
        });
    }
    find(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find procedures by key/name
            const results = [];
            for (const [key, content] of this.procedures.entries()) {
                if (key.includes(query)) {
                    results.push({ key, content });
                }
            }
            return results;
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.procedures.clear();
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.procedures.delete(key);
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.procedures.size;
        });
    }
    update(key, newProcedure) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.procedures.has(key)) {
                throw new Error(`Procedure with key ${key} not found.`);
            }
            this.procedures.set(key, newProcedure);
        });
    }
    load(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement actual loading logic. Serializing/deserializing functions is complex.
            // May need to store function code as strings or use a dedicated procedure definition format.
            // Example (conceptual, for simple stringified functions):
            // if (fs.existsSync(filePath)) {
            //   const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            //   this.procedures = new Map(Object.entries(data.procedures).map(([k, v_str]: [string, string]) => [k, new Function('return ' + v_str)()]) );
            //   console.log(`ProceduralMemory loaded from ${filePath}`);
            // } else {
            //   console.log(`ProceduralMemory: No persistence file found at ${filePath}. Starting fresh.`);
            // }
            console.warn(`ProceduralMemory.load() called with ${filePath}, but not implemented due to complexity of function serialization.`);
        });
    }
    persist(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement actual persistence logic. See note in load() about function serialization.
            // Example (conceptual, for simple stringified functions):
            // const serializableProcedures = {};
            // this.procedures.forEach((func, key) => { serializableProcedures[key] = func.toString(); });
            // fs.writeFileSync(filePath, JSON.stringify({ procedures: serializableProcedures }, null, 2));
            // console.log(`ProceduralMemory persisted to ${filePath}`);
            console.warn(`ProceduralMemory.persist() called with ${filePath}, but not implemented due to complexity of function serialization.`);
        });
    }
}
exports.ProceduralMemory = ProceduralMemory;
