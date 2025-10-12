"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ConceptGraph = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class ConceptGraph {
    constructor(options) {
        this.nodes = new Map();
        this.edges = new Map();
        this.encryptionKey = null;
        if (options === null || options === void 0 ? void 0 : options.encryptionKey) {
            this.encryptionKey = options.encryptionKey;
        }
    }
    addNode(label, type, properties) {
        const id = (0, uuid_1.v4)();
        const node = { id, label, type, properties };
        this.nodes.set(id, node);
        return node;
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return Array.from(this.edges.values());
    }
    addEdge(sourceId, targetId, label, properties) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            return null;
        }
        const id = (0, uuid_1.v4)();
        const edge = { id, source: sourceId, target: targetId, label, properties };
        this.edges.set(id, edge);
        return edge;
    }
    findNodeByLabel(label) {
        for (const node of this.nodes.values()) {
            if (node.label === label) {
                return node;
            }
        }
        return undefined;
    }
    load(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (yield fs.pathExists(filePath)) {
                    let rawData = yield fs.readFile(filePath, 'utf-8');
                    // Decrypt if encryption key is available
                    if (this.encryptionKey) {
                        rawData = this.decrypt(rawData);
                    }
                    const data = JSON.parse(rawData);
                    // Reconstruct nodes map
                    if (data.nodes) {
                        this.nodes = new Map(Object.entries(data.nodes));
                    }
                    // Reconstruct edges map
                    if (data.edges) {
                        this.edges = new Map(Object.entries(data.edges));
                    }
                    console.log(`ConceptGraph loaded from ${filePath}: ${this.nodes.size} nodes, ${this.edges.size} edges`);
                }
                else {
                    console.log(`ConceptGraph: No persistence file found at ${filePath}. Starting fresh.`);
                }
            }
            catch (error) {
                console.error(`ConceptGraph: Failed to load from ${filePath}:`, error);
                this.nodes = new Map();
                this.edges = new Map();
            }
        });
    }
    persist(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield fs.ensureDir(path.dirname(filePath));
                // Write to file
                yield fs.writeFile(filePath, dataToPersist, 'utf-8');
                console.log(`ConceptGraph persisted to ${filePath}: ${this.nodes.size} nodes, ${this.edges.size} edges`);
            }
            catch (error) {
                console.error(`ConceptGraph: Failed to persist to ${filePath}:`, error);
            }
        });
    }
    /**
     * Get graph statistics
     */
    getStats() {
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
    getNodeTypes() {
        const types = {};
        for (const node of this.nodes.values()) {
            types[node.type] = (types[node.type] || 0) + 1;
        }
        return types;
    }
    /**
     * Get distribution of edge types
     */
    getEdgeTypes() {
        const types = {};
        for (const edge of this.edges.values()) {
            types[edge.label] = (types[edge.label] || 0) + 1;
        }
        return types;
    }
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data) {
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
    decrypt(encryptedData) {
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
exports.ConceptGraph = ConceptGraph;
