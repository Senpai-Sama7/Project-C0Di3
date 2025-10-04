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
exports.LLMService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class LLMService {
    constructor(options = {}) {
        this.logger = new logger_1.Logger('LLMService');
        const defaultApiUrl = 'http://localhost:8000'; // Llama.cpp default
        const defaultPromptEnhancerUrl = 'http://localhost:5002/enhance'; // Example default
        if (process.env.LLM_API_URL) {
            this.apiUrl = process.env.LLM_API_URL;
        }
        else if (options.apiUrl) {
            this.apiUrl = options.apiUrl;
        }
        else {
            this.apiUrl = defaultApiUrl;
            this.logger.warn(`LLM_API_URL not set, using default: ${this.apiUrl}. This is suitable for local development only.`);
            if (process.env.NODE_ENV === 'production') {
                this.logger.error('CRITICAL WARNING: Using default LLM_API_URL in production environment. This is insecure and likely incorrect.');
            }
        }
        if (process.env.PROMPT_ENHANCER_URL) {
            this.promptEnhancerUrl = process.env.PROMPT_ENHANCER_URL;
        }
        else if (options.promptEnhancerUrl) {
            this.promptEnhancerUrl = options.promptEnhancerUrl;
        }
        else {
            // Allowing promptEnhancerUrl to be undefined if not set, as it's optional.
            // If you want a default even if not in env/options, set it here.
            // this.promptEnhancerUrl = defaultPromptEnhancerUrl;
            // this.logger.warn(`PROMPT_ENHANCER_URL not set, using default: ${this.promptEnhancerUrl}`);
        }
        this.timeout = options.timeout || 15000;
        this.logger.info(`LLMService initialized. API URL: ${this.apiUrl}, Prompt Enhancer URL: ${this.promptEnhancerUrl || 'Not configured'}`);
    }
    /**
     * Enhance a prompt using an external Python microservice
     */
    enhancePrompt(prompt, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.promptEnhancerUrl) {
                this.logger.debug('Prompt enhancer URL not configured, returning original prompt.');
                return prompt;
            }
            try {
                this.logger.debug(`Enhancing prompt via ${this.promptEnhancerUrl}`);
                const response = yield axios_1.default.post(this.promptEnhancerUrl, { prompt, context }, { timeout: this.timeout });
                return response.data.enhanced || prompt;
            }
            catch (err) {
                this.logger.error(`Error calling prompt enhancer service at ${this.promptEnhancerUrl}: ${err.message}. Falling back to original prompt.`);
                return prompt;
            }
        });
    }
    /**
     * Send a prompt to llama.cpp and get a completion
     */
    complete(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, opts = {}) {
            try {
                const response = yield axios_1.default.post(`${this.apiUrl}/completion`, {
                    prompt,
                    n_predict: opts.n_predict || 256,
                    temperature: opts.temperature || 0.7,
                    stream: false,
                    stop: opts.stop || undefined
                }, { timeout: this.timeout });
                return response.data.content;
            }
            catch (err) {
                throw new Error(`LLMService: ${err.message}`);
            }
        });
    }
    /**
     * Summarize and explain tool output for user readability
     */
    summarizeToolOutput(output, toolName) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = `Summarize and explain the following output from the tool '${toolName}' for a non-technical user:\n\n${output}\n\nSummary:`;
            return this.complete(prompt, { n_predict: 128, temperature: 0.5 });
        });
    }
}
exports.LLMService = LLMService;
