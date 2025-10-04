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
exports.CAGService = void 0;
const logger_1 = require("../utils/logger");
class CAGService {
    constructor(client, knowledgeService, eventBus) {
        this.cache = new Map();
        this.embeddingCache = new Map();
        this.performanceMetrics = {
            totalQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            hitRate: 0,
            memoryUsage: 0,
            cacheSize: 0,
            evictions: 0,
            prewarmQueries: 0
        };
        // Production-optimized configuration
        this.maxCacheSize = 2000; // Increased for better hit rates
        this.maxMemoryUsage = 500 * 1024 * 1024; // 500MB max memory
        this.defaultCacheTTL = 7200 * 1000; // 2 hours default TTL
        this.similarityThreshold = 0.92; // Slightly lower for more hits
        this.embeddingCacheSize = 10000; // Increased embedding cache
        this.prewarmBatchSize = 50; // Batch size for pre-warming
        this.maxResponseTime = 10000; // 10 second timeout
        // Performance tracking
        this.responseTimes = [];
        this.maxResponseTimeHistory = 1000;
        this.client = client;
        this.knowledgeService = knowledgeService;
        this.eventBus = eventBus;
        this.logger = new logger_1.Logger('CAGService');
        // Start periodic cache maintenance
        this.startCacheMaintenance();
    }
    /**
     * Main CAG query method with production optimizations
     */
    query(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startTime = Date.now();
            const queryId = this.generateQueryId(query);
            this.performanceMetrics.totalQueries++;
            try {
                // Set timeout for the entire operation
                const timeout = (_a = query.timeout) !== null && _a !== void 0 ? _a : this.maxResponseTime;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Query timeout')), timeout);
                });
                const queryPromise = this.executeQuery(query);
                const result = yield Promise.race([queryPromise, timeoutPromise]);
                // Update performance metrics
                const responseTime = Date.now() - startTime;
                this.updatePerformanceMetrics(responseTime, result.cached);
                // Emit performance event
                this.eventBus.emit('cag.query.completed', {
                    queryId,
                    responseTime,
                    cached: result.cached,
                    cacheHitType: result.cacheHitType,
                    confidence: result.confidence
                });
                return result;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`CAG query failed: ${errorMessage}`, error);
                this.eventBus.emit('cag.query.failed', { queryId, error: errorMessage });
                return {
                    response: `ERROR: ${errorMessage}`,
                    cached: false,
                    confidence: 0,
                    sources: [],
                    techniques: [],
                    tools: [],
                    codeExamples: [],
                    cacheHitType: 'none',
                    processingTime: Date.now() - startTime,
                    cacheSize: this.cache.size,
                    memoryUsage: this.getMemoryUsage(),
                };
            }
        });
    }
    /**
     * Execute the actual query with caching
     */
    executeQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            // Check for exact cache hit first
            const exactHit = yield this.checkExactCacheHit(query);
            if (exactHit) {
                this.performanceMetrics.cacheHits++;
                this.logger.debug(`Exact cache hit for query: ${query.query.substring(0, 50)}...`);
                return Object.assign(Object.assign({}, exactHit), { cached: true, cacheHitType: 'exact', processingTime: Date.now() - startTime, cacheSize: this.cache.size, memoryUsage: this.getMemoryUsage() });
            }
            // Check for similar cache hit with lower threshold for high-priority queries
            const similarityThreshold = query.priority === 'high' ? 0.88 : this.similarityThreshold;
            const similarHit = yield this.checkSimilarCacheHit(query, similarityThreshold);
            if (similarHit) {
                this.performanceMetrics.cacheHits++;
                this.logger.debug(`Similar cache hit for query: ${query.query.substring(0, 50)}...`);
                return Object.assign(Object.assign({}, similarHit), { cached: true, cacheHitType: 'similar', processingTime: Date.now() - startTime, cacheSize: this.cache.size, memoryUsage: this.getMemoryUsage() });
            }
            // Fall back to RAG generation
            this.performanceMetrics.cacheMisses++;
            const result = yield this.generateRAGResponse(query);
            // Cache the new result with adaptive TTL
            yield this.cacheResult(query, result);
            return Object.assign(Object.assign({}, result), { cached: false, cacheHitType: 'none', processingTime: Date.now() - startTime, cacheSize: this.cache.size, memoryUsage: this.getMemoryUsage() });
        });
    }
    /**
     * Check for exact cache hit with improved performance
     */
    checkExactCacheHit(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = this.generateCacheKey(query);
            const entry = this.cache.get(cacheKey);
            if (!entry)
                return null;
            // Check if cache entry is still valid
            const now = Date.now();
            if (now - entry.timestamp.getTime() > entry.ttl) {
                this.cache.delete(cacheKey);
                return null;
            }
            // Update access statistics
            entry.accessCount++;
            entry.lastAccessed = new Date();
            return {
                response: entry.response,
                confidence: entry.confidence,
                sources: entry.sources,
                techniques: entry.techniques,
                tools: entry.tools,
                codeExamples: entry.codeExamples,
                similarityScore: 1.0,
                cached: true,
                cacheHitType: 'exact',
                processingTime: 0,
                cacheSize: this.cache.size,
                memoryUsage: this.getMemoryUsage()
            };
        });
    }
    /**
     * Check for similar cache hit with optimized similarity calculation
     */
    checkSimilarCacheHit(query, threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryEmbedding = yield this.getQueryEmbedding(query.query);
            let bestMatch = null;
            const now = Date.now();
            // Use iterator for better performance with large caches
            for (const [key, entry] of this.cache.entries()) {
                // Skip if entry is expired
                if (now - entry.timestamp.getTime() > entry.ttl) {
                    this.cache.delete(key);
                    continue;
                }
                // Use cached similarity if available, otherwise calculate
                const similarity = this.calculateSimilarity(queryEmbedding, entry.queryEmbedding);
                if (similarity > threshold &&
                    (!bestMatch || similarity > bestMatch.similarity)) {
                    bestMatch = { entry, similarity };
                }
            }
            if (bestMatch) {
                bestMatch.entry.accessCount++;
                bestMatch.entry.lastAccessed = new Date();
                return {
                    response: bestMatch.entry.response,
                    confidence: bestMatch.entry.confidence,
                    sources: bestMatch.entry.sources,
                    techniques: bestMatch.entry.techniques,
                    tools: bestMatch.entry.tools,
                    codeExamples: bestMatch.entry.codeExamples,
                    similarityScore: bestMatch.similarity,
                    cached: true,
                    cacheHitType: 'similar',
                    processingTime: 0,
                    cacheSize: this.cache.size,
                    memoryUsage: this.getMemoryUsage()
                };
            }
            return null;
        });
    }
    /**
     * Generate RAG response with enhanced prompt engineering
     */
    generateRAGResponse(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const knowledgeResult = yield this.knowledgeService.queryKnowledge({
                query: query.query,
                category: query.category,
                difficulty: query.difficulty,
                maxResults: (_a = query.maxResults) !== null && _a !== void 0 ? _a : 15, // Increased for better coverage
                includeCode: query.includeCode,
                includeTechniques: query.includeTechniques
            });
            // Generate enhanced response using LLM with optimized prompt
            const enhancedPrompt = this.buildEnhancedPrompt(query, knowledgeResult);
            const response = yield this.client.generate({
                prompt: enhancedPrompt,
                maxTokens: 2048, // Limit for faster responses
                temperature: 0.7 // Balanced creativity and consistency
            });
            return {
                response,
                confidence: knowledgeResult.confidence,
                sources: knowledgeResult.sources,
                techniques: knowledgeResult.techniques,
                tools: knowledgeResult.tools,
                codeExamples: knowledgeResult.codeExamples,
                cached: false,
                cacheHitType: 'none',
                processingTime: 0,
                cacheSize: this.cache.size,
                memoryUsage: this.getMemoryUsage()
            };
        });
    }
    /**
     * Cache a new result with adaptive TTL and size management
     */
    cacheResult(query, result) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = this.generateCacheKey(query);
            const queryEmbedding = yield this.getQueryEmbedding(query.query);
            const contextHash = this.generateContextHash(query);
            // Calculate adaptive TTL based on query characteristics
            const baseTTL = this.defaultCacheTTL;
            const confidenceMultiplier = result.confidence;
            let priorityMultiplier;
            if (query.priority === 'high') {
                priorityMultiplier = 1.5;
            }
            else if (query.priority === 'low') {
                priorityMultiplier = 0.7;
            }
            else {
                priorityMultiplier = 1.0;
            }
            const adaptiveTTL = baseTTL * confidenceMultiplier * priorityMultiplier;
            const entry = {
                response: result.response,
                timestamp: new Date(),
                accessCount: 1,
                queryEmbedding,
                contextHash,
                confidence: result.confidence,
                sources: result.sources,
                techniques: result.techniques,
                tools: result.tools,
                codeExamples: result.codeExamples,
                lastAccessed: new Date(),
                size: Buffer.byteLength(result.response, 'utf8'),
                ttl: adaptiveTTL
            };
            this.cache.set(cacheKey, entry);
            // Maintain cache size and memory usage
            yield this.maintainCache();
            this.eventBus.emit('cag.cache.updated', {
                cacheSize: this.cache.size,
                cacheKey,
                confidence: result.confidence,
                memoryUsage: this.getMemoryUsage()
            });
        });
    }
    /**
     * Enhanced cache maintenance with memory-aware eviction
     */
    maintainCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentMemoryUsage = this.getMemoryUsage();
            // Check memory usage first
            if (currentMemoryUsage > this.maxMemoryUsage) {
                this.evictByMemoryUsage();
            }
            // Check cache size
            if (this.cache.size > this.maxCacheSize) {
                this.evictBySize();
            }
        });
    }
    /**
     * Evict cache entries based on memory usage
     */
    evictByMemoryUsage() {
        const entries = Array.from(this.cache.entries());
        // Sort by size (largest first) and access count (lowest first)
        entries.sort((a, b) => {
            if (a[1].size !== b[1].size) {
                return b[1].size - a[1].size; // Largest first
            }
            return a[1].accessCount - b[1].accessCount; // Least accessed first
        });
        let evictedCount = 0;
        const targetMemoryUsage = this.maxMemoryUsage * 0.8; // Target 80% of max
        for (const [key] of entries) {
            if (this.getMemoryUsage() <= targetMemoryUsage)
                break;
            this.cache.delete(key);
            evictedCount++;
            this.performanceMetrics.evictions++;
        }
        if (evictedCount > 0) {
            this.logger.info(`Memory-based eviction: removed ${evictedCount} entries`);
        }
    }
    /**
     * Evict cache entries based on size (LRU with access count)
     */
    evictBySize() {
        const entries = Array.from(this.cache.entries());
        // Sort by access count and last accessed time (LRU)
        entries.sort((a, b) => {
            if (a[1].accessCount !== b[1].accessCount) {
                return a[1].accessCount - b[1].accessCount;
            }
            return a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime();
        });
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
        for (const [key] of toRemove) {
            this.cache.delete(key);
            this.performanceMetrics.evictions++;
        }
        if (toRemove.length > 0) {
            this.logger.info(`Size-based eviction: removed ${toRemove.length} entries`);
        }
    }
    /**
     * Get current memory usage in bytes
     */
    getMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size;
        }
        return totalSize;
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(responseTime, cached) {
        this.responseTimes.push(responseTime);
        // Keep only recent response times
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }
        // Update average response time
        this.performanceMetrics.averageResponseTime =
            this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
        // Update hit rate
        this.performanceMetrics.hitRate =
            this.performanceMetrics.totalQueries > 0
                ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalQueries) * 100
                : 0;
        // Update cache size and memory usage
        this.performanceMetrics.cacheSize = this.cache.size;
        this.performanceMetrics.memoryUsage = this.getMemoryUsage();
    }
    /**
     * Start periodic cache maintenance
     */
    startCacheMaintenance() {
        setInterval(() => {
            this.performCacheMaintenance();
        }, 300000); // Every 5 minutes
    }
    /**
     * Perform periodic cache maintenance
     */
    performCacheMaintenance() {
        const now = Date.now();
        let expiredCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp.getTime() > entry.ttl) {
                this.cache.delete(key);
                expiredCount++;
            }
        }
        if (expiredCount > 0) {
            this.logger.info(`Cache maintenance: removed ${expiredCount} expired entries`);
        }
        // Update performance metrics
        this.performanceMetrics.cacheSize = this.cache.size;
        this.performanceMetrics.memoryUsage = this.getMemoryUsage();
    }
    /**
     * Enhanced pre-warming with batch processing
     */
    preWarmCache(commonQueries) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(`Pre-warming cache with ${commonQueries.length} queries`);
            const batches = this.chunkArray(commonQueries, this.prewarmBatchSize);
            let processedCount = 0;
            for (const batch of batches) {
                const promises = batch.map((query) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield this.query({
                            query,
                            useCache: false, // Force generation for pre-warming
                            priority: 'low' // Lower priority for pre-warming
                        });
                        processedCount++;
                    }
                    catch (error) {
                        this.logger.warn(`Failed to pre-warm cache for query: ${query}`, error);
                    }
                }));
                yield Promise.allSettled(promises);
                // Small delay between batches to avoid overwhelming the system
                yield new Promise(resolve => setTimeout(resolve, 100));
            }
            this.performanceMetrics.prewarmQueries = processedCount;
            this.logger.info(`Cache pre-warming completed: ${processedCount} queries processed`);
        });
    }
    /**
     * Utility function to chunk array into batches
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Get comprehensive performance metrics
     */
    getPerformanceMetrics() {
        return Object.assign({}, this.performanceMetrics);
    }
    /**
     * Get cache statistics with enhanced information
     */
    getCacheStats() {
        const hitRate = this.performanceMetrics.hitRate;
        const memoryUsageMB = this.performanceMetrics.memoryUsage / (1024 * 1024);
        return Object.assign(Object.assign({}, this.performanceMetrics), { hitRate: `${hitRate.toFixed(2)}%`, memoryUsageMB: `${memoryUsageMB.toFixed(2)} MB`, cacheSize: this.cache.size, embeddingCacheSize: this.embeddingCache.size, averageResponseTime: `${this.performanceMetrics.averageResponseTime.toFixed(2)}ms` });
    }
    /**
     * Generate cache key based on query and context
     */
    generateCacheKey(query) {
        var _a, _b, _c, _d;
        const contextStr = JSON.stringify((_a = query.context) !== null && _a !== void 0 ? _a : {});
        const categoryStr = (_b = query.category) !== null && _b !== void 0 ? _b : '';
        const difficultyStr = (_c = query.difficulty) !== null && _c !== void 0 ? _c : '';
        const priorityStr = (_d = query.priority) !== null && _d !== void 0 ? _d : 'normal';
        return `${query.query}:${contextStr}:${categoryStr}:${difficultyStr}:${priorityStr}`;
    }
    /**
     * Get or compute query embedding
     */
    getQueryEmbedding(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.embeddingCache.has(query)) {
                return this.embeddingCache.get(query);
            }
            if (!((_a = this.client) === null || _a === void 0 ? void 0 : _a.embed)) {
                throw new Error('Embedding client or embed method is not available');
            }
            const embedding = yield this.client.embed(query);
            // Maintain embedding cache size
            if (this.embeddingCache.size >= this.embeddingCacheSize) {
                const firstKey = this.embeddingCache.keys().next().value;
                if (firstKey !== undefined) {
                    this.embeddingCache.delete(firstKey);
                }
            }
            this.embeddingCache.set(query, embedding);
            return embedding;
        });
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    calculateSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            return 0;
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
        return Math.max(0, Math.min(1, similarity));
    }
    /**
     * Generate context hash for similarity matching
     */
    generateContextHash(query) {
        var _a;
        const crypto = require('crypto');
        const contextStr = JSON.stringify((_a = query.context) !== null && _a !== void 0 ? _a : {});
        return crypto.createHash('md5').update(contextStr).digest('hex');
    }
    /**
     * Build enhanced prompt for RAG generation
     */
    buildEnhancedPrompt(query, knowledgeResult) {
        let prompt = `You are a cybersecurity expert assistant. Provide a comprehensive, accurate, and practical response to the following query:\n\n`;
        prompt += `Query: ${query.query}\n\n`;
        if (knowledgeResult.concepts && knowledgeResult.concepts.length > 0) {
            prompt += `Relevant cybersecurity knowledge:\n`;
            for (const concept of knowledgeResult.concepts.slice(0, 3)) {
                prompt += `- ${concept.name}: ${concept.description}\n`;
            }
            prompt += `\n`;
        }
        if (knowledgeResult.techniques && knowledgeResult.techniques.length > 0) {
            prompt += `Related techniques: ${knowledgeResult.techniques.join(', ')}\n\n`;
        }
        if (knowledgeResult.tools && knowledgeResult.tools.length > 0) {
            prompt += `Related tools: ${knowledgeResult.tools.join(', ')}\n\n`;
        }
        if (knowledgeResult.codeExamples && knowledgeResult.codeExamples.length > 0) {
            prompt += `Code examples:\n${knowledgeResult.codeExamples.slice(0, 2).join('\n')}\n\n`;
        }
        prompt += `Provide a detailed, practical response that includes:\n`;
        prompt += `1. Clear explanation of the concept\n`;
        prompt += `2. Practical implementation guidance\n`;
        prompt += `3. Security considerations\n`;
        prompt += `4. Related techniques and tools\n\n`;
        prompt += `Response:`;
        return prompt;
    }
    generateQueryId(query) {
        const crypto = require('crypto');
        const queryStr = JSON.stringify(query);
        return crypto.createHash('md5').update(queryStr).digest('hex').substring(0, 8);
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.embeddingCache.clear();
        // Reset all fields of performanceMetrics instead of reassigning
        this.performanceMetrics.totalQueries = 0;
        this.performanceMetrics.cacheHits = 0;
        this.performanceMetrics.cacheMisses = 0;
        this.performanceMetrics.averageResponseTime = 0;
        this.performanceMetrics.hitRate = 0;
        this.performanceMetrics.memoryUsage = 0;
        this.performanceMetrics.cacheSize = 0;
        this.performanceMetrics.evictions = 0;
        this.performanceMetrics.prewarmQueries = 0;
        this.logger.info('Cache cleared');
    }
    /**
     * Export cache for persistence
     */
    exportCache() {
        const cacheData = {};
        for (const [key, entry] of this.cache.entries()) {
            cacheData[key] = {
                response: entry.response,
                timestamp: entry.timestamp.toISOString(),
                accessCount: entry.accessCount,
                queryEmbedding: entry.queryEmbedding,
                contextHash: entry.contextHash,
                confidence: entry.confidence,
                sources: entry.sources,
                techniques: entry.techniques,
                tools: entry.tools,
                codeExamples: entry.codeExamples,
                lastAccessed: entry.lastAccessed.toISOString(),
                size: entry.size,
                ttl: entry.ttl
            };
        }
        return {
            cache: cacheData,
            stats: this.performanceMetrics
        };
    }
    /**
     * Import cache from persistence
     */
    importCache(cacheData) {
        this.cache.clear();
        for (const [key, data] of Object.entries(cacheData.cache)) {
            const d = data;
            if (this.isValidCacheEntryData(d)) {
                const entry = this.parseCacheEntry(d);
                this.cache.set(key, entry);
            }
        }
        this.updatePerformanceMetricsFromStats(cacheData.stats);
        this.logger.info(`Imported ${this.cache.size} cache entries`);
    }
    isValidCacheEntryData(d) {
        return typeof d === 'object' && d !== null;
    }
    parseCacheEntry(d) {
        return {
            response: typeof d.response === 'string' ? d.response : '',
            timestamp: new Date(typeof d.timestamp === 'string' ? d.timestamp : Date.now()),
            accessCount: typeof d.accessCount === 'number' ? d.accessCount : 0,
            queryEmbedding: Array.isArray(d.queryEmbedding) ? d.queryEmbedding : [],
            contextHash: typeof d.contextHash === 'string' ? d.contextHash : '',
            confidence: typeof d.confidence === 'number' ? d.confidence : 0,
            sources: Array.isArray(d.sources) ? d.sources : [],
            techniques: Array.isArray(d.techniques) ? d.techniques : [],
            tools: Array.isArray(d.tools) ? d.tools : [],
            codeExamples: Array.isArray(d.codeExamples) ? d.codeExamples : [],
            lastAccessed: new Date(typeof d.lastAccessed === 'string' ? d.lastAccessed : Date.now()),
            size: typeof d.size === 'number' ? d.size : 0,
            ttl: typeof d.ttl === 'number' ? d.ttl : 0
        };
    }
    updatePerformanceMetricsFromStats(stats) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!stats)
            return;
        this.performanceMetrics.totalQueries = (_a = stats.totalQueries) !== null && _a !== void 0 ? _a : this.performanceMetrics.totalQueries;
        this.performanceMetrics.cacheHits = (_b = stats.cacheHits) !== null && _b !== void 0 ? _b : this.performanceMetrics.cacheHits;
        this.performanceMetrics.cacheMisses = (_c = stats.cacheMisses) !== null && _c !== void 0 ? _c : this.performanceMetrics.cacheMisses;
        this.performanceMetrics.averageResponseTime = (_d = stats.averageResponseTime) !== null && _d !== void 0 ? _d : this.performanceMetrics.averageResponseTime;
        this.performanceMetrics.hitRate = (_e = stats.hitRate) !== null && _e !== void 0 ? _e : this.performanceMetrics.hitRate;
        this.performanceMetrics.memoryUsage = (_f = stats.memoryUsage) !== null && _f !== void 0 ? _f : this.performanceMetrics.memoryUsage;
        this.performanceMetrics.cacheSize = (_g = stats.cacheSize) !== null && _g !== void 0 ? _g : this.performanceMetrics.cacheSize;
        this.performanceMetrics.evictions = (_h = stats.evictions) !== null && _h !== void 0 ? _h : this.performanceMetrics.evictions;
        this.performanceMetrics.prewarmQueries = (_j = stats.prewarmQueries) !== null && _j !== void 0 ? _j : this.performanceMetrics.prewarmQueries;
    }
}
exports.CAGService = CAGService;
