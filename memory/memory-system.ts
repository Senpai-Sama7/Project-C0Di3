import * as fs from 'fs-extra';
import * as path from 'path';
import { EventBus } from '../events/event-bus';
import { EmbeddingService } from '../services/embedding-service';
import { Logger } from '../utils/logger';
import { ConceptGraph } from './concept-graph';
import { EpisodicMemory } from './episodic-memory';
import { MemoryCache } from './memory-cache';
import { ProceduralMemory } from './procedural-memory';
import { SemanticMemory } from './semantic-memory';
import { ChromaDBVectorStore } from './stores/chromadb-store';
import { InMemoryVectorStore } from './stores/inmemory-store';
import { PostgresVectorStore } from './stores/postgres-store';
import { VectorStore } from './vector-store';
import { WorkingMemory } from './working-memory';

/**
 * Comprehensive memory system with multiple memory types and persistent storage
 */
export class MemorySystem {
  private readonly vectorStore: VectorStore;
  private readonly memoryCache: MemoryCache;
  private readonly semanticMemory: SemanticMemory;
  private readonly episodicMemory: EpisodicMemory;
  private readonly proceduralMemory: ProceduralMemory;
  private readonly workingMemory: WorkingMemory;
  private readonly conceptGraph: ConceptGraph;
  private readonly embeddingService: EmbeddingService;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly persistencePath: string;
  private initialized: boolean = false;
  private readonly encryptionKey: string;


  constructor(options: MemorySystemOptions) {
    this.logger = new Logger('MemorySystem');
    this.eventBus = options.eventBus || new EventBus();
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
    this.embeddingService = new EmbeddingService();

    // Initialize vector store based on configuration
    this.vectorStore = this.createVectorStore(options);

    // Initialize cache system for CAG (Cached Augmented Generation)
    this.memoryCache = new MemoryCache({
      maxSize: options.cacheSize || 10000,
      ttl: options.cacheTTL || 3600,
      persistPath: path.join(this.persistencePath, 'cache.json'), // Ensure a filename
      encryptionKey: this.encryptionKey // Pass the encryption key
    });

    // Initialize memory subsystems
    this.semanticMemory = new SemanticMemory(this.vectorStore);

    this.episodicMemory = new EpisodicMemory();

    this.proceduralMemory = new ProceduralMemory();

    this.workingMemory = new WorkingMemory({ capacity: options.workingMemoryCapacity || 10 });

    this.conceptGraph = new ConceptGraph();
  }

  public getVectorStore(): VectorStore {
    return this.vectorStore;
  }

  private createVectorStore(options: MemorySystemOptions): VectorStore {
    switch (options.vectorStoreType) {
      case 'chromadb':
        return new ChromaDBVectorStore();
      case 'inmemory':
        return new InMemoryVectorStore();
      case 'postgres':
        if (!options.connectionString) {
          throw new Error('PostgresVectorStore requires a connectionString');
        }
        return new PostgresVectorStore(options.connectionString);
      default:
        throw new Error(`Unsupported vector store type: ${options.vectorStoreType}`);
    }
  }

  /**
   * Initialize the memory system and load persistent data
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.info('Initializing memory system...');

    // Ensure persistence directory exists
    await fs.ensureDir(this.persistencePath);

    this.initialized = true;
    this.logger.info('Memory system initialized successfully');
  }

  private async initializeMemoryComponents(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Memory components are already initialized.');
      return;
    }

    try {
      await this.memoryCache.load(); // Assumes MemoryCache.load() is async
      this.logger.info('Memory cache loaded successfully.');

      // Load other persistent memory components
      await this.episodicMemory.load(path.join(this.persistencePath, 'episodic.json'));
      await this.proceduralMemory.load(path.join(this.persistencePath, 'procedural.json'));
      await this.conceptGraph.load(path.join(this.persistencePath, 'conceptGraph.json'));
      // SemanticMemory is persisted via its VectorStore, so no direct load call here.

      // Clear only if not successfully loaded or if intended
      // For now, we assume load methods handle fresh start if file not found.
      // this.semanticMemory.clear(); // Depends on VectorStore's clear behavior
      // this.episodicMemory.clear(); // No, load will handle
      // this.proceduralMemory.clear(); // No, load will handle
      this.workingMemory.clear(); // Working memory is typically transient

      this.initialized = true;
      this.logger.info('Memory components initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize memory components:', error);
      throw error;
    }
  }

  /**
   * Store a user interaction in memory
   */
  async storeInteraction(
    input: string | Record<string, any>,
    result: any,
    context: any
  ): Promise<void> {
    const timestamp = Date.now();
    const interactionId = `interaction-${timestamp}`;

    // Convert input to string if it's an object
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);

