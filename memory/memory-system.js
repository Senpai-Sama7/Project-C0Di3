"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.MemorySystem = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const event_bus_1 = require("../events/event-bus");
const embedding_service_1 = require("../services/embedding-service");
const logger_1 = require("../utils/logger");
const concept_graph_1 = require("./concept-graph");
const episodic_memory_1 = require("./episodic-memory");
const memory_cache_1 = require("./memory-cache");
const procedural_memory_1 = require("./procedural-memory");
const semantic_memory_1 = require("./semantic-memory");
const chromadb_store_1 = require("./stores/chromadb-store");
const inmemory_store_1 = require("./stores/inmemory-store");
const postgres_store_1 = require("./stores/postgres-store");
const working_memory_1 = require("./working-memory");
/**
 * Comprehensive memory system with multiple memory types and persistent storage
 */
class MemorySystem {
    constructor(options) {
        this.initialized = false;
        this.logger = new logger_1.Logger('MemorySystem');
        this.eventBus = options.eventBus || new event_bus_1.EventBus();
        this.persistencePath = options.persistencePath || './data/memory';
        // Require encryption key for production security
        const envKey = process.env.MEMORY_ENCRYPTION_KEY;
        const optionsKey = options.encryptionKey;
        this.encryptionKey = optionsKey || envKey || '';
        if (!this.encryptionKey || this.encryptionKey.length < 32) {
            const errorMsg = 'MEMORY_ENCRYPTION_KEY must be set and at least 32 characters for security. Set it in environment variables or options.';
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
        this.logger.info('Memory encryption enabled with secure key');
        // Initialize embedding service
        this.embeddingService = new embedding_service_1.EmbeddingService();
        // Initialize vector store based on configuration
        this.vectorStore = this.createVectorStore(options);
        // Initialize cache system for CAG (Cached Augmented Generation)
        this.memoryCache = new memory_cache_1.MemoryCache({
            maxSize: options.cacheSize || 10000,
            ttl: options.cacheTTL || 3600,
            persistPath: path.join(this.persistencePath, 'cache.json'), // Ensure a filename
            encryptionKey: this.encryptionKey // Pass the encryption key
        });
        // Initialize memory subsystems
        this.semanticMemory = new semantic_memory_1.SemanticMemory(this.vectorStore);
        this.episodicMemory = new episodic_memory_1.EpisodicMemory();
        this.proceduralMemory = new procedural_memory_1.ProceduralMemory();
        this.workingMemory = new working_memory_1.WorkingMemory({ capacity: options.workingMemoryCapacity || 10 });
        this.conceptGraph = new concept_graph_1.ConceptGraph();
    }
    getVectorStore() {
        return this.vectorStore;
    }
    createVectorStore(options) {
        switch (options.vectorStoreType) {
            case 'chromadb':
                return new chromadb_store_1.ChromaDBVectorStore();
            case 'inmemory':
                return new inmemory_store_1.InMemoryVectorStore();
            case 'postgres':
                if (!options.connectionString) {
                    throw new Error('PostgresVectorStore requires a connectionString');
                }
                return new postgres_store_1.PostgresVectorStore(options.connectionString);
            default:
                throw new Error(`Unsupported vector store type: ${options.vectorStoreType}`);
        }
    }
    /**
     * Initialize the memory system and load persistent data
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                return;
            }
            this.logger.info('Initializing memory system...');
            // Ensure persistence directory exists
            yield fs.ensureDir(this.persistencePath);
            this.initialized = true;
            this.logger.info('Memory system initialized successfully');
        });
    }
    initializeMemoryComponents() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initialized) {
                this.logger.warn('Memory components are already initialized.');
                return;
            }
            try {
                yield this.memoryCache.load(); // Assumes MemoryCache.load() is async
                this.logger.info('Memory cache loaded successfully.');
                // Load other persistent memory components
                yield this.episodicMemory.load(path.join(this.persistencePath, 'episodic.json'));
                yield this.proceduralMemory.load(path.join(this.persistencePath, 'procedural.json'));
                yield this.conceptGraph.load(path.join(this.persistencePath, 'conceptGraph.json'));
                // SemanticMemory is persisted via its VectorStore, so no direct load call here.
                // Clear only if not successfully loaded or if intended
                // For now, we assume load methods handle fresh start if file not found.
                // this.semanticMemory.clear(); // Depends on VectorStore's clear behavior
                // this.episodicMemory.clear(); // No, load will handle
                // this.proceduralMemory.clear(); // No, load will handle
                this.workingMemory.clear(); // Working memory is typically transient
                this.initialized = true;
                this.logger.info('Memory components initialized successfully.');
            }
            catch (error) {
                this.logger.error('Failed to initialize memory components:', error);
                throw error;
            }
        });
    }
    /**
     * Store a user interaction in memory
     */
    storeInteraction(input, result, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = Date.now();
            const interactionId = `interaction-${timestamp}`;
            // Convert input to string if it's an object
            const inputText = typeof input === 'string' ? input : JSON.stringify(input);
            // Store in episodic memory
            yield this.episodicMemory.add({ key: interactionId, content: { input: inputText, output: result, context } });
            // Extract concepts and store in semantic memory
            const concepts = yield this.extractConcepts(inputText, result);
            for (const concept of concepts) {
                yield this.semanticMemory.add({ key: concept.id, content: concept.name });
                this.conceptGraph.addNode(concept.name, 'concept', concept);
            }
            // Store in working memory
            this.workingMemory.add({
                key: interactionId, content: {
                    input: inputText,
                    result,
                    context,
                    timestamp
                }
            });
            // Extract procedural knowledge (if any)
            if (result.procedures) {
                yield this.proceduralMemory.add({
                    key: `procedure-${timestamp}`,
                    content: {
                        name: result.procedures.name || 'unnamed-procedure',
                        steps: result.procedures.steps,
                        context: context,
                        timestamp
                    }
                });
            }
            // Update memory cache for CAG
            this.memoryCache.set(this.generateCacheKey(inputText), { result, timestamp, context });
            this.eventBus.emit('memory.update', {
                interactionId,
                timestamp
            });
        });
    }
    /**
     * Generate cache key for CAG
     */
    generateCacheKey(input) {
        // Create a deterministic but unique key for the input
        return Buffer.from(input).toString('base64');
    }
    /**
     * Extract concepts from text using embeddings and clustering
     */
    extractConcepts(input, result) {
        return __awaiter(this, void 0, void 0, function* () {
            // This would use sophisticated NLP to extract concepts
            // Simplified implementation for now
            const combinedText = `${input} ${typeof result === 'string' ? result : JSON.stringify(result)}`;
            const embedding = yield this.embeddingService.getEmbedding(combinedText);
            // Extract key phrases (simplified)
            const keyPhrases = combinedText
                .replace(/[^\w\s]/g, '')
                .split(' ')
                .filter(word => word.length > 4)
                .slice(0, 5);
            return keyPhrases.map(phrase => ({
                id: `concept-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: phrase,
                embedding,
                relatedConcepts: [],
                confidence: 0.8,
                lastUpdated: Date.now()
            }));
        });
    }
    /**
     * Search for similar memories based on content
     */
    searchSimilar(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, limit = 10) {
            try {
                this.logger.debug(`Searching for similar memories: ${query.substring(0, 50)}...`);
                // Search in vector store
                const vectorResults = yield this.vectorStore.findSimilar(query, limit, 0.7);
                // Also search in semantic memory
                const semanticResults = yield this.semanticMemory.find(query);
                // Combine and rank results
                const combinedResults = [...vectorResults.map(r => (Object.assign(Object.assign({}, r), { type: 'vector' }))), ...semanticResults.map(r => (Object.assign(Object.assign({}, r), { type: 'semantic' })))]
                    .slice(0, limit)
                    .map(result => ({
                    content: result.text || result.content || result,
                    score: 'score' in result && typeof result.score === 'number' ? result.score : 1.0,
                    timestamp: result.timestamp || Date.now(),
                    type: result.type || 'memory'
                }));
                this.logger.debug(`Found ${combinedResults.length} similar memories`);
                return combinedResults;
            }
            catch (error) {
                this.logger.error('Error searching similar memories:', error);
                return [];
            }
        });
    }
    /**
     * Retrieve relevant memories for reasoning
     */
    retrieveRelevantMemories(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, options = {}) {
            const limit = options.limit || 5;
            const bypassCache = options.bypassCache || false;
            try {
                if (!bypassCache) {
                    const cached = yield this.memoryCache.get(`relevantMemories:${query}`);
                    if (cached) {
                        this.logger.debug('Retrieved relevant memories from cache');
                        return { memories: cached, fromCache: true, cachedResult: cached };
                    }
                }
                const memories = yield this.searchSimilar(query, limit);
                yield this.memoryCache.set(`relevantMemories:${query}`, memories, 300);
                return { memories, fromCache: false, cachedResult: null };
            }
            catch (error) {
                this.logger.error('Error retrieving relevant memories:', error);
                return { memories: [], fromCache: false, cachedResult: null };
            }
        });
    }
    /**
     * Store data in memory
     */
    store(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const timestamp = Date.now();
                const entry = Object.assign(Object.assign({}, data), { timestamp, id: `memory-${timestamp}-${Math.random().toString(36).substr(2, 9)}` });
                // Store in appropriate memory types
                if (data.type === 'conversation' || !data.type) {
                    yield this.episodicMemory.add(entry);
                }
                else if (data.type === 'fact' || data.type === 'knowledge') {
                    yield this.semanticMemory.add(entry);
                }
                // Also store in vector store for similarity search
                yield this.vectorStore.add(entry.id, typeof data.input === 'string' ? data.input : JSON.stringify(data.input));
                this.logger.debug('Stored memory entry:', entry.id);
            }
            catch (error) {
                this.logger.error('Error storing memory:', error);
            }
        });
    }
    /**
     * Persist all memory to storage
     */
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Persisting memory to storage...');
            try {
                yield Promise.all([
                    this.memoryCache.persist(), // Assumes MemoryCache.persist() is async
                    this.episodicMemory.persist(path.join(this.persistencePath, 'episodic.json')),
                    this.proceduralMemory.persist(path.join(this.persistencePath, 'procedural.json')),
                    this.conceptGraph.persist(path.join(this.persistencePath, 'conceptGraph.json')),
                    // SemanticMemory is persisted via its VectorStore.
                    // If VectorStore needs an explicit persist call, add it here. E.g., this.vectorStore.persist()
                ]);
                this.logger.info('Memory persistence process completed.');
            }
            catch (error) {
                this.logger.error('Failed during memory persistence:', error);
            }
        });
    }
    persistMemory() {
        return __awaiter(this, void 0, void 0, function* () {
            // This method is a duplicate of persist(). Consolidate in future refactor.
            yield this.persist();
        });
    }
    /**
     * Generate memory statistics
     */
    getStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [semanticCount, episodicCount, proceduralCount, conceptCount] = yield Promise.all([
                (yield this.semanticMemory.getAll()).length,
                (yield this.episodicMemory.getAll()).length,
                (yield this.proceduralMemory.getAll()).length,
                (yield this.conceptGraph.getNodes()).length
            ]);
            return {
                totalMemories: semanticCount + episodicCount + proceduralCount,
                semanticMemories: semanticCount,
                episodicMemories: episodicCount,
                proceduralMemories: proceduralCount,
                concepts: conceptCount,
                cacheSize: this.memoryCache.size(),
                cacheHitRate: this.memoryCache.hitRate()
            };
        });
    }
    retrieveMemoryStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            const [semanticCount, episodicCount, proceduralCount, conceptCount] = yield Promise.all([
                (yield this.semanticMemory.getAll()).length,
                (yield this.episodicMemory.getAll()).length,
                (yield this.proceduralMemory.getAll()).length,
                (yield this.conceptGraph.getNodes()).length
            ]);
            return {
                totalMemories: semanticCount + episodicCount + proceduralCount,
                semanticMemories: semanticCount,
                episodicMemories: episodicCount,
                proceduralMemories: proceduralCount,
                concepts: conceptCount,
                cacheSize: this.memoryCache.size(),
                cacheHitRate: this.memoryCache.hitRate()
            };
        });
    }
}
exports.MemorySystem = MemorySystem;
