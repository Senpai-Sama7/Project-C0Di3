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
exports.ChromaDBVectorStore = void 0;
const logger_1 = require("../../utils/logger");
const embedding_service_1 = require("../../services/embedding-service");
/**
 * ChromaDB Vector Store implementation
 * This provides a complete in-memory fallback implementation with semantic search
 * For production, this would connect to an actual ChromaDB instance
 */
class ChromaDBVectorStore {
    constructor() {
        this.documents = new Map();
        this.vectors = new Map();
        this.logger = new logger_1.Logger('ChromaDBVectorStore');
        this.embeddingService = new embedding_service_1.EmbeddingService();
        this.logger.warn('Using in-memory ChromaDB fallback. For production, connect to actual ChromaDB instance.');
    }
    add(id, text) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.debug(`Adding document to ChromaDB: ${id}`);
                // Generate embedding for the text
                const embedding = yield this.embeddingService.getEmbedding(text);
                // Store document
                const chunk = {
                    id,
                    text,
                    embedding,
                    metadata: {
                        addedAt: Date.now(),
                        source: 'chromadb'
                    }
                };
                this.documents.set(id, chunk);
                this.vectors.set(id, embedding);
                this.logger.debug(`Document added successfully: ${id}`);
            }
            catch (error) {
                this.logger.error(`Failed to add document ${id}:`, error);
                throw error;
            }
        });
    }
    addDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.debug(`Adding ${documents.length} documents to ChromaDB`);
                for (const doc of documents) {
                    // Ensure document has embedding
                    if (!doc.embedding || doc.embedding.length === 0) {
                        doc.embedding = yield this.embeddingService.getEmbedding(doc.text);
                    }
                    this.documents.set(doc.id, doc);
                    this.vectors.set(doc.id, doc.embedding);
                }
                this.logger.debug(`${documents.length} documents added successfully`);
            }
            catch (error) {
                this.logger.error('Failed to add documents:', error);
                throw error;
            }
        });
    }
    findSimilar(query, k, threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.debug(`Finding ${k} similar documents for query with threshold ${threshold}`);
                // Generate query embedding
                const queryEmbedding = yield this.embeddingService.getEmbedding(query);
                // Calculate similarities for all documents
                const similarities = [];
                for (const [id, docEmbedding] of this.vectors.entries()) {
                    const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
                    if (similarity >= threshold) {
                        const doc = this.documents.get(id);
                        if (doc) {
                            similarities.push({ id, score: similarity, doc });
                        }
                    }
                }
                // Sort by similarity (descending) and take top k
                similarities.sort((a, b) => b.score - a.score);
                const topK = similarities.slice(0, k);
                // Convert to SearchResult format
                const results = topK.map(item => ({
                    id: item.id,
                    text: item.doc.text,
                    score: item.score,
                    metadata: item.doc.metadata
                }));
                this.logger.debug(`Found ${results.length} similar documents`);
                return results;
            }
            catch (error) {
                this.logger.error('Failed to find similar documents:', error);
                return [];
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.debug(`Removing document from ChromaDB: ${id}`);
                this.documents.delete(id);
                this.vectors.delete(id);
                this.logger.debug(`Document removed: ${id}`);
            }
            catch (error) {
                this.logger.error(`Failed to remove document ${id}:`, error);
                throw error;
            }
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.documents.size;
        });
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            this.logger.warn('Vector dimensions do not match');
            return 0;
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        if (denominator === 0) {
            return 0;
        }
        return dotProduct / denominator;
    }
    /**
     * Clear all documents from the store
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.documents.clear();
            this.vectors.clear();
            this.logger.info('ChromaDB store cleared');
        });
    }
    /**
     * Get store statistics
     */
    getStats() {
        const firstVector = this.vectors.values().next().value;
        return {
            documentCount: this.documents.size,
            averageVectorDimension: firstVector ? firstVector.length : 0
        };
    }
}
exports.ChromaDBVectorStore = ChromaDBVectorStore;
