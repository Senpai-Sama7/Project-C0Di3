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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlamaCppClient = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * LlamaCppClient provides an interface to a llama.cpp server for completions and embeddings.
 */
class LlamaCppClient {
    constructor(apiUrl = process.env.LLM_API_URL || 'http://localhost:8000') {
        this.timeout = 15000; // 15s default timeout
        this.maxRetries = 3;
        this.apiUrl = apiUrl;
    }
    /**
     * Generate a completion from llama.cpp
     * @param options LlamaCppCompletionOptions
     * @returns Promise<string>
     */
    generate(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let attempt = 0;
            let lastError = null;
            while (attempt < this.maxRetries) {
                try {
                    const response = yield axios_1.default.post(`${this.apiUrl}/completion`, {
                        prompt: options.prompt,
                        n_predict: options.n_predict || 256,
                        temperature: options.temperature || 0.7,
                        stream: false,
                        stop: options.stop || undefined
                    }, { timeout: this.timeout });
                    return response.data.content;
                }
                catch (error) {
                    lastError = error;
                    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) >= 500) {
                        attempt++;
                        if (attempt >= this.maxRetries)
                            break;
                        yield new Promise(res => setTimeout(res, 500 * attempt));
                    }
                    else {
                        throw new Error(`LlamaCppClient: ${error.message}`);
                    }
                }
            }
            throw new Error(`LlamaCppClient: Failed after ${this.maxRetries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || lastError}`);
        });
    }
    /**
     * Generate a streaming completion from llama.cpp
     * @param options LlamaCppCompletionOptions
     * @returns AsyncGenerator<string>
     */
    generateStream(options) {
        return __asyncGenerator(this, arguments, function* generateStream_1() {
            var _a, e_1, _b, _c;
            var _d;
            let attempt = 0;
            let lastError = null;
            while (attempt < this.maxRetries) {
                try {
                    const response = yield __await((0, axios_1.default)({
                        method: 'post',
                        url: `${this.apiUrl}/completion`,
                        data: {
                            prompt: options.prompt,
                            n_predict: options.n_predict || 256,
                            temperature: options.temperature || 0.7,
                            stream: true,
                            stop: options.stop || undefined
                        },
                        responseType: 'stream',
                        timeout: this.timeout
                    }));
                    const stream = response.data;
                    let buffer = '';
                    try {
                        for (var _e = true, stream_1 = (e_1 = void 0, __asyncValues(stream)), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _a = stream_1_1.done, !_a; _e = true) {
                            _c = stream_1_1.value;
                            _e = false;
                            const chunk = _c;
                            buffer += chunk.toString();
                            let lines = buffer.split('\n');
                            buffer = lines.pop() || '';
                            for (const line of lines) {
                                if (line.trim()) {
                                    try {
                                        const data = JSON.parse(line);
                                        if (data.content)
                                            yield yield __await(data.content);
                                    }
                                    catch (_f) { }
                                }
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_e && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return yield __await(void 0);
                }
                catch (error) {
                    lastError = error;
                    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || ((_d = error.response) === null || _d === void 0 ? void 0 : _d.status) >= 500) {
                        attempt++;
                        if (attempt >= this.maxRetries)
                            break;
                        yield __await(new Promise(res => setTimeout(res, 500 * attempt)));
                    }
                    else {
                        throw new Error(`LlamaCppClient (stream): ${error.message}`);
                    }
                }
            }
            throw new Error(`LlamaCppClient (stream): Failed after ${this.maxRetries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || lastError}`);
        });
    }
    /**
     * Get an embedding from llama.cpp
     * @param text string
     * @returns Promise<number[]>
     */
    embed(text) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let attempt = 0;
            let lastError = null;
            while (attempt < this.maxRetries) {
                try {
                    const response = yield axios_1.default.post(`${this.apiUrl}/embedding`, { content: text }, { timeout: this.timeout });
                    return response.data.embedding;
                }
                catch (error) {
                    lastError = error;
                    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED' || ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) >= 500) {
                        attempt++;
                        if (attempt >= this.maxRetries)
                            break;
                        yield new Promise(res => setTimeout(res, 500 * attempt));
                    }
                    else {
                        throw new Error(`LlamaCppClient (embed): ${error.message}`);
                    }
                }
            }
            throw new Error(`LlamaCppClient (embed): Failed after ${this.maxRetries} attempts: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || lastError}`);
        });
    }
}
exports.LlamaCppClient = LlamaCppClient;
