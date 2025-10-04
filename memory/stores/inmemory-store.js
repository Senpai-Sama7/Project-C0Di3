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
exports.InMemoryVectorStore = void 0;
const embedding_service_1 = require("../../services/embedding-service");
class InMemoryVectorStore {
    constructor() {
        this.data = new Map();
        this.embedSvc = new embedding_service_1.EmbeddingService();
    }
    add(id, text) {
        return __awaiter(this, void 0, void 0, function* () {
            // Generate vector embedding using the embedding service
            const vector = yield this.embedSvc.getEmbedding(text);
            this.data.set(id, { id, text, vector, metadata: {} });
        });
    }
    addDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const doc of documents) {
                yield this.add(doc.id, doc.text);
            }
        });
    }
    findSimilar(query, k, threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            // Compute query embedding
            const queryVec = yield this.embedSvc.getEmbedding(query);
            // Compute cosine similarity
            const results = [];
            for (const { id, text, vector } of this.data.values()) {
                const dot = vector.reduce((sum, val, i) => sum + val * (queryVec[i] || 0), 0);
                const magA = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
                const magB = Math.sqrt(queryVec.reduce((sum, val) => sum + val * val, 0));
                const score = magA && magB ? dot / (magA * magB) : 0;
                if (score >= threshold) {
                    results.push({ id, text, score });
                }
            }
            // Sort by score desc and return top k
            const sorted = results.sort((a, b) => b.score - a.score);
            return sorted.slice(0, k);
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            this.data.delete(id);
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.data.size;
        });
    }
}
exports.InMemoryVectorStore = InMemoryVectorStore;
