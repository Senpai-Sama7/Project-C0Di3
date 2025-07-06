import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';
import { LLMClient } from '../types';
import { CybersecurityKnowledgeService } from './cybersecurity-knowledge-service';

export interface CacheEntry {
  response: string;
  timestamp: Date;
  accessCount: number;
  queryEmbedding: number[];
  contextHash: string;
  confidence: number;
  sources: string[];
  techniques: string[];
  tools: string[];
  codeExamples: string[];
}

export interface CAGQuery {
  query: string;
  context?: any;
  category?: string;
  difficulty?: string;
  maxResults?: number;
  includeCode?: boolean;
  includeTechniques?: boolean;
  useCache?: boolean;
}

export interface CAGResult {
  response: string;
  cached: boolean;
  confidence: number;
  sources: string[];
  techniques: string[];
  tools: string[];
  codeExamples: string[];
  cacheHitType: 'exact' | 'similar' | 'none';
  similarityScore?: number;
  processingTime: number;
}

export class CAGService {
  private readonly client: LLMClient;
  private readonly knowledgeService: CybersecurityKnowledgeService;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  private cache: Map<string, CacheEntry> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalQueries: 0
  };

  // Configuration
  private readonly maxCacheSize = 1000;
  private readonly cacheTTL = 3600 * 1000; // 1 hour in milliseconds
  private readonly similarityThreshold = 0.95;
  private readonly embeddingCacheSize = 5000;

  constructor(
    client: LLMClient,
    knowledgeService: CybersecurityKnowledgeService,
    eventBus: EventBus
  ) {
    this.client = client;
    this.knowledgeService = knowledgeService;
    this.eventBus = eventBus;
    this.logger = new Logger('CAGService');
  }

  /**
   * Main CAG query method that combines caching with RAG
   */
  async query(query: CAGQuery): Promise<CAGResult> {
    const startTime = Date.now();
    this.cacheStats.totalQueries++;

    try {
      // Check for exact cache hit
      const exactHit = await this.checkExactCacheHit(query);
      if (exactHit) {
        this.cacheStats.hits++;
        this.logger.debug(`Exact cache hit for query: ${query.query.substring(0, 50)}...`);
        return {
          ...exactHit,
          cached: true,
          cacheHitType: 'exact',
          processingTime: Date.now() - startTime
        };
      }

      // Check for similar cache hit
      const similarHit = await this.checkSimilarCacheHit(query);
      if (similarHit) {
        this.cacheStats.hits++;
        this.logger.debug(`Similar cache hit for query: ${query.query.substring(0, 50)}...`);
        return {
          ...similarHit,
          cached: true,
          cacheHitType: 'similar',
          processingTime: Date.now() - startTime
        };
      }

      // Fall back to RAG generation
      this.cacheStats.misses++;
      const result = await this.generateRAGResponse(query);

      // Cache the new result
      await this.cacheResult(query, result);

      return {
        ...result,
        cached: false,
        cacheHitType: 'none',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('CAG query failed:', error);
      throw error;
    }
  }

  /**
   * Check for exact cache hit
   */
  private async checkExactCacheHit(query: CAGQuery): Promise<CAGResult | null> {
    const cacheKey = this.generateCacheKey(query);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp.getTime() > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update access count
    entry.accessCount++;

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
      processingTime: 0
    };
  }

  /**
   * Check for similar cache hit using semantic similarity
   */
  private async checkSimilarCacheHit(query: CAGQuery): Promise<CAGResult | null> {
    const queryEmbedding = await this.getQueryEmbedding(query.query);

    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

    for (const [key, entry] of this.cache.entries()) {
      // Skip if entry is expired
      if (Date.now() - entry.timestamp.getTime() > this.cacheTTL) {
        this.cache.delete(key);
        continue;
      }

      const similarity = this.calculateSimilarity(queryEmbedding, entry.queryEmbedding);

      if (similarity > this.similarityThreshold &&
          (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { entry, similarity };
      }
    }

    if (bestMatch) {
      bestMatch.entry.accessCount++;
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
        processingTime: 0
      };
    }

    return null;
  }

  /**
   * Generate RAG response using the knowledge service
   */
  private async generateRAGResponse(query: CAGQuery): Promise<CAGResult> {
    const knowledgeResult = await this.knowledgeService.queryKnowledge({
      query: query.query,
      category: query.category,
      difficulty: query.difficulty,
      maxResults: query.maxResults,
      includeCode: query.includeCode,
      includeTechniques: query.includeTechniques
    });

    // Generate enhanced response using LLM
    const enhancedPrompt = this.buildEnhancedPrompt(query, knowledgeResult);
    const response = await this.client.generate({ prompt: enhancedPrompt });

    return {
      response,
      confidence: knowledgeResult.confidence,
      sources: knowledgeResult.sources,
      techniques: knowledgeResult.techniques,
      tools: knowledgeResult.tools,
      codeExamples: knowledgeResult.codeExamples,
      cached: false,
      cacheHitType: 'none',
      processingTime: 0
    };
  }

  /**
   * Cache a new result
   */
  private async cacheResult(query: CAGQuery, result: CAGResult): Promise<void> {
    const cacheKey = this.generateCacheKey(query);
    const queryEmbedding = await this.getQueryEmbedding(query.query);
    const contextHash = this.generateContextHash(query);

    const entry: CacheEntry = {
      response: result.response,
      timestamp: new Date(),
      accessCount: 1,
      queryEmbedding,
      contextHash,
      confidence: result.confidence,
      sources: result.sources,
      techniques: result.techniques,
      tools: result.tools,
      codeExamples: result.codeExamples
    };

    this.cache.set(cacheKey, entry);

    // Maintain cache size
    await this.maintainCache();

    this.eventBus.emit('cag.cache.updated', {
      cacheSize: this.cache.size,
      cacheKey,
      confidence: result.confidence
    });
  }

  /**
   * Generate cache key based on query and context
   */
  private generateCacheKey(query: CAGQuery): string {
    const contextStr = JSON.stringify(query.context || {});
    const categoryStr = query.category || '';
    const difficultyStr = query.difficulty || '';

    return `${query.query}:${contextStr}:${categoryStr}:${difficultyStr}`;
  }

  /**
   * Generate context hash for similarity matching
   */
  private generateContextHash(query: CAGQuery): string {
    const contextStr = JSON.stringify(query.context || {});
    return Buffer.from(contextStr).toString('base64').substring(0, 16);
  }

  /**
   * Get or compute query embedding
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    if (this.embeddingCache.has(query)) {
      return this.embeddingCache.get(query)!;
    }

    if (!this.client || !this.client.embed) {
      throw new Error('Embedding client or embed method is not available');
    }
    const embedding = await this.client.embed(query);

    // Maintain embedding cache size
    if (this.embeddingCache.size >= this.embeddingCacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey !== undefined) {
        this.embeddingCache.delete(firstKey);
      }
    }

    this.embeddingCache.set(query, embedding);
    return embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Build enhanced prompt for RAG generation
   */
  private buildEnhancedPrompt(query: CAGQuery, knowledgeResult: any): string {
    const context = knowledgeResult.concepts.map((c: any) =>
      `- ${c.name}: ${c.description}`
    ).join('\n');

    const techniques = knowledgeResult.techniques.length > 0 ?
      `\nRelated Techniques: ${knowledgeResult.techniques.join(', ')}` : '';

    const tools = knowledgeResult.tools.length > 0 ?
      `\nRelated Tools: ${knowledgeResult.tools.join(', ')}` : '';

    const codeExamples = knowledgeResult.codeExamples.length > 0 ?
      `\nCode Examples:\n${knowledgeResult.codeExamples.join('\n')}` : '';

    return `
You are a cybersecurity expert assistant. Answer the following question using the provided context and knowledge.

Question: ${query.query}

Context from cybersecurity knowledge base:
${context}${techniques}${tools}${codeExamples}

Provide a comprehensive, accurate, and helpful response that incorporates the relevant information from the context. Include specific techniques, tools, and code examples where appropriate.

Response:`;
  }

  /**
   * Maintain cache size using LRU strategy
   */
  private async maintainCache(): Promise<void> {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort entries by access count and timestamp (LRU)
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      if (a[1].accessCount !== b[1].accessCount) {
        return a[1].accessCount - b[1].accessCount;
      }
      return a[1].timestamp.getTime() - b[1].timestamp.getTime();
    });

    // Remove least recently used entries
    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    }

    this.logger.info(`Cache maintenance: removed ${toRemove.length} entries`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    const hitRate = this.cacheStats.totalQueries > 0 ?
      (this.cacheStats.hits / this.cacheStats.totalQueries) * 100 : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate.toFixed(2)}%`,
      cacheSize: this.cache.size,
      embeddingCacheSize: this.embeddingCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.embeddingCache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalQueries: 0
    };
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache entries for debugging
   */
  getCacheEntries(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry
    }));
  }

  /**
   * Pre-warm cache with common queries
   */
  async preWarmCache(commonQueries: string[]): Promise<void> {
    this.logger.info(`Pre-warming cache with ${commonQueries.length} queries`);

    for (const query of commonQueries) {
      try {
        await this.query({
          query,
          useCache: false // Force generation for pre-warming
        });
      } catch (error) {
        this.logger.warn(`Failed to pre-warm cache for query: ${query}`, error);
      }
    }

    this.logger.info('Cache pre-warming completed');
  }

  /**
   * Export cache for persistence
   */
  exportCache(): any {
    const cacheData: any = {};

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
        codeExamples: entry.codeExamples
      };
    }

    return {
      cache: cacheData,
      stats: this.cacheStats
    };
  }

  /**
   * Import cache from persistence
   */
  importCache(cacheData: any): void {
    this.cache.clear();

    for (const [key, data] of Object.entries(cacheData.cache)) {
      const d = data as Record<string, any>;
      if (typeof d === 'object' && d !== null) {
        const entry: CacheEntry = {
          response: typeof d.response === 'string' ? d.response : '',
          timestamp: new Date(typeof d.timestamp === 'string' ? d.timestamp : Date.now()),
          accessCount: typeof d.accessCount === 'number' ? d.accessCount : 0,
          queryEmbedding: Array.isArray(d.queryEmbedding) ? d.queryEmbedding : [],
          contextHash: typeof d.contextHash === 'string' ? d.contextHash : '',
          confidence: typeof d.confidence === 'number' ? d.confidence : 0,
          sources: Array.isArray(d.sources) ? d.sources : [],
          techniques: Array.isArray(d.techniques) ? d.techniques : [],
          tools: Array.isArray(d.tools) ? d.tools : [],
          codeExamples: Array.isArray(d.codeExamples) ? d.codeExamples : []
        };
        this.cache.set(key, entry);
      }
    }
    this.cacheStats = cacheData.stats || this.cacheStats;
    this.logger.info(`Imported ${this.cache.size} cache entries`);
  }
}
