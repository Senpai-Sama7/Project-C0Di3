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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const logger_1 = require("../utils/logger");
class GeminiClient {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.options = options;
        this.configManager = options.configManager;
        this.logger = new logger_1.Logger('GeminiClient');
        // Get API key from config, environment, or options
        const apiKey = options.apiKey ||
            ((_a = this.configManager) === null || _a === void 0 ? void 0 : _a.get('gemini.apiKey')) ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable or provide in config.');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const modelName = options.model || ((_b = this.configManager) === null || _b === void 0 ? void 0 : _b.get('gemini.model', 'gemini-2.0-flash-exp')) || 'gemini-2.0-flash-exp';
        const generationConfig = {
            temperature: (_c = options.temperature) !== null && _c !== void 0 ? _c : (_d = this.configManager) === null || _d === void 0 ? void 0 : _d.get('gemini.temperature', 0.7),
            maxOutputTokens: (_e = options.maxTokens) !== null && _e !== void 0 ? _e : (_f = this.configManager) === null || _f === void 0 ? void 0 : _f.get('gemini.maxTokens', 8192),
            topP: (_g = options.topP) !== null && _g !== void 0 ? _g : (_h = this.configManager) === null || _h === void 0 ? void 0 : _h.get('gemini.topP', 0.9)
        };
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig
        });
    }
    generate(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, options = {}) {
            try {
                this.logger.debug('Generating response for prompt:', prompt.substring(0, 100) + '...');
                const result = yield this.model.generateContent(prompt);
                const response = yield result.response;
                const text = response.text();
                this.logger.debug('Generated response length:', text.length);
                return {
                    text,
                    usage: {
                        promptTokens: 0, // Gemini doesn't provide token counts in the same way
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    model: this.options.model || 'gemini-2.0-flash-exp'
                };
            }
            catch (error) {
                this.logger.error('Error generating content:', error);
                throw error;
            }
        });
    }
    generateStream(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, options = {}) {
            try {
                this.logger.debug('Starting streaming generation for prompt:', prompt.substring(0, 100) + '...');
                if (!this.model.generateContentStream) {
                    throw new Error('Streaming is not supported by the configured Gemini model');
                }
                const rawResult = yield this.model.generateContentStream(prompt);
                const stream = rawResult && typeof rawResult[Symbol.asyncIterator] === 'function'
                    ? rawResult
                    : rawResult.stream;
                if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
                    throw new Error('Gemini streaming response is not iterable');
                }
                const resolvedStream = stream;
                function streamGenerator() {
                    return __asyncGenerator(this, arguments, function* streamGenerator_1() {
                        var _a, e_1, _b, _c;
                        var _d;
                        try {
                            for (var _e = true, resolvedStream_1 = __asyncValues(resolvedStream), resolvedStream_1_1; resolvedStream_1_1 = yield __await(resolvedStream_1.next()), _a = resolvedStream_1_1.done, !_a; _e = true) {
                                _c = resolvedStream_1_1.value;
                                _e = false;
                                const chunk = _c;
                                if (!chunk) {
                                    continue;
                                }
                                const directText = typeof chunk.text === 'string' ? chunk.text : undefined;
                                if (directText) {
                                    yield yield __await(directText);
                                    continue;
                                }
                                const textFn = chunk === null || chunk === void 0 ? void 0 : chunk.text;
                                if (typeof textFn === 'function') {
                                    const value = textFn.call(chunk);
                                    if (typeof value === 'string' && value.length > 0) {
                                        yield yield __await(value);
                                        continue;
                                    }
                                }
                                const candidates = chunk === null || chunk === void 0 ? void 0 : chunk.candidates;
                                if (Array.isArray(candidates)) {
                                    for (const candidate of candidates) {
                                        const parts = (_d = candidate === null || candidate === void 0 ? void 0 : candidate.content) === null || _d === void 0 ? void 0 : _d.parts;
                                        if (Array.isArray(parts)) {
                                            for (const part of parts) {
                                                const partText = typeof (part === null || part === void 0 ? void 0 : part.text) === 'string' ? part.text : undefined;
                                                if (partText) {
                                                    yield yield __await(partText);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (!_e && !_a && (_b = resolvedStream_1.return)) yield __await(_b.call(resolvedStream_1));
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                    });
                }
                return streamGenerator();
            }
            catch (error) {
                this.logger.error('Error in streaming generation:', error);
                throw error;
            }
        });
    }
    embedText(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const errorMessage = 'GeminiClient.embedText is intentionally disabled. Configure a supported embedding model before enabling embeddings.';
            this.logger.error(errorMessage);
            console.error(`CRITICAL: ${errorMessage} Input text (first 50 chars): "${text.substring(0, 50)}"`);
            throw new Error(errorMessage);
            // To implement this, you would typically use a specific embedding model from Gemini:
            // Example (conceptual, check official Gemini SDK/API docs):
            // const embeddingModel = this.genAI.getGenerativeModel({ model: "models/embedding-001" }); // Or appropriate model
            // const result = await embeddingModel.embedContent(text);
            // return result.embedding.values;
        });
    }
    generateContent(prompt, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = this.genAI.getGenerativeModel({ model: (options === null || options === void 0 ? void 0 : options.model) || 'gemini-pro' });
            const result = yield model.generateContent(prompt);
            return result.response.text();
        });
    }
    getModel() {
        return this.model;
    }
    getModelName() {
        var _a;
        return this.options.model || ((_a = this.configManager) === null || _a === void 0 ? void 0 : _a.get('gemini.model', 'gemini-2.0-flash-exp')) || 'gemini-2.0-flash-exp';
    }
}
exports.GeminiClient = GeminiClient;
