import { Pool } from 'pg';
import { EmbeddingService } from '../../services/embedding-service';
import { DocumentChunk, SearchResult, VectorStore } from '../vector-store';

export class PostgresVectorStore implements VectorStore {
  private readonly pool: Pool;
  private readonly tableName: string;
  private readonly embeddingService: EmbeddingService;

  constructor(connectionString: string, tableName: string = 'documents') {
    this.pool = new Pool({ connectionString });
    this.tableName = tableName;
    this.embeddingService = new EmbeddingService();
    this.initializeDb();
  }

  private async initializeDb(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    id TEXT PRIMARY KEY,
                    content TEXT,
                    embedding VECTOR(1536) -- Assuming 1536-dimensional embeddings
                );
            `);
    } finally {
      client.release();
    }
  }

  async add(id: string, text: string): Promise<void> {
    const embedding = await this.embeddingService.getEmbedding(text);
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO ${this.tableName} (id, content, embedding) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3`,
        [id, text, JSON.stringify(embedding)]
      );
    } finally {
      client.release();
    }
  }

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of documents) {
        const embedding = await this.embeddingService.getEmbedding(doc.text);
        await client.query(
          `INSERT INTO ${this.tableName} (id, content, embedding) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3`,
          [doc.id, doc.text, JSON.stringify(embedding)]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findSimilar(query: string, k: number, threshold: number): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.getEmbedding(query);
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, content, 1 - (embedding <=> $1) as score FROM ${this.tableName} WHERE 1 - (embedding <=> $1) > $2 ORDER BY score DESC LIMIT $3`,
        [JSON.stringify(queryEmbedding), threshold, k]
      );
      return result.rows.map(row => ({ id: row.id, text: row.content, score: row.score }));
    } finally {
      client.release();
    }
  }
}
