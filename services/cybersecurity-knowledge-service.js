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
exports.CybersecurityKnowledgeService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class CybersecurityKnowledgeService {
    constructor(memory, client, eventBus, booksPath = './memory/cybersecurity-books') {
        this.concepts = new Map();
        this.techniques = new Map();
        this.tools = new Map();
        this.memory = memory;
        this.client = client;
        this.eventBus = eventBus;
        this.logger = new logger_1.Logger('CybersecurityKnowledgeService');
        this.booksPath = booksPath;
    }
    /**
     * Initialize the cybersecurity knowledge service
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Initializing Cybersecurity Knowledge Service...');
            try {
                // Load and process all cybersecurity books
                yield this.loadCybersecurityBooks();
                // Create embeddings for all concepts
                yield this.createConceptEmbeddings();
                // Build relationships between concepts
                yield this.buildConceptRelationships();
                this.logger.info(`Loaded ${this.concepts.size} cybersecurity concepts`);
                this.eventBus.emit('cybersecurity-knowledge.initialized', {
                    conceptCount: this.concepts.size,
                    techniqueCount: this.techniques.size,
                    toolCount: this.tools.size
                });
            }
            catch (error) {
                this.logger.error('Failed to initialize cybersecurity knowledge service:', error);
                throw error;
            }
        });
    }
    /**
     * Load and process cybersecurity books from JSON files
     */
    loadCybersecurityBooks() {
        return __awaiter(this, void 0, void 0, function* () {
            const bookFiles = yield fs.readdir(this.booksPath);
            for (const file of bookFiles) {
                if (file.endsWith('.json')) {
                    yield this.processBookFile(path.join(this.booksPath, file));
                }
            }
        });
    }
    /**
     * Process a single cybersecurity book file
     */
    processBookFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(`Processing book: ${path.basename(filePath)}`);
            try {
                const bookData = yield fs.readJson(filePath);
                const bookName = path.basename(filePath, '.json');
                if (bookData.content_blocks) {
                    yield this.extractConceptsFromBook(bookData.content_blocks, bookName);
                }
            }
            catch (error) {
                this.logger.error(`Failed to process book ${filePath}:`, error);
            }
        });
    }
    /**
     * Extract cybersecurity concepts from book content blocks
     */
    extractConceptsFromBook(contentBlocks, bookName) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const block of contentBlocks) {
                if (block.type === 'paragraph' || block.type === 'heading') {
                    const concept = yield this.extractConceptFromBlock(block, bookName);
                    if (concept) {
                        this.concepts.set(concept.id, concept);
                    }
                }
            }
        });
    }
    /**
     * Extract a cybersecurity concept from a content block
     */
    extractConceptFromBlock(block, bookName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const content = block.content;
            if (!content || content.length < 10)
                return null;
            // Use LLM to analyze the content and extract cybersecurity concepts
            const analysis = yield this.analyzeContentForConcepts(content, bookName);
            if (analysis.concepts.length === 0)
                return null;
            const concept = analysis.concepts[0]; // Take the primary concept
            const conceptId = `concept-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            return {
                id: conceptId,
                name: concept.name,
                description: concept.description,
                category: concept.category,
                source: bookName,
                content: content,
                metadata: {
                    chapter: (_a = block.metadata) === null || _a === void 0 ? void 0 : _a.chapter,
                    page: (_b = block.metadata) === null || _b === void 0 ? void 0 : _b.page,
                    difficulty: concept.difficulty,
                    tools: concept.tools,
                    techniques: concept.techniques,
                    codeExamples: concept.codeExamples
                },
                relatedConcepts: [],
                confidence: concept.confidence,
                lastUpdated: Date.now()
            };
        });
    }
    /**
     * Use LLM to analyze content and extract cybersecurity concepts
     */
    analyzeContentForConcepts(content, bookName) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = `
      Analyze the following cybersecurity content and extract relevant concepts, techniques, tools, and code examples.

      Content: ${content}
      Source: ${bookName}

      Return a JSON object with the following structure:
      {
        "concepts": [
          {
            "name": "concept name",
            "description": "brief description",
            "category": "red-team|blue-team|general|tools|techniques|defense",
            "difficulty": "beginner|intermediate|advanced",
            "tools": ["tool1", "tool2"],
            "techniques": ["technique1", "technique2"],
            "codeExamples": ["code example 1", "code example 2"],
            "confidence": 0.0-1.0
          }
        ]
      }

      Only return concepts that are clearly cybersecurity-related. If no relevant concepts are found, return an empty concepts array.
    `;
            try {
                const response = yield this.client.generate({ prompt });
                const result = JSON.parse(response);
                // Validate and sanitize the response
                if (result.concepts && Array.isArray(result.concepts)) {
                    result.concepts = result.concepts.map((concept) => (Object.assign(Object.assign({}, concept), { category: this.validateCategory(concept.category), difficulty: this.validateDifficulty(concept.difficulty) })));
                }
                return result;
            }
            catch (error) {
                this.logger.warn('Failed to analyze content for concepts:', error);
                return { concepts: [] };
            }
        });
    }
    validateCategory(category) {
        const validCategories = ['red-team', 'blue-team', 'general', 'tools', 'techniques', 'defense'];
        return validCategories.includes(category) ? category : 'general';
    }
    validateDifficulty(difficulty) {
        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        return validDifficulties.includes(difficulty) ? difficulty : 'intermediate';
    }
    /**
     * Create embeddings for all cybersecurity concepts
     */
    createConceptEmbeddings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Creating embeddings for cybersecurity concepts...');
            for (const concept of this.concepts.values()) {
                try {
                    const embeddingText = `${concept.name} ${concept.description} ${concept.content}`;
                    if (this.client && this.client.embed) {
                        concept.embedding = yield this.client.embed(embeddingText);
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to create embedding for concept ${concept.name}:`, error);
                }
            }
        });
    }
    /**
     * Build relationships between cybersecurity concepts
     */
    buildConceptRelationships() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Building concept relationships...');
            for (const concept of this.concepts.values()) {
                const related = yield this.findRelatedConcepts(concept);
                concept.relatedConcepts = related.map(c => c.id);
            }
        });
    }
    /**
     * Find related concepts for a given concept
     */
    findRelatedConcepts(concept) {
        return __awaiter(this, void 0, void 0, function* () {
            const related = [];
            for (const otherConcept of this.concepts.values()) {
                if (otherConcept.id === concept.id)
                    continue;
                const similarity = yield this.calculateConceptSimilarity(concept, otherConcept);
                if (similarity > 0.7) {
                    related.push(otherConcept);
                }
            }
            return related.slice(0, 5); // Limit to top 5 related concepts
        });
    }
    /**
     * Calculate similarity between two concepts
     */
    calculateConceptSimilarity(concept1, concept2) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!concept1.embedding || !concept2.embedding)
                return 0;
            // Simple cosine similarity calculation
            const dotProduct = concept1.embedding.reduce((sum, val, i) => { var _a; return sum + val * (((_a = concept2.embedding) === null || _a === void 0 ? void 0 : _a[i]) || 0); }, 0);
            const magnitude1 = Math.sqrt(concept1.embedding.reduce((sum, val) => sum + val * val, 0));
            const magnitude2 = Math.sqrt((concept2.embedding || []).reduce((sum, val) => sum + val * val, 0));
            return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
        });
    }
    /**
     * Query cybersecurity knowledge based on user input
     */
    queryKnowledge(query) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Querying cybersecurity knowledge: ${query.query}`);
            try {
                // Find relevant concepts using semantic search
                const relevantConcepts = yield this.findRelevantConcepts(query);
                // Extract techniques, tools, and code examples
                const techniques = this.extractTechniques(relevantConcepts);
                const tools = this.extractTools(relevantConcepts);
                const codeExamples = this.extractCodeExamples(relevantConcepts);
                // Calculate overall confidence
                const confidence = relevantConcepts.length > 0
                    ? relevantConcepts.reduce((sum, c) => sum + c.confidence, 0) / relevantConcepts.length
                    : 0;
                const sources = [...new Set(relevantConcepts.map(c => c.source))];
                return {
                    concepts: relevantConcepts,
                    techniques,
                    tools,
                    codeExamples,
                    confidence,
                    sources
                };
            }
            catch (error) {
                this.logger.error('Failed to query cybersecurity knowledge:', error);
                throw error;
            }
        });
    }
    /**
     * Find relevant concepts using semantic search
     */
    findRelevantConcepts(query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.client || !this.client.embed) {
                this.logger.warn('Client or embed method not available');
                return [];
            }
            const queryEmbedding = yield this.client.embed(query.query);
            const relevant = [];
            for (const concept of this.concepts.values()) {
                if (!concept.embedding)
                    continue;
                // Apply filters
                if (query.category && concept.category !== query.category)
                    continue;
                if (query.difficulty && concept.metadata.difficulty !== query.difficulty)
                    continue;
                // Calculate similarity
                const similarity = yield this.calculateSimilarity(queryEmbedding, concept.embedding);
                if (similarity > 0.3) { // Threshold for relevance
                    relevant.push({ concept, score: similarity });
                }
            }
            // Sort by relevance and return top results
            return relevant
                .sort((a, b) => b.score - a.score)
                .slice(0, query.maxResults || 10)
                .map(r => r.concept);
        });
    }
    /**
     * Calculate similarity between query embedding and concept embedding
     */
    calculateSimilarity(queryEmbedding, conceptEmbedding) {
        return __awaiter(this, void 0, void 0, function* () {
            const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * conceptEmbedding[i], 0);
            const magnitude1 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
            const magnitude2 = Math.sqrt(conceptEmbedding.reduce((sum, val) => sum + val * val, 0));
            return dotProduct / (magnitude1 * magnitude2);
        });
    }
    /**
     * Extract techniques from relevant concepts
     */
    extractTechniques(concepts) {
        const techniques = new Set();
        for (const concept of concepts) {
            if (concept.metadata.techniques) {
                concept.metadata.techniques.forEach(t => techniques.add(t));
            }
        }
        return Array.from(techniques);
    }
    /**
     * Extract tools from relevant concepts
     */
    extractTools(concepts) {
        const tools = new Set();
        for (const concept of concepts) {
            if (concept.metadata.tools) {
                concept.metadata.tools.forEach(t => tools.add(t));
            }
        }
        return Array.from(tools);
    }
    /**
     * Extract code examples from relevant concepts
     */
    extractCodeExamples(concepts) {
        const codeExamples = new Set();
        for (const concept of concepts) {
            if (concept.metadata.codeExamples) {
                concept.metadata.codeExamples.forEach(c => codeExamples.add(c));
            }
        }
        return Array.from(codeExamples);
    }
    /**
     * Get concept by ID
     */
    getConcept(id) {
        return this.concepts.get(id);
    }
    /**
     * Get all concepts
     */
    getAllConcepts() {
        return Array.from(this.concepts.values());
    }
    /**
     * Get concepts by category
     */
    getConceptsByCategory(category) {
        return Array.from(this.concepts.values()).filter(c => c.category === category);
    }
    /**
     * Get statistics about the knowledge base
     */
    getKnowledgeStatistics() {
        const conceptsByCategory = {};
        const conceptsByDifficulty = {};
        for (const concept of this.concepts.values()) {
            conceptsByCategory[concept.category] = (conceptsByCategory[concept.category] || 0) + 1;
            if (concept.metadata.difficulty) {
                conceptsByDifficulty[concept.metadata.difficulty] = (conceptsByDifficulty[concept.metadata.difficulty] || 0) + 1;
            }
        }
        const totalTechniques = this.extractTechniques(Array.from(this.concepts.values())).length;
        const totalTools = this.extractTools(Array.from(this.concepts.values())).length;
        return {
            totalConcepts: this.concepts.size,
            conceptsByCategory,
            conceptsByDifficulty,
            totalTechniques,
            totalTools
        };
    }
}
exports.CybersecurityKnowledgeService = CybersecurityKnowledgeService;
