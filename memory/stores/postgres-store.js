"use strict";
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
exports.PostgresVectorStore = void 0;
// Conditional import to avoid errors when pg is not installed
let Pool;
try {
    const pg = require('pg');
    Pool = pg.Pool;
}
catch (error) {
    // pg module not available, will throw error if PostgresVectorStore is instantiated
    Pool = null;
}
const embedding_service_1 = require("../../services/embedding-service");
class PostgresVectorStore {
    constructor(connectionString, tableName = 'documents') {
        if (!Pool) {
            throw new Error('PostgreSQL client (pg) is not installed. Please install it with: npm install pg');
        }
        this.pool = new Pool({ connectionString });
        this.tableName = tableName;
        this.embeddingService = new embedding_service_1.EmbeddingService();
        this.initializeDb();
    }
    initializeDb() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query(`
                CREATE TABLE IF NOT EXISTS ${this.tableName} (
                    id TEXT PRIMARY KEY,
                    content TEXT,
                    embedding VECTOR(1536) -- Assuming 1536-dimensional embeddings
                );
            `);
            }
            finally {
                client.release();
            }
        });
    }
    add(id, text) {
        return __awaiter(this, void 0, void 0, function* () {
            const embedding = yield this.embeddingService.getEmbedding(text);
            const client = yield this.pool.connect();
            try {
                yield client.query(`INSERT INTO ${this.tableName} (id, content, embedding) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3`, [id, text, JSON.stringify(embedding)]);
            }
            finally {
                client.release();
            }
        });
    }
    addDocuments(documents) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                for (const doc of documents) {
                    const embedding = yield this.embeddingService.getEmbedding(doc.text);
                    yield client.query(`INSERT INTO ${this.tableName} (id, content, embedding) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3`, [doc.id, doc.text, JSON.stringify(embedding)]);
                }
                yield client.query('COMMIT');
            }
            catch (e) {
                yield client.query('ROLLBACK');
                throw e;
            }
            finally {
                client.release();
            }
        });
    }
    findSimilar(query, k, threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryEmbedding = yield this.embeddingService.getEmbedding(query);
            const client = yield this.pool.connect();
            try {
                const result = yield client.query(`SELECT id, content, 1 - (embedding <=> $1) as score FROM ${this.tableName} WHERE 1 - (embedding <=> $1) > $2 ORDER BY score DESC LIMIT $3`, [JSON.stringify(queryEmbedding), threshold, k]);
                return result.rows.map((row) => ({ id: row.id, text: row.content, score: row.score }));
            }
            finally {
                client.release();
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                yield client.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
            }
            finally {
                client.release();
            }
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            const client = yield this.pool.connect();
            try {
                const result = yield client.query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
                return parseInt(result.rows[0].count);
            }
            finally {
                client.release();
            }
        });
    }
}
exports.PostgresVectorStore = PostgresVectorStore;