    // Store in episodic memory
    await this.episodicMemory.add({ key: interactionId, content: { input: inputText, output: result, context } });

    // Extract concepts and store in semantic memory
    const concepts = await this.extractConcepts(inputText, result);
    for (const concept of concepts) {
      await this.semanticMemory.add({ key: concept.id, content: concept.name });
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
      await this.proceduralMemory.add({
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
    this.memoryCache.set(
      this.generateCacheKey(inputText),
      { result, timestamp, context }
    );

    this.eventBus.emit('memory.update', {
      interactionId,
      timestamp
    });
  }

  /**
   * Generate cache key for CAG
   */
  private generateCacheKey(input: string): string {
    // Create a deterministic but unique key for the input
    return Buffer.from(input).toString('base64');
  }

  /**
   * Extract concepts from text using embeddings and clustering
   */
  private async extractConcepts(input: string, result: any): Promise<any[]> {
    // This would use sophisticated NLP to extract concepts
    // Simplified implementation for now
    const combinedText = `${input} ${typeof result === 'string' ? result : JSON.stringify(result)}`;
    const embedding = await this.embeddingService.getEmbedding(combinedText);

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
  }

  /**
   * Search for similar memories based on content
   */
  async searchSimilar(query: string, limit: number = 10): Promise<any[]> {
    try {
      this.logger.debug(`Searching for similar memories: ${query.substring(0, 50)}...`);

      // Search in vector store
      const vectorResults = await this.vectorStore.findSimilar(query, limit, 0.7);

      // Also search in semantic memory
      const semanticResults = await this.semanticMemory.find(query);

      // Combine and rank results
      const combinedResults = [...vectorResults.map(r => ({ ...r, type: 'vector' })), ...semanticResults.map(r => ({ ...r, type: 'semantic' }))]
        .slice(0, limit)
        .map(result => ({
          content: (result as any).text || (result as any).content || result,
          score: 'score' in result && typeof (result as any).score === 'number' ? (result as any).score : 1.0,
          timestamp: (result as any).timestamp || Date.now(),
          type: (result as any).type || 'memory'
        }));

      this.logger.debug(`Found ${combinedResults.length} similar memories`);
      return combinedResults;
    } catch (error) {
      this.logger.error('Error searching similar memories:', error);
      return [];
    }
  }

  /**
   * Retrieve relevant memories for reasoning
   */
  async retrieveRelevantMemories(query: string, options: any = {}): Promise<{ memories: any[], fromCache: boolean, cachedResult: any }> {
    const limit = options.limit || 5;
    const bypassCache = options.bypassCache || false;

    try {
      if (!bypassCache) {
        const cached = await this.memoryCache.get(`relevantMemories:${query}`);
        if (cached) {
          this.logger.debug('Retrieved relevant memories from cache');
          return { memories: cached, fromCache: true, cachedResult: cached };
        }
      }

      const memories = await this.searchSimilar(query, limit);
      await this.memoryCache.set(`relevantMemories:${query}`, memories, 300);

      return { memories, fromCache: false, cachedResult: null };
    } catch (error) {
      this.logger.error('Error retrieving relevant memories:', error);
      return { memories: [], fromCache: false, cachedResult: null };
    }
  }

  /**
   * Store data in memory
   */
  async store(data: any): Promise<void> {
    try {
      const timestamp = Date.now();
      const entry = {
        ...data,
        timestamp,
        id: `memory-${timestamp}-${Math.random().toString(36).substr(2, 9)}`
      };

      // Store in appropriate memory types
      if (data.type === 'conversation' || !data.type) {
        await this.episodicMemory.add(entry);
      } else if (data.type === 'fact' || data.type === 'knowledge') {
        await this.semanticMemory.add(entry);
      }

      // Also store in vector store for similarity search
      await this.vectorStore.add(entry.id, typeof data.input === 'string' ? data.input : JSON.stringify(data.input));

      this.logger.debug('Stored memory entry:', entry.id);
    } catch (error) {
      this.logger.error('Error storing memory:', error);
    }
  }

  /**
   * Persist all memory to storage
   */
  async persist(): Promise<void> {
    this.logger.info('Persisting memory to storage...');
    try {
      await Promise.all([
        this.memoryCache.persist(), // Assumes MemoryCache.persist() is async
        this.episodicMemory.persist(path.join(this.persistencePath, 'episodic.json')),
        this.proceduralMemory.persist(path.join(this.persistencePath, 'procedural.json')),
        this.conceptGraph.persist(path.join(this.persistencePath, 'conceptGraph.json')),
        // SemanticMemory is persisted via its VectorStore.
        // If VectorStore needs an explicit persist call, add it here. E.g., this.vectorStore.persist()
      ]);
      this.logger.info('Memory persistence process completed.');
    } catch (error) {
      this.logger.error('Failed during memory persistence:', error);
    }
  }

  public async persistMemory(): Promise<void> {
    // This method is a duplicate of persist(). Consolidate in future refactor.
    await this.persist();
  }

  /**
   * Generate memory statistics
   */
  async getStatistics(): Promise<MemoryStatistics> {
    const [semanticCount, episodicCount, proceduralCount, conceptCount] = await Promise.all([
      (await this.semanticMemory.getAll()).length,
      (await this.episodicMemory.getAll()).length,
      (await this.proceduralMemory.getAll()).length,
      (await this.conceptGraph.getNodes()).length
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
  }

  public async retrieveMemoryStatistics(): Promise<MemoryStatistics> {
    const [semanticCount, episodicCount, proceduralCount, conceptCount] = await Promise.all([
      (await this.semanticMemory.getAll()).length,
      (await this.episodicMemory.getAll()).length,
      (await this.proceduralMemory.getAll()).length,
      (await this.conceptGraph.getNodes()).length
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
  }
}

export interface MemorySystemOptions {
  eventBus?: EventBus;
  persistencePath?: string;
  cacheSize?: number;
  cacheTTL?: number;
  vectorStoreType?: 'chromadb' | 'inmemory' | 'postgres';
  connectionString?: string;
  workingMemoryCapacity?: number;
  encryptionKey?: string; // Encryption key for memory persistence
}

export interface RetrieveOptions {
  limit?: number;
  conceptLimit?: number;
  bypassCache?: boolean;
  types?: ('semantic' | 'episodic' | 'procedural')[];
  minScore?: number;
}

export interface MemoryResult {
  memories: Memory[];
  concepts?: Concept[];
  cached?: any;
  fromCache: boolean;
}

export interface Memory {
  id: string;
  content: any;
  score: number;
  type: 'semantic' | 'episodic' | 'procedural';
}

export interface Concept {
  id: string;
  name: string;
  embedding: number[];
  relatedConcepts: string[];
  confidence: number;
  lastUpdated: number;
}

export interface MemoryStatistics {
  totalMemories: number;
  semanticMemories: number;
  episodicMemories: number;
  proceduralMemories: number;
  concepts: number;
  cacheSize: number;
  cacheHitRate: number;
}
