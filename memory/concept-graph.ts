import { v4 as uuidv4 } from 'uuid';
import { Concept } from '../types';

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
}
