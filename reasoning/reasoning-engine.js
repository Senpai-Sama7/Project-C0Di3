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
exports.ReasoningError = exports.ReasoningEngine = void 0;
const event_bus_1 = require("../events/event-bus");
const tool_registry_1 = require("../tools/tool-registry");
const logger_1 = require("../utils/logger");
const absolute_zero_reasoner_1 = require("./absolute-zero-reasoner");
const darwin_godel_engine_1 = require("./darwin-godel-engine");
const reasoning_graph_1 = require("./reasoning-graph");
/**
 * Advanced reasoning engine that combines multiple reasoning strategies
 */
class ReasoningEngine {
    constructor(options) {
        var _a, _b;
        this.client = options.client;
        this.memory = options.memory;
        this.toolRegistry = (_a = options.toolRegistry) !== null && _a !== void 0 ? _a : new tool_registry_1.ToolRegistry();
        this.eventBus = (_b = options.eventBus) !== null && _b !== void 0 ? _b : new event_bus_1.EventBus();
        this.logger = new logger_1.Logger('ReasoningEngine');
        this.zeroShotEnabled = options.zeroShotEnabled !== false;
        this.cybersecurityKnowledgeService = options.cybersecurityKnowledgeService;
        // Initialize specialized reasoning components
        this.darwinGodelEngine = new darwin_godel_engine_1.DarwinGodelEngine({
            client: this.client,
            memory: this.memory,
            eventBus: this.eventBus
        });
        this.absoluteZeroReasoner = new absolute_zero_reasoner_1.AbsoluteZeroReasoner({
            client: this.client,
            memory: this.memory,
            eventBus: this.eventBus
        });
        this.reasoningGraph = new reasoning_graph_1.ReasoningGraph({
            eventBus: this.eventBus
        });
    }
    /**
     * Generate a reasoning plan for a given input
     * @param input User input or query
     * @param context Current context
     * @param options Additional options
     * @returns Structured reasoning plan
     */
    generatePlan(input_1, context_1) {
        return __awaiter(this, arguments, void 0, function* (input, context, options = {}) {
            var _a;
            const inputText = typeof input === 'string' ? input : JSON.stringify(input);
            this.logger.debug('Generating reasoning plan for:', inputText);
            this.eventBus.emit('reasoning.plan.start', { input: inputText });
            // Retrieve relevant memories to inform reasoning
            const { memories, fromCache, cachedResult } = yield this.memory.retrieveRelevantMemories(inputText, {
                limit: (_a = options.memoryLimit) !== null && _a !== void 0 ? _a : 5,
                bypassCache: options.bypassCache
            });
            // If we have a cached result, we can skip reasoning
            if (fromCache && !options.bypassCache) {
                this.logger.debug('Using cached reasoning plan');
                this.eventBus.emit('reasoning.plan.cached', { input: inputText });
                return {
                    steps: [{
                            type: 'generation',
                            description: 'Using cached response',
                            input: inputText,
                            memories: [],
                            result: cachedResult
                        }],
                    toolsRequired: [],
                    estimatedComplexity: 0.1,
                    cached: true
                };
            }
            // Analyze input to determine complexity and reasoning approach
            let inputAnalysis;
            try {
                inputAnalysis = yield this.analyzeInput(inputText);
            }
            catch (error) {
                this.logger.error('Error in analyzeInput:', error);
                throw new ReasoningError('Failed to analyze input', error);
            }
            // Select reasoning strategy based on complexity
            let reasoningStrategy;
            if (inputAnalysis.complexity < 0.3 && this.zeroShotEnabled) {
                reasoningStrategy = 'zero-shot';
            }
            else if (inputAnalysis.complexity < 0.7) {
                reasoningStrategy = 'darwin-godel';
            }
            else {
                reasoningStrategy = 'absolute-zero';
            }
            // Override strategy if specified in options
            if (options.reasoningStrategy) {
                reasoningStrategy = options.reasoningStrategy;
            }
            let reasoningPlan;
            try {
                switch (reasoningStrategy) {
                    case 'zero-shot':
                        reasoningPlan = yield this.generateZeroShotPlan(inputText, context, memories);
                        break;
                    case 'darwin-godel':
                        reasoningPlan = (yield this.darwinGodelEngine.generatePlan(inputText, context, memories));
                        break;
                    case 'absolute-zero':
                        reasoningPlan = yield this.absoluteZeroReasoner.generatePlan(inputText, context, memories);
                        break;
                }
            }
            catch (error) {
                this.logger.error('Error generating reasoning plan:', error);
                throw new ReasoningError('Failed to generate reasoning plan', error);
            }
            // Determine required tools
            reasoningPlan.toolsRequired = yield this.identifyRequiredTools(inputText);
            this.eventBus.emit('reasoning.plan.complete', {
                input: inputText,
                strategy: reasoningStrategy,
                planSteps: reasoningPlan.steps.length
            });
            return reasoningPlan;
        });
    }
    /**
     * Analyze input to determine complexity and characteristics
     */
    analyzeInput(input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use the model to analyze the complexity of the input
            const prompt = `
      Analyze the following input to determine:
      1. Complexity (0.0-1.0)
      2. Required reasoning types (logical, creative, mathematical, etc.)
      3. Domain knowledge required

      Input: ${input}

      Return a JSON object with these properties.
    `;
            try {
                const response = yield this.client.generate({ prompt });
                return JSON.parse(response);
            }
            catch (error) {
                this.logger.warn('Error analyzing input complexity:', error);
                // Default analysis if generation fails
                return {
                    complexity: 0.5,
                    reasoningTypes: ['logical'],
                    domainKnowledge: []
                };
            }
        });
    }
    /**
     * Generate a simple zero-shot reasoning plan
     */
    generateZeroShotPlan(input, context, relevantMemories) {
        return __awaiter(this, void 0, void 0, function* () {
            // Retrieval-Augmented Generation: use top memories as context
            const { memories } = yield this.memory.retrieveRelevantMemories(input, { limit: 5 });
            const contextText = memories.map((m) => m.content).join('\n---\n');
            const augmentedInput = `Context:\n${contextText}\n\nUser Query: ${input}`;
            // For simple queries, we can just use a direct approach with context
            return {
                steps: [{
                        id: 'direct-response',
                        type: 'generation',
                        description: 'Generate direct response with context',
                        input: augmentedInput,
                        context,
                        memories
                    }],
                toolsRequired: [],
                estimatedComplexity: 0.1,
                cached: false
            };
        });
    }
    /**
     * Identify tools that might be needed for this reasoning plan
     */
    identifyRequiredTools(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTools = this.toolRegistry.getAllTools();
            // If no tools available, return empty array
            if (allTools.length === 0) {
                return [];
            }
            // Use the model to identify required tools
            const toolDescriptions = allTools.map(tool => `${tool.name}: ${tool.description}`).join('\n');
            const prompt = `
      Given the following input and available tools, identify which tools (if any) would be needed to properly address the input.
      Only list tools that are directly relevant and necessary.

      Input: ${input}

      Available tools:
      ${toolDescriptions}

      Return a JSON array of tool names, or an empty array if no tools are required.
    `;
            try {
                const response = yield this.client.generate({ prompt });
                const toolNames = JSON.parse(response);
                if (!Array.isArray(toolNames)) {
                    this.logger.warn('LLM did not return an array for tool identification.');
                    return [];
                }
                // Validate that the returned tools actually exist
                const availableToolNames = new Set(allTools.map(tool => tool.name));
                const validToolNames = toolNames.filter(name => {
                    if (typeof name === 'string' && availableToolNames.has(name)) {
                        return true;
                    }
                    this.logger.warn(`LLM suggested a non-existent tool: ${name}`);
                    return false;
                });
                return validToolNames;
            }
            catch (error) {
                this.logger.warn('Error identifying required tools:', error);
                return [];
            }
        });
    }
    /**
     * Enhanced reasoning with cybersecurity knowledge integration
     */
    executeReasoningPlan(plan, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('Executing reasoning plan with cybersecurity knowledge integration');
            // If we have a cached plan, return it
            if (plan.cached) {
                return this.handleCachedPlan(plan);
            }
            // Integrate cybersecurity knowledge into the reasoning process
            const enhancedContext = yield this.enhanceContextWithCybersecurityKnowledge(context);
            // Execute the reasoning steps with enhanced context
            const result = yield this.executeSteps(plan, enhancedContext);
            return result;
        });
    }
    /**
     * Handle cached reasoning plan
     */
    handleCachedPlan(plan) {
        var _a, _b, _c;
        const cachedStep = plan.steps[0];
        return {
            content: (_c = (_b = (_a = cachedStep.result) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : 'No content from cached result',
            reasoning: [{
                    step: 'cached-response',
                    input: 'N/A',
                    output: 'Used cached response'
                }],
            toolCalls: [],
            cached: true
        };
    }
    /**
     * Execute all steps in the reasoning plan
     */
    executeSteps(plan, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.reasoningGraph.startReasoningProcess();
            const reasoningSteps = [];
            const toolCalls = [];
            let finalOutput = '';
            for (const step of plan.steps) {
                const { stepOutput, toolResult } = yield this.executeStep(step, context);
                if (toolResult) {
                    toolCalls.push(toolResult);
                }
                this.addReasoningStep(step, stepOutput, reasoningSteps);
                // For the last step, capture the output as the final result
                if (step === plan.steps[plan.steps.length - 1]) {
                    finalOutput = typeof stepOutput === 'string' ? stepOutput : JSON.stringify(stepOutput);
                }
            }
            return this.buildReasoningResult(finalOutput, reasoningSteps, toolCalls);
        });
    }
    /**
     * Execute a single step
     */
    executeStep(step, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Executing reasoning step: ${step.type} - ${step.description}`);
            try {
                switch (step.type) {
                    case 'generation':
                        return { stepOutput: yield this.executeGenerationStep(step, context) };
                    case 'tool': {
                        const toolResult = yield this.executeToolStep(step);
                        return { stepOutput: toolResult.output, toolResult };
                    }
                    case 'darwin-godel':
                        return { stepOutput: yield this.darwinGodelEngine.executeStep(step, context) };
                    case 'absolute-zero':
                        return { stepOutput: yield this.absoluteZeroReasoner.executeStep(step, context) };
                    default: {
                        const exhaustiveCheck = step;
                        return { stepOutput: `Unsupported step type: ${exhaustiveCheck.type}` };
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error executing reasoning step: ${step.description}`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return { stepOutput: `Error: ${errorMessage}` };
            }
        });
    }
    /**
     * Add a reasoning step to the results
     */
    addReasoningStep(step, stepOutput, reasoningSteps) {
        var _a, _b, _c, _d;
        const isError = typeof stepOutput === 'string' && stepOutput.startsWith('Error:');
        reasoningSteps.push({
            step: (_a = step.id) !== null && _a !== void 0 ? _a : step.description,
            input: (_b = step.input) !== null && _b !== void 0 ? _b : '',
            output: typeof stepOutput === 'string' ? stepOutput : JSON.stringify(stepOutput),
            error: isError
        });
        this.reasoningGraph.addReasoningStep({
            id: (_c = step.id) !== null && _c !== void 0 ? _c : `step-${reasoningSteps.length}`,
            description: step.description,
            input: (_d = step.input) !== null && _d !== void 0 ? _d : '',
            output: isError ? undefined : stepOutput,
            error: isError ? stepOutput : undefined,
            type: step.type
        });
    }
    /**
     * Build the final reasoning result
     */
    buildReasoningResult(finalOutput, reasoningSteps, toolCalls) {
        const reasoningGraph = this.reasoningGraph.completeReasoningProcess();
        this.eventBus.emit('reasoning.execution.complete', {
            steps: reasoningSteps.length,
            toolCalls: toolCalls.length
        });
        return {
            content: finalOutput,
            reasoning: reasoningSteps,
            toolCalls,
            graph: reasoningGraph,
            cached: false
        };
    }
    /**
     * Execute a generation step
     */
    executeGenerationStep(step, context) {
        return __awaiter(this, void 0, void 0, function* () {
            let prompt = step.input;
            // If we have cybersecurity knowledge in context, enhance the prompt
            if (context.cybersecurityKnowledge) {
                prompt = this.enhancePromptWithCybersecurityKnowledge(prompt, context.cybersecurityKnowledge);
            }
            // Add cybersecurity context to the prompt
            prompt = this.addCybersecurityContext(prompt, context);
            try {
                const response = yield this.client.generate({ prompt });
                return response;
            }
            catch (error) {
                this.logger.error('Error in generation step:', error);
                throw new ReasoningError('Generation failed', error);
            }
        });
    }
    /**
     * Execute a tool step
     */
    executeToolStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                const tool = this.toolRegistry.getTool(step.toolName);
                if (!tool) {
                    throw new Error(`Tool not found: ${step.toolName}`);
                }
                const output = yield tool.execute(step.parameters);
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                this.eventBus.emit('tool.execution', {
                    toolName: step.toolName,
                    executionTime,
                    success: true
                });
                return {
                    toolName: step.toolName,
                    parameters: step.parameters,
                    output,
                    executionTime,
                    success: true
                };
            }
            catch (error) {
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.eventBus.emit('tool.execution', {
                    toolName: step.toolName,
                    executionTime,
                    success: false,
                    error: errorMessage
                });
                return {
                    toolName: step.toolName,
                    parameters: step.parameters,
                    error: errorMessage,
                    executionTime,
                    success: false
                };
            }
        });
    }
    /**
     * Set reasoning mode for a session
     */
    setMode(sessionId, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info(`Setting reasoning mode for session ${sessionId}: ${mode}`);
            yield this.memory.store({ key: `reasoning_mode_${sessionId}`, value: { mode, timestamp: Date.now() } });
            this.eventBus.emit('reasoning.mode.changed', { sessionId, mode });
        });
    }
    orchestrateReasoning(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Orchestrating reasoning process for input:', input);
            const zeroShotPlan = this.zeroShotEnabled
                ? yield this.absoluteZeroReasoner.generatePlan(input, context, [])
                : null;
            const darwinPlan = yield this.darwinGodelEngine.generatePlan(input, context, []);
            const combinedPlan = {
                zeroShotPlan,
                darwinPlan,
                graphRepresentation: this.reasoningGraph.getNodes()
            };
            this.logger.info('Reasoning process completed successfully.');
            return combinedPlan;
        });
    }
    validateReasoningProcess(plan) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.logger.debug('Validating reasoning process');
            try {
                // 1. Validate plan structure
                if (!plan) {
                    this.logger.error('Plan is null or undefined');
                    return false;
                }
                if (!plan.steps || !Array.isArray(plan.steps)) {
                    this.logger.error('Plan missing steps array');
                    return false;
                }
                if (plan.steps.length === 0) {
                    this.logger.error('Plan has no steps');
                    return false;
                }
                // 2. Validate each step has required properties
                for (let i = 0; i < plan.steps.length; i++) {
                    const step = plan.steps[i];
                    if (!step.type) {
                        this.logger.error(`Step ${i} missing type`);
                        return false;
                    }
                    if (!step.description) {
                        this.logger.warn(`Step ${i} missing description`);
                    }
                    // Validate step type is recognized
                    const validTypes = ['generation', 'tool', 'darwin-godel', 'absolute-zero'];
                    if (!validTypes.includes(step.type)) {
                        this.logger.error(`Step ${i} has invalid type: ${step.type}`);
                        return false;
                    }
                    // Validate tool steps have tool name
                    if (step.type === 'tool' && !step.tool) {
                        this.logger.error(`Tool step ${i} missing tool name`);
                        return false;
                    }
                }
                // 3. Check for required tools and verify they're available
                if (plan.toolsRequired && Array.isArray(plan.toolsRequired)) {
                    for (const toolName of plan.toolsRequired) {
                        const tool = this.toolRegistry.getTool(toolName);
                        if (!tool) {
                            this.logger.error(`Required tool not available: ${toolName}`);
                            return false;
                        }
                    }
                }
                // 4. Validate complexity estimate is reasonable
                if (plan.estimatedComplexity !== undefined) {
                    if (typeof plan.estimatedComplexity !== 'number' ||
                        plan.estimatedComplexity < 0 ||
                        plan.estimatedComplexity > 1) {
                        this.logger.error(`Invalid complexity estimate: ${plan.estimatedComplexity}`);
                        return false;
                    }
                }
                // 5. Validate step dependencies (if present)
                if (plan.steps.some((s) => s.dependencies)) {
                    const stepIds = new Set(plan.steps.map((s) => s.id).filter((id) => id));
                    for (const step of plan.steps) {
                        if (step.dependencies && Array.isArray(step.dependencies)) {
                            for (const depId of step.dependencies) {
                                if (!stepIds.has(depId)) {
                                    this.logger.error(`Step ${step.id || 'unknown'} depends on non-existent step: ${depId}`);
                                    return false;
                                }
                            }
                        }
                    }
                }
                // 6. Emit validation success event
                this.eventBus.emit('reasoning.validation.success', {
                    stepCount: plan.steps.length,
                    complexity: plan.estimatedComplexity,
                    toolsRequired: ((_a = plan.toolsRequired) === null || _a === void 0 ? void 0 : _a.length) || 0
                });
                this.logger.debug('Reasoning process validation passed', {
                    steps: plan.steps.length,
                    complexity: plan.estimatedComplexity
                });
                return true;
            }
            catch (error) {
                this.logger.error('Error during reasoning validation:', error);
                return false;
            }
        });
    }
    /**
     * Enhance context with relevant cybersecurity knowledge
     */
    enhanceContextWithCybersecurityKnowledge(context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.cybersecurityKnowledgeService) {
                return context;
            }
            try {
                // Extract key terms from the context for cybersecurity knowledge lookup
                const keyTerms = this.extractKeyTermsFromContext(context);
                const enhancedContext = Object.assign({}, context);
                for (const term of keyTerms) {
                    const knowledge = yield this.cybersecurityKnowledgeService.queryKnowledge({
                        query: term,
                        maxResults: 3,
                        includeCode: true,
                        includeTechniques: true
                    });
                    if (typeof knowledge === 'object' && knowledge !== null && 'concepts' in knowledge && Array.isArray(knowledge.concepts)) {
                        if (!enhancedContext.cybersecurityKnowledge) {
                            enhancedContext.cybersecurityKnowledge = {};
                        }
                        enhancedContext.cybersecurityKnowledge[term] = knowledge;
                    }
                }
                return enhancedContext;
            }
            catch (error) {
                this.logger.warn('Failed to enhance context with cybersecurity knowledge:', error);
                return context;
            }
        });
    }
    /**
     * Extract key terms from context for cybersecurity knowledge lookup
     */
    extractKeyTermsFromContext(context) {
        const terms = [];
        // Extract terms from various context sources
        if (context.input) {
            terms.push(...this.extractTermsFromText(context.input));
        }
        if (context.memories) {
            for (const memory of context.memories) {
                if (memory.content) {
                    terms.push(...this.extractTermsFromText(memory.content));
                }
            }
        }
        // Filter for cybersecurity-related terms
        const cybersecurityTerms = terms.filter(term => this.isCybersecurityRelated(term));
        return [...new Set(cybersecurityTerms)].slice(0, 5); // Limit to top 5 terms
    }
    /**
     * Extract terms from text using simple NLP
     */
    extractTermsFromText(text) {
        if (!text || typeof text !== 'string')
            return [];
        // Simple term extraction - split by common delimiters and filter
        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.isCommonWord(word));
        return words;
    }
    /**
     * Check if a term is cybersecurity-related
     */
    isCybersecurityRelated(term) {
        const cybersecurityKeywords = [
            'attack', 'defense', 'security', 'vulnerability', 'exploit', 'penetration',
            'malware', 'virus', 'trojan', 'ransomware', 'phishing', 'social engineering',
            'network', 'firewall', 'ids', 'ips', 'siem', 'log', 'audit', 'compliance',
            'encryption', 'cryptography', 'hash', 'password', 'authentication', 'authorization',
            'nmap', 'metasploit', 'burp', 'wireshark', 'snort', 'suricata', 'yara',
            'python', 'script', 'shell', 'command', 'terminal', 'linux', 'windows',
            'web', 'application', 'api', 'database', 'sql', 'injection', 'xss', 'csrf',
            'cloud', 'aws', 'azure', 'docker', 'kubernetes', 'container', 'virtualization'
        ];
        return cybersecurityKeywords.some(keyword => term.includes(keyword) || keyword.includes(term));
    }
    /**
     * Check if a word is a common word that should be filtered out
     */
    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
            'after', 'above', 'below', 'between', 'among', 'within', 'without',
            'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'
        ];
        return commonWords.includes(word);
    }
    /**
     * Enhance prompt with cybersecurity knowledge
     */
    enhancePromptWithCybersecurityKnowledge(prompt, knowledge) {
        let enhancedPrompt = prompt;
        for (const [term, knowledgeData] of Object.entries(knowledge)) {
            if (typeof knowledgeData === 'object' && knowledgeData !== null && 'concepts' in knowledgeData && Array.isArray(knowledgeData.concepts)) {
                const concept = knowledgeData.concepts[0];
                enhancedPrompt += `\n\nRelevant cybersecurity knowledge for "${term}":\n`;
                enhancedPrompt += `- Concept: ${concept.name}\n`;
                enhancedPrompt += `- Description: ${concept.description}\n`;
                enhancedPrompt += `- Category: ${concept.category}\n`;
                if ('techniques' in knowledgeData && Array.isArray(knowledgeData.techniques) && knowledgeData.techniques.length > 0) {
                    enhancedPrompt += `- Related techniques: ${knowledgeData.techniques.join(', ')}\n`;
                }
                if ('tools' in knowledgeData && Array.isArray(knowledgeData.tools) && knowledgeData.tools.length > 0) {
                    enhancedPrompt += `- Related tools: ${knowledgeData.tools.join(', ')}\n`;
                }
                if ('codeExamples' in knowledgeData && Array.isArray(knowledgeData.codeExamples) && knowledgeData.codeExamples.length > 0) {
                    enhancedPrompt += `- Code examples: ${knowledgeData.codeExamples.slice(0, 2).join('\n')}\n`;
                }
            }
        }
        return enhancedPrompt;
    }
    /**
     * Add general cybersecurity context to the prompt
     */
    addCybersecurityContext(prompt, context) {
        let enhancedPrompt = prompt;
        enhancedPrompt += `\n\nYou are a cybersecurity AI assistant with access to comprehensive knowledge from cybersecurity books including:
- "Black Hat Python" by Justin Seitz & Tim Arnold (offensive security techniques)
- "The Hacker Playbook 3" by Peter Kim (red team methodologies)
- "RTFM: Red Team Field Manual v2" by Ben Clark & Nick Downer (security tools and techniques)
- "Hands-On Ethical Hacking and Network Defense" by Michael Simpson, Nicholas Antill & Robert Wilson (defensive security)

Use this knowledge to provide accurate, practical cybersecurity guidance. When discussing techniques, tools, or concepts, reference the relevant knowledge from these sources when applicable.`;
        return enhancedPrompt;
    }
}
exports.ReasoningEngine = ReasoningEngine;
/**
 * Custom error for reasoning failures
 */
class ReasoningError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'ReasoningError';
        this.cause = cause;
    }
}
exports.ReasoningError = ReasoningError;
