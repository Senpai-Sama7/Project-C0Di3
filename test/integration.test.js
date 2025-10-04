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
const gemma3n_4B_agent_1 = require("../gemma3n:4B-agent");
describe('Integration: Agent end-to-end', () => {
    it('should generate a real response from llama.cpp', () => __awaiter(void 0, void 0, void 0, function* () {
        const agent = new gemma3n_4B_agent_1.GemmaAgent();
        const prompt = 'What is the capital of France?';
        const response = yield agent.process(prompt);
        expect(typeof response.text === 'string' && response.text.length > 0).toBe(true);
        expect(Array.isArray(response.reasoning)).toBe(true);
        expect(response.performance).toBeDefined();
        expect(response.memory).toBeDefined();
        console.log('Agent response:', response.text);
    }));
    it('should handle an invalid prompt gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
        const agent = new gemma3n_4B_agent_1.GemmaAgent();
        yield expect(agent.process('')).rejects.toThrow();
    }));
    it('should expose tool calls and memory state', () => __awaiter(void 0, void 0, void 0, function* () {
        const agent = new gemma3n_4B_agent_1.GemmaAgent();
        // Simulate a prompt that triggers a tool (if any tools are registered)
        const prompt = 'Use a tool to calculate 2+2.';
        const response = yield agent.process(prompt);
        expect(response.toolCalls).toBeDefined();
        expect(response.memory).toBeDefined();
    }));
});
