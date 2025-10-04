import * as fs from 'fs-extra';
import * as path from 'path';
import { EmbeddingService } from '../../services/embedding-service';
import { DocumentChunk, SearchResult, VectorStore, VectorizedData } from '../vector-store';

/**
 * HNSW (Hierarchical Navigable Small World) Vector Store Implementation
 * 
 * This provides O(log n) approximate nearest neighbor search instead of O(n) linear search.
 * Uses a hierarchical graph structure with multiple layers for efficient navigation.
 */

interface HNSWNode {
  id: string;
  vector: number[];
  text: string;
  metadata: Record<string, any>;
  connections: Map<number, Set<string>>; // layer -> set of connected node IDs
}

interface HNSWConfig {
  M: number; // Maximum number of connections per layer (default: 16)
  efConstruction: number; // Size of dynamic candidate list during construction (default: 200)
  efSearch: number; // Size of dynamic candidate list during search (default: 50)
  mL: number; // Normalization factor for level assignment (default: 1/ln(2))
  persistencePath?: string; // Path to persist index
}

export class HNSWVectorStore implements VectorStore {
  private readonly nodes: Map<string, HNSWNode> = new Map();
  private readonly embedSvc = new EmbeddingService();
  private entryPointId: string | null = null;
  private maxLayer: number = 0;
  
  private readonly config: HNSWConfig;

  constructor(config?: Partial<HNSWConfig>) {
    this.config = {
      M: config?.M ?? 16,
      efConstruction: config?.efConstruction ?? 200,
      efSearch: config?.efSearch ?? 50,
      mL: config?.mL ?? (1 / Math.log(2)),
      persistencePath: config?.persistencePath
    };

    // Load persisted index if available
    if (this.config.persistencePath) {
      this.loadIndex().catch(err => {
        console.warn('Failed to load persisted HNSW index:', err.message);
      });
    }
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    
    return (magA && magB) ? dot / (magA * magB) : 0;
  }

  /**
   * Assign a random layer for a new node using exponential decay
   */
  private getRandomLevel(): number {
    let level = 0;
    while (Math.random() < 0.5 && level < 16) {
      level++;
    }
    return level;
  }

  /**
   * Get M_max for a specific layer
   */
  private getM(layer: number): number {
    return layer === 0 ? this.config.M * 2 : this.config.M;
  }

  /**
   * Search for nearest neighbors at a specific layer
   */
  private searchLayer(
    query: number[],
    entryPoints: Set<string>,
    numToReturn: number,
    layer: number
  ): Array<{ id: string; distance: number }> {
    const visited = new Set<string>();
    const candidates: Array<{ id: string; distance: number }> = [];
    const results: Array<{ id: string; distance: number }> = [];

    // Initialize with entry points
    for (const id of entryPoints) {
      const node = this.nodes.get(id);
      if (!node) continue;
      
      const distance = 1 - this.cosineSimilarity(query, node.vector);
      candidates.push({ id, distance });
      results.push({ id, distance });
      visited.add(id);
    }

    candidates.sort((a, b) => a.distance - b.distance);
    results.sort((a, b) => a.distance - b.distance);

    let candidateIdx = 0;
    while (candidateIdx < candidates.length) {
      const current = candidates[candidateIdx];
      candidateIdx++;

      // If current is farther than our furthest result, stop
      if (results.length >= numToReturn && current.distance > results[results.length - 1].distance) {
        break;
      }

      const currentNode = this.nodes.get(current.id);
      if (!currentNode) continue;

      const connections = currentNode.connections.get(layer);
      if (!connections) continue;

      // Check neighbors
      for (const neighborId of connections) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const distance = 1 - this.cosineSimilarity(query, neighborNode.vector);
        
        // Add to results if better than current worst
        if (results.length < numToReturn || distance < results[results.length - 1].distance) {
          results.push({ id: neighborId, distance });
          results.sort((a, b) => a.distance - b.distance);
          if (results.length > numToReturn) {
            results.pop();
          }

          // Add to candidates for exploration
          candidates.push({ id: neighborId, distance });
          candidates.sort((a, b) => a.distance - b.distance);
        }
      }
    }

