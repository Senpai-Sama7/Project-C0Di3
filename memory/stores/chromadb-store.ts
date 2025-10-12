import { DocumentChunk, SearchResult, VectorStore } from '../vector-store';
import { Logger } from '../../utils/logger';
import { EmbeddingService } from '../../services/embedding-service';

/**
 * ChromaDB Vector Store implementation
 * This provides a complete in-memory fallback implementation with semantic search
 * For production, this would connect to an actual ChromaDB instance
 */
export class ChromaDBVectorStore implements VectorStore {
  private logger: Logger;
  private embeddingService: EmbeddingService;
  private documents: Map<string, DocumentChunk> = new Map();
  private vectors: Map<string, number[]> = new Map();
  
  constructor() {
    this.logger = new Logger('ChromaDBVectorStore');
    this.embeddingService = new EmbeddingService();
    this.logger.warn('Using in-memory ChromaDB fallback. For production, connect to actual ChromaDB instance.');
  }

  async add(id: string, text: string): Promise<void> {
    try {
      this.logger.debug(`Adding document to ChromaDB: ${id}`);
      
      // Generate embedding for the text
      const embedding = await this.embeddingService.getEmbedding(text);
      
      // Store document
      const chunk: DocumentChunk = {
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
    } catch (error) {
      this.logger.error(`Failed to add document ${id}:`, error);
      throw error;
    }
  }

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    try {
      this.logger.debug(`Adding ${documents.length} documents to ChromaDB`);
      
      for (const doc of documents) {
        // Ensure document has embedding
        if (!doc.embedding || doc.embedding.length === 0) {
          doc.embedding = await this.embeddingService.getEmbedding(doc.text);
        }
        
        this.documents.set(doc.id, doc);
        this.vectors.set(doc.id, doc.embedding);
      }
      
      this.logger.debug(`${documents.length} documents added successfully`);
    } catch (error) {
      this.logger.error('Failed to add documents:', error);
      throw error;
    }
  }

  async findSimilar(query: string, k: number, threshold: number): Promise<SearchResult[]> {
    try {
      this.logger.debug(`Finding ${k} similar documents for query with threshold ${threshold}`);
      
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.getEmbedding(query);
      
      // Calculate similarities for all documents
      const similarities: Array<{ id: string; score: number; doc: DocumentChunk }> = [];
      
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
      const results: SearchResult[] = topK.map(item => ({
        id: item.id,
        text: item.doc.text,
        score: item.score,
        metadata: item.doc.metadata
      }));
      
      this.logger.debug(`Found ${results.length} similar documents`);
      return results;
    } catch (error) {
      this.logger.error('Failed to find similar documents:', error);
      return [];
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.debug(`Removing document from ChromaDB: ${id}`);
      this.documents.delete(id);
      this.vectors.delete(id);
      this.logger.debug(`Document removed: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to remove document ${id}:`, error);
      throw error;
    }
  }

  async count(): Promise<number> {
    return this.documents.size;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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
  async clear(): Promise<void> {
    this.documents.clear();
    this.vectors.clear();
    this.logger.info('ChromaDB store cleared');
  }

  /**
   * Get store statistics
   */
  getStats(): {
    documentCount: number;
    averageVectorDimension: number;
  } {
    const firstVector = this.vectors.values().next().value;
    return {
      documentCount: this.documents.size,
      averageVectorDimension: firstVector ? firstVector.length : 0
    };
  }
}
