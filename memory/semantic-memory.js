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
exports.SemanticMemory = void 0;
class SemanticMemory {
    constructor(vectorStore) {
        this.vectorStore = vectorStore;
        // Persistence of SemanticMemory is primarily handled by the underlying VectorStore.
        // If the VectorStore (e.g., ChromaDBVectorStore, PostgresVectorStore) is persistent,
        // then SemanticMemory's data will be persistent.
        // No separate load/persist methods are needed here unless SemanticMemory itself
        // maintains additional state beyond what's in the VectorStore.
    }
    add(item) {
        return __awaiter(this, void 0, void 0, function* () {
            // Assuming item.content is text that can be vectorized
            yield this.vectorStore.add(item.key, item.content);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Semantic memory is not designed for direct key-based retrieval
            // as it relies on similarity searches via the vector store.
            console.warn('SemanticMemory.get() is not typically used; query via find() instead.');
            return null;
        });
    }
    find(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, threshold = 0.7) {
            const results = yield this.vectorStore.findSimilar(query, 10, threshold);
            return results.map(result => ({ key: result.id, content: result.text, score: result.score }));
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            // Not practical for semantic memory due to potentially large size.
            // Direct access should go through vectorStore if needed, or be paginated.
            console.warn('SemanticMemory.getAll() is not implemented as it can be very large.');
            return [];
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            // This would depend on the VectorStore implementation.
            // Example: if vectorStore has a clearAll method: await this.vectorStore.clearAll();
            console.warn('SemanticMemory.clear() should be implemented by calling the VectorStore clear method.');
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            // Assuming the vector store supports removal by ID (which is item.key here)
            // Example: await this.vectorStore.delete([key]);
            console.warn('SemanticMemory.remove() needs to call vectorStore.delete(key).');
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            // Example: return await this.vectorStore.count();
            console.warn('SemanticMemory.count() needs to call vectorStore.count().');
            return 0;
        });
    }
    update(key, newItem) {
        return __awaiter(this, void 0, void 0, function* () {
            // For semantic memory, update usually means removing old and adding new,
            // or if vector store supports update.
            // Example: await this.vectorStore.update(key, newItem.content as string);
            console.warn('SemanticMemory.update() needs to interact with vectorStore update/delete+add.');
        });
    }
}
exports.SemanticMemory = SemanticMemory;
