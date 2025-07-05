export interface VectorizedData {
  id: string;
  text: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
}

export interface VectorStore {
  add(id: string, text: string): Promise<void>;
  addDocuments(documents: DocumentChunk[]): Promise<void>;
  findSimilar(query: string, k: number, threshold: number): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
}
