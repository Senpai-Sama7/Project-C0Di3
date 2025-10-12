import { v4 as uuidv4 } from 'uuid';
import { Concept } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

export interface Node {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  properties: Record<string, any>;
}

export class ConceptGraph {
  private nodes: Map<string, Node> = new Map();
  private edges: Map<string, Edge> = new Map();
  private encryptionKey: string | null = null;

  constructor(options?: { encryptionKey?: string }) {
    if (options?.encryptionKey) {
      this.encryptionKey = options.encryptionKey;
    }
  }

  addNode(label: string, type: string, properties: Record<string, any>): Node {
    const id = uuidv4();
    const node: Node = { id, label, type, properties };
    this.nodes.set(id, node);
    return node;
  }

  getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  addEdge(sourceId: string, targetId: string, label: string, properties: Record<string, any>): Edge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }
    const id = uuidv4();
    const edge: Edge = { id, source: sourceId, target: targetId, label, properties };
    this.edges.set(id, edge);
    return edge;
  }

  findNodeByLabel(label: string): Node | undefined {
    for (const node of this.nodes.values()) {
      if (node.label === label) {
        return node;
      }
    }
    return undefined;
  }

  async load(filePath: string): Promise<void> {
    try {
      if (await fs.pathExists(filePath)) {
        let rawData = await fs.readFile(filePath, 'utf-8');
        
        // Decrypt if encryption key is available
        if (this.encryptionKey) {
          rawData = this.decrypt(rawData);
        }
        
        const data = JSON.parse(rawData);
        
        // Reconstruct nodes map
        if (data.nodes) {
          this.nodes = new Map(Object.entries(data.nodes) as [string, Node][]);
        }
        
        // Reconstruct edges map
        if (data.edges) {
          this.edges = new Map(Object.entries(data.edges) as [string, Edge][]);
        }
        
        console.log(`ConceptGraph loaded from ${filePath}: ${this.nodes.size} nodes, ${this.edges.size} edges`);
      } else {
        console.log(`ConceptGraph: No persistence file found at ${filePath}. Starting fresh.`);
      }
    } catch (error) {
      console.error(`ConceptGraph: Failed to load from ${filePath}:`, error);
      this.nodes = new Map();
      this.edges = new Map();
    }
  }

  async persist(filePath: string): Promise<void> {
    try {
      const data = {
        nodes: Object.fromEntries(this.nodes),
        edges: Object.fromEntries(this.edges),
        timestamp: Date.now(),
        stats: {
          nodeCount: this.nodes.size,
          edgeCount: this.edges.size
        }
      };
      
      let dataToPersist = JSON.stringify(data, null, 2);
      
      // Encrypt if encryption key is available
      if (this.encryptionKey) {
        dataToPersist = this.encrypt(dataToPersist);
      }
      
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      
      // Write to file
      await fs.writeFile(filePath, dataToPersist, 'utf-8');
      console.log(`ConceptGraph persisted to ${filePath}: ${this.nodes.size} nodes, ${this.edges.size} edges`);
    } catch (error) {
      console.error(`ConceptGraph: Failed to persist to ${filePath}:`, error);
    }
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodeTypes: this.getNodeTypes(),
      edgeTypes: this.getEdgeTypes()
    };
  }

  /**
   * Get distribution of node types
   */
  private getNodeTypes(): Record<string, number> {
    const types: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      types[node.type] = (types[node.type] || 0) + 1;
    }
    return types;
  }

  /**
   * Get distribution of edge types
   */
  private getEdgeTypes(): Record<string, number> {
    const types: Record<string, number> = {};
    for (const edge of this.edges.values()) {
      types[edge.label] = (types[edge.label] || 0) + 1;
    }
    return types;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const key = crypto.scryptSync(this.encryptionKey, 'concept-graph-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      return encryptedData;
    }

    const { iv, authTag, data } = JSON.parse(encryptedData);
    const key = crypto.scryptSync(this.encryptionKey, 'concept-graph-salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
}
