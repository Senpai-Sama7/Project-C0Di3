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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookIngestionService = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class BookIngestionService {
    constructor(vectorStore) {
        this.vectorStore = vectorStore;
    }
    ingestBook(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Ingesting book from: ${filePath}`);
            const text = yield fs_extra_1.default.readFile(filePath, 'utf-8');
            // Simple chunking strategy (by paragraph)
            const chunks = text.split(/\n\s*\n/);
            const documents = chunks.map((chunk, index) => ({
                id: `${path_1.default.basename(filePath)}-${index}`,
                text: chunk,
                metadata: {
                    source: filePath,
                },
            }));
            yield this.vectorStore.addDocuments(documents);
            console.log(`Successfully ingested ${documents.length} chunks from ${filePath}`);
        });
    }
}
exports.BookIngestionService = BookIngestionService;