    return results.slice(0, numToReturn);
  }

  /**
   * Select neighbors using heuristic
   */
  private selectNeighbors(
    candidates: Array<{ id: string; distance: number }>,
    M: number
  ): string[] {
    // Simple heuristic: select M closest neighbors
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, M).map(c => c.id);
  }

  /**
   * Add connections between nodes
   */
  private addConnections(nodeId: string, neighborId: string, layer: number): void {
    const node = this.nodes.get(nodeId);
    const neighbor = this.nodes.get(neighborId);
    if (!node || !neighbor) return;

    // Add bidirectional connections
    if (!node.connections.has(layer)) {
      node.connections.set(layer, new Set());
    }
    if (!neighbor.connections.has(layer)) {
      neighbor.connections.set(layer, new Set());
    }

    node.connections.get(layer)!.add(neighborId);
    neighbor.connections.get(layer)!.add(nodeId);

    // Prune connections if exceeding M
    const M = this.getM(layer);
    this.pruneConnections(nodeId, layer, M);
    this.pruneConnections(neighborId, layer, M);
  }

  /**
   * Prune connections to maintain M limit
   */
  private pruneConnections(nodeId: string, layer: number, M: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const connections = node.connections.get(layer);
    if (!connections || connections.size <= M) return;

    // Calculate distances and keep M closest
    const distances = Array.from(connections).map(neighborId => {
      const neighbor = this.nodes.get(neighborId);
      if (!neighbor) return { id: neighborId, distance: Infinity };
      
      const distance = 1 - this.cosineSimilarity(node.vector, neighbor.vector);
      return { id: neighborId, distance };
    });

    distances.sort((a, b) => a.distance - b.distance);
    const keepIds = new Set(distances.slice(0, M).map(d => d.id));

    // Remove connections not in keep set
    for (const neighborId of connections) {
      if (!keepIds.has(neighborId)) {
        connections.delete(neighborId);
        
        // Remove reverse connection
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          const neighborConnections = neighbor.connections.get(layer);
          if (neighborConnections) {
            neighborConnections.delete(nodeId);
          }
        }
      }
    }
  }

  async add(id: string, text: string, metadata?: Record<string, any>): Promise<void> {
    // Generate embedding
    const vector = await this.embedSvc.getEmbedding(text);
    
    // Create node
    const node: HNSWNode = {
      id,
      vector,
      text,
      metadata: metadata || {},
      connections: new Map()
    };

    const level = this.getRandomLevel();

    // Update max layer if needed
    if (level > this.maxLayer) {
      this.maxLayer = level;
    }

    this.nodes.set(id, node);

    // If this is the first node, make it the entry point
    if (this.entryPointId === null) {
      this.entryPointId = id;
      return;
    }

    // Find nearest neighbors at each layer and connect
    const entryPointNode = this.nodes.get(this.entryPointId);
    if (!entryPointNode) return;

    let currentNearest = new Set([this.entryPointId]);

    // Search from top layer down to target layer
    for (let lc = this.maxLayer; lc > level; lc--) {
      const nearest = this.searchLayer(vector, currentNearest, 1, lc);
      if (nearest.length > 0) {
        currentNearest = new Set([nearest[0].id]);
      }
    }

    // Insert at all layers from level down to 0
    for (let lc = level; lc >= 0; lc--) {
      const candidates = this.searchLayer(vector, currentNearest, this.config.efConstruction, lc);
      const M = this.getM(lc);
      const neighbors = this.selectNeighbors(candidates, M);

      // Add connections
      for (const neighborId of neighbors) {
        this.addConnections(id, neighborId, lc);
      }

      currentNearest = new Set(neighbors);
    }

    // Update entry point if this node is at a higher layer
    if (level > this.getNodeLevel(this.entryPointId)) {
      this.entryPointId = id;
    }

    // Persist if configured
    if (this.config.persistencePath) {
      await this.persistIndex();
    }
  }

  /**
   * Get the maximum layer for a node
   */
  private getNodeLevel(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return -1;
    
    let maxLevel = -1;
    for (const layer of node.connections.keys()) {
      if (layer > maxLevel) {
        maxLevel = layer;
      }
    }
    return maxLevel;
  }

  async addDocuments(documents: DocumentChunk[]): Promise<void> {
    for (const doc of documents) {
      await this.add(doc.id, doc.text, doc.metadata);
    }
  }

  async findSimilar(query: string, k: number, threshold: number): Promise<SearchResult[]> {
    if (this.nodes.size === 0 || !this.entryPointId) {
      return [];
    }

    // Generate query embedding
    const queryVec = await this.embedSvc.getEmbedding(query);

    // Search from top layer down
    let currentNearest = new Set([this.entryPointId]);
    
    for (let lc = this.maxLayer; lc > 0; lc--) {
      const nearest = this.searchLayer(queryVec, currentNearest, 1, lc);
      if (nearest.length > 0) {
        currentNearest = new Set([nearest[0].id]);
      }
    }

    // Final search at layer 0
    const candidates = this.searchLayer(queryVec, currentNearest, this.config.efSearch, 0);

    // Convert to search results and filter by threshold
    const results: SearchResult[] = [];
    for (const { id, distance } of candidates) {
      const score = 1 - distance; // Convert distance to similarity
      if (score >= threshold) {
        const node = this.nodes.get(id);
        if (node) {
          results.push({
            id: node.id,
            text: node.text,
            score
          });
        }
      }
    }

    return results.slice(0, k);
  }

  async remove(id: string): Promise<void> {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove all connections
    for (const [layer, connections] of node.connections) {
      for (const neighborId of connections) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          const neighborConnections = neighbor.connections.get(layer);
          if (neighborConnections) {
            neighborConnections.delete(id);
          }
        }
      }
    }

    this.nodes.delete(id);

    // Update entry point if needed
    if (this.entryPointId === id) {
      const nextKey = this.nodes.keys().next();
      this.entryPointId = this.nodes.size > 0 && !nextKey.done ? nextKey.value : null;
      if (this.entryPointId) {
        this.maxLayer = this.getNodeLevel(this.entryPointId);
      } else {
        this.maxLayer = 0;
      }
    }

    // Persist if configured
    if (this.config.persistencePath) {
      await this.persistIndex();
    }
  }

  async count(): Promise<number> {
    return this.nodes.size;
  }

  /**
   * Persist the index to disk
   */
  private async persistIndex(): Promise<void> {
    if (!this.config.persistencePath) return;

    const indexData = {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        vector: node.vector,
        text: node.text,
        metadata: node.metadata,
        connections: Array.from(node.connections.entries()).map(([layer, conn]) => [layer, Array.from(conn)])
      })),
      entryPointId: this.entryPointId,
      maxLayer: this.maxLayer,
      config: this.config
    };

    const indexPath = path.join(this.config.persistencePath, 'hnsw-index.json');
    await fs.ensureDir(this.config.persistencePath);
    await fs.writeJson(indexPath, indexData, { spaces: 2 });
  }

  /**
   * Load persisted index from disk
   */
  private async loadIndex(): Promise<void> {
    if (!this.config.persistencePath) return;

    const indexPath = path.join(this.config.persistencePath, 'hnsw-index.json');
    if (!await fs.pathExists(indexPath)) return;

    const indexData = await fs.readJson(indexPath);

    this.nodes.clear();
    for (const nodeData of indexData.nodes) {
      const connections = new Map<number, Set<string>>();
      for (const [layer, conn] of nodeData.connections) {
        connections.set(Number(layer), new Set(conn));
      }

      this.nodes.set(nodeData.id, {
        id: nodeData.id,
        vector: nodeData.vector,
        text: nodeData.text,
        metadata: nodeData.metadata,
        connections
      });
    }

    this.entryPointId = indexData.entryPointId;
    this.maxLayer = indexData.maxLayer;
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    nodeCount: number;
    maxLayer: number;
    avgConnectionsPerNode: number;
    entryPointId: string | null;
  } {
    let totalConnections = 0;
    for (const node of this.nodes.values()) {
      for (const connections of node.connections.values()) {
        totalConnections += connections.size;
      }
    }

    return {
      nodeCount: this.nodes.size,
      maxLayer: this.maxLayer,
      avgConnectionsPerNode: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
      entryPointId: this.entryPointId
    };
  }
}
