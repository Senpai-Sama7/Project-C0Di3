import fs from 'fs-extra';
import path from 'path';
import { DocumentChunk, VectorStore } from '../memory/vector-store';

export class BookIngestionService {
  private readonly vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore;
  }

  public async ingestBook(filePath: string): Promise<void> {
    console.log(`Ingesting book from: ${filePath}`);
    const text = await fs.readFile(filePath, 'utf-8');

    // Simple chunking strategy (by paragraph)
    const chunks = text.split(/\n\s*\n/);

    const documents: DocumentChunk[] = chunks.map((chunk, index) => ({
      id: `${path.basename(filePath)}-${index}`,
      text: chunk,
      metadata: {
        source: filePath,
      },
    }));

    await this.vectorStore.addDocuments(documents);
    console.log(`Successfully ingested ${documents.length} chunks from ${filePath}`);
  }
}
