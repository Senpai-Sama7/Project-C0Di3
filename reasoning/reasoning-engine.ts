import { EventBus } from '../events/event-bus';
import { MemorySystem } from '../memory/memory-system';
import { ToolRegistry } from '../tools/tool-registry';
import { LLMClient } from '../types';
import { Logger } from '../utils/logger';
import { AbsoluteZeroReasoner } from './absolute-zero-reasoner';
import { DarwinGodelEngine } from './darwin-godel-engine';
import { ReasoningGraph } from './reasoning-graph';
import { CybersecurityKnowledgeService } from '../services/cybersecurity-knowledge-service';

/**
 * Advanced reasoning engine that combines multiple reasoning strategies
 */
export class ReasoningEngine {
  private readonly client: LLMClient;
  private readonly memory: MemorySystem;
  private readonly toolRegistry: ToolRegistry;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly darwinGodelEngine: DarwinGodelEngine;
  private readonly absoluteZeroReasoner: AbsoluteZeroReasoner;
  private readonly reasoningGraph: ReasoningGraph;
  private readonly zeroShotEnabled: boolean;
  private readonly cybersecurityKnowledgeService: CybersecurityKnowledgeService;

  constructor(options: ReasoningEngineOptions) {
    this.client = options.client;
    this.memory = options.memory;
    this.toolRegistry = options.toolRegistry ?? new ToolRegistry();
    this.eventBus = options.eventBus ?? new EventBus();
    this.logger = new Logger('ReasoningEngine');
    this.zeroShotEnabled = options.zeroShotEnabled !== false;
    this.cybersecurityKnowledgeService = options.cybersecurityKnowledgeService;

    // Initialize specialized reasoning components
    this.darwinGodelEngine = new DarwinGodelEngine({
      client: this.client,
      memory: this.memory,
      eventBus: this.eventBus
    });

    this.absoluteZeroReasoner = new AbsoluteZeroReasoner({
      client: this.client,
      memory: this.memory,
      eventBus: this.eventBus
    });

    this.reasoningGraph = new ReasoningGraph({
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
  async generatePlan(
    input: string | Record<string, any>,
    context: any,
    options: ReasoningOptions = {}
  ): Promise<ReasoningPlan> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);

    this.logger.debug('Generating reasoning plan for:', inputText);
    this.eventBus.emit('reasoning.plan.start', { input: inputText });

    // Retrieve relevant memories to inform reasoning
    const { memories, fromCache, cachedResult } = await this.memory.retrieveRelevantMemories(inputText, {
      limit: options.memoryLimit ?? 5,
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
        } as GenerationStep],
        toolsRequired: [],
        estimatedComplexity: 0.1,
        cached: true
      };
    }

    // Analyze input to determine complexity and reasoning approach
    let inputAnalysis: InputAnalysis;
    try {
      inputAnalysis = await this.analyzeInput(inputText);
    } catch (error) {
      this.logger.error('Error in analyzeInput:', error);
      throw new ReasoningError('Failed to analyze input', error);
    }

    // Select reasoning strategy based on complexity
    let reasoningStrategy: 'zero-shot' | 'darwin-godel' | 'absolute-zero';

    if (inputAnalysis.complexity < 0.3 && this.zeroShotEnabled) {
      reasoningStrategy = 'zero-shot';
    } else if (inputAnalysis.complexity < 0.7) {
      reasoningStrategy = 'darwin-godel';
    } else {
      reasoningStrategy = 'absolute-zero';
    }

    // Override strategy if specified in options
    if (options.reasoningStrategy) {
      reasoningStrategy = options.reasoningStrategy;
    }

    let reasoningPlan: ReasoningPlan;

    try {
      switch (reasoningStrategy) {
        case 'zero-shot':
          reasoningPlan = await this.generateZeroShotPlan(inputText, context, memories);
          break;
        case 'darwin-godel':
          reasoningPlan = await this.darwinGodelEngine.generatePlan(inputText, context, memories);
          break;
        case 'absolute-zero':
          reasoningPlan = await this.absoluteZeroReasoner.generatePlan(inputText, context, memories);
          break;
      }
    } catch (error) {
      this.logger.error('Error generating reasoning plan:', error);
      throw new ReasoningError('Failed to generate reasoning plan', error);
    }

    // Determine required tools
    reasoningPlan.toolsRequired = await this.identifyRequiredTools(inputText);

    this.eventBus.emit('reasoning.plan.complete', {
      input: inputText,
      strategy: reasoningStrategy,
      planSteps: reasoningPlan.steps.length
    });

    return reasoningPlan;
  }

  /**
   * Analyze input to determine complexity and characteristics
   */
  private async analyzeInput(input: string): Promise<InputAnalysis> {
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
      const response = await this.client.generate({ prompt });
      return JSON.parse(response) as InputAnalysis;
    } catch (error) {
      this.logger.warn('Error analyzing input complexity:', error);

      // Default analysis if generation fails
      return {
        complexity: 0.5,
        reasoningTypes: ['logical'],
        domainKnowledge: []
      };
    }
  }

  /**
   * Generate a simple zero-shot reasoning plan
   */
  private async generateZeroShotPlan(
    input: string,
    context: any,
    relevantMemories: any
  ): Promise<ReasoningPlan> {
    // Retrieval-Augmented Generation: use top memories as context
    const { memories } = await this.memory.retrieveRelevantMemories(input, { limit: 5 });
    const contextText = memories.map((m: any) => m.content).join('\n---\n');
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
  }

  /**
   * Identify tools that might be needed for this reasoning plan
   */
  private async identifyRequiredTools(
    input: string
  ): Promise<string[]> {
    const allTools = this.toolRegistry.getAllTools();

    // If no tools available, return empty array
    if (allTools.length === 0) {
      return [];
    }

    // Use the model to identify required tools
    const toolDescriptions = allTools.map(tool =>
      `${tool.name}: ${tool.description}`
    ).join('\n');

    const prompt = `
      Given the following input and available tools, identify which tools (if any) would be needed to properly address the input.
      Only list tools that are directly relevant and necessary.

      Input: ${input}

      Available tools:
      ${toolDescriptions}

      Return a JSON array of tool names, or an empty array if no tools are required.
    `;

    try {
      const response = await this.client.generate({ prompt });
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
    } catch (error) {
      this.logger.warn('Error identifying required tools:', error);
      return [];
    }
  }

  /**
   * Enhanced reasoning with cybersecurity knowledge integration
   */
  async executeReasoningPlan(
    plan: ReasoningPlan,
    context: any
  ): Promise<ReasoningResult> {
    this.logger.debug('Executing reasoning plan with cybersecurity knowledge integration');

    // If we have a cached plan, return it
    if (plan.cached) {
      return this.handleCachedPlan(plan);
    }

    // Integrate cybersecurity knowledge into the reasoning process
    const enhancedContext = await this.enhanceContextWithCybersecurityKnowledge(context);

    // Execute the reasoning steps with enhanced context
    const result = await this.executeSteps(plan, enhancedContext);

    return result;
  }

  /**
   * Handle cached reasoning plan
   */
  private handleCachedPlan(plan: ReasoningPlan): ReasoningResult {
    const cachedStep = plan.steps[0] as GenerationStep & { result?: any };
    return {
      content: cachedStep.result?.result?.content ?? 'No content from cached result',
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
  private async executeSteps(plan: ReasoningPlan, context: any): Promise<ReasoningResult> {
    this.reasoningGraph.startReasoningProcess();

    const reasoningSteps: ReasoningStep[] = [];
    const toolCalls: ToolCallResult[] = [];
    let finalOutput = '';

    for (const step of plan.steps) {
      const { stepOutput, toolResult } = await this.executeStep(step, context);

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
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: PlanStep, context: any): Promise<{ stepOutput: any; toolResult?: ToolCallResult }> {
    this.logger.debug(`Executing reasoning step: ${step.type} - ${step.description}`);

    try {
      switch (step.type) {
        case 'generation':
          return { stepOutput: await this.executeGenerationStep(step, context) };
        case 'tool': {
          const toolResult = await this.executeToolStep(step);
          return { stepOutput: toolResult.output, toolResult };
        }
        case 'darwin-godel':
          return { stepOutput: await this.darwinGodelEngine.executeStep(step, context) };
        case 'absolute-zero':
          return { stepOutput: await this.absoluteZeroReasoner.executeStep(step, context) };
        default: {
          const exhaustiveCheck: never = step;
          return { stepOutput: `Unsupported step type: ${(exhaustiveCheck as any).type}` };
        }
      }
    } catch (error) {
      this.logger.error(`Error executing reasoning step: ${step.description}`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { stepOutput: `Error: ${errorMessage}` };
    }
  }

  /**
   * Add a reasoning step to the results
   */
  private addReasoningStep(step: PlanStep, stepOutput: any, reasoningSteps: ReasoningStep[]): void {
    const isError = typeof stepOutput === 'string' && stepOutput.startsWith('Error:');

    reasoningSteps.push({
      step: step.id ?? step.description,
      input: (step as any).input ?? '',
      output: typeof stepOutput === 'string' ? stepOutput : JSON.stringify(stepOutput),
      error: isError
    });

    this.reasoningGraph.addReasoningStep({
      id: step.id ?? `step-${reasoningSteps.length}`,
      description: step.description,
      input: (step as any).input ?? '',
      output: isError ? undefined : stepOutput,
      error: isError ? stepOutput : undefined,
      type: step.type
    });
  }

  /**
   * Build the final reasoning result
   */
  private buildReasoningResult(
    finalOutput: string,
    reasoningSteps: ReasoningStep[],
    toolCalls: ToolCallResult[]
  ): ReasoningResult {
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
  private async executeGenerationStep(
    step: GenerationStep,
    context: any
  ): Promise<string> {
    let prompt = step.input;

    // If we have cybersecurity knowledge in context, enhance the prompt
    if (context.cybersecurityKnowledge) {
      prompt = this.enhancePromptWithCybersecurityKnowledge(prompt, context.cybersecurityKnowledge);
    }

    // Add cybersecurity context to the prompt
    prompt = this.addCybersecurityContext(prompt, context);

    try {
      const response = await this.client.generate({ prompt });
      return response;
    } catch (error) {
      this.logger.error('Error in generation step:', error);
      throw new ReasoningError('Generation failed', error);
    }
  }

  /**
   * Execute a tool step
   */
  private async executeToolStep(step: ToolStep): Promise<ToolCallResult> {
    const startTime = Date.now();

    try {
      const tool = this.toolRegistry.getTool(step.toolName);

      if (!tool) {
        throw new Error(`Tool not found: ${step.toolName}`);
      }

      const output = await tool.execute(step.parameters);

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
    } catch (error) {
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
  }

  /**
   * Set reasoning mode for a session
   */
  async setMode(sessionId: string, mode: string): Promise<void> {
    this.logger.info(`Setting reasoning mode for session ${sessionId}: ${mode}`);
    await this.memory.store({ key: `reasoning_mode_${sessionId}`, value: { mode, timestamp: Date.now() } });
    this.eventBus.emit('reasoning.mode.changed', { sessionId, mode });
  }

  async orchestrateReasoning(input: string, context: any): Promise<any> {
    this.logger.info('Orchestrating reasoning process for input:', input);

    const zeroShotPlan = this.zeroShotEnabled
      ? await this.absoluteZeroReasoner.generatePlan(input, context, this.memory)
      : null;

    const darwinPlan = await this.darwinGodelEngine.generatePlan(input, context, this.memory);

    const combinedPlan = {
      zeroShotPlan,
      darwinPlan,
      graphRepresentation: this.reasoningGraph.getNodes()
    };

    this.logger.info('Reasoning process completed successfully.');
    return combinedPlan;
  }

  async validateReasoningProcess(plan: any): Promise<boolean> {
    this.logger.debug('Validating reasoning process:', plan);
    // Placeholder for actual validation logic
    return true;
  }

  /**
   * Enhance context with relevant cybersecurity knowledge
   */
  private async enhanceContextWithCybersecurityKnowledge(context: any): Promise<any> {
    if (!this.cybersecurityKnowledgeService) {
      return context;
    }

    try {
      // Extract key terms from the context for cybersecurity knowledge lookup
      const keyTerms = this.extractKeyTermsFromContext(context);

      const enhancedContext = { ...context };

      for (const term of keyTerms) {
        const knowledge = await this.cybersecurityKnowledgeService.queryKnowledge({
          query: term,
          maxResults: 3,
          includeCode: true,
          includeTechniques: true
        });

        if (knowledge.concepts.length > 0) {
          enhancedContext.cybersecurityKnowledge = enhancedContext.cybersecurityKnowledge || {};
          enhancedContext.cybersecurityKnowledge[term] = knowledge;
        }
      }

      return enhancedContext;
    } catch (error) {
      this.logger.warn('Failed to enhance context with cybersecurity knowledge:', error);
      return context;
    }
  }

  /**
   * Extract key terms from context for cybersecurity knowledge lookup
   */
  private extractKeyTermsFromContext(context: any): string[] {
    const terms: string[] = [];

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
    const cybersecurityTerms = terms.filter(term =>
      this.isCybersecurityRelated(term)
    );

    return [...new Set(cybersecurityTerms)].slice(0, 5); // Limit to top 5 terms
  }

  /**
   * Extract terms from text using simple NLP
   */
  private extractTermsFromText(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

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
  private isCybersecurityRelated(term: string): boolean {
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

    return cybersecurityKeywords.some(keyword =>
      term.includes(keyword) || keyword.includes(term)
    );
  }

  /**
   * Check if a word is a common word that should be filtered out
   */
  private isCommonWord(word: string): boolean {
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
  private enhancePromptWithCybersecurityKnowledge(prompt: string, knowledge: any): string {
    let enhancedPrompt = prompt;

    for (const [term, knowledgeData] of Object.entries(knowledge)) {
      if (knowledgeData.concepts && knowledgeData.concepts.length > 0) {
        const concept = knowledgeData.concepts[0];
        enhancedPrompt += `\n\nRelevant cybersecurity knowledge for "${term}":\n`;
        enhancedPrompt += `- Concept: ${concept.name}\n`;
        enhancedPrompt += `- Description: ${concept.description}\n`;
        enhancedPrompt += `- Category: ${concept.category}\n`;

        if (knowledgeData.techniques && knowledgeData.techniques.length > 0) {
          enhancedPrompt += `- Related techniques: ${knowledgeData.techniques.join(', ')}\n`;
        }

        if (knowledgeData.tools && knowledgeData.tools.length > 0) {
          enhancedPrompt += `- Related tools: ${knowledgeData.tools.join(', ')}\n`;
        }

        if (knowledgeData.codeExamples && knowledgeData.codeExamples.length > 0) {
          enhancedPrompt += `- Code examples: ${knowledgeData.codeExamples.slice(0, 2).join('\n')}\n`;
        }
      }
    }

    return enhancedPrompt;
  }

  /**
   * Add general cybersecurity context to the prompt
   */
  private addCybersecurityContext(prompt: string, context: any): string {
    let enhancedPrompt = prompt;

    enhancedPrompt += `\n\nYou are a cybersecurity AI assistant with access to comprehensive knowledge from cybersecurity books including:
- Black Hat Python (offensive security techniques)
- The Hacker Playbook (red team methodologies)
- Blue Team Handbook (defensive security)
- RTFm (security tools and techniques)

Use this knowledge to provide accurate, practical cybersecurity guidance. When discussing techniques, tools, or concepts, reference the relevant knowledge from these sources when applicable.`;

    return enhancedPrompt;
  }
}

export interface ReasoningEngineOptions {
  client: LLMClient;
  memory: MemorySystem;
  toolRegistry?: ToolRegistry;
  eventBus?: EventBus;
  zeroShotEnabled?: boolean;
  cybersecurityKnowledgeService?: CybersecurityKnowledgeService;
}

export interface ReasoningOptions {
  reasoningStrategy?: 'zero-shot' | 'darwin-godel' | 'absolute-zero';
  memoryLimit?: number;
  bypassCache?: boolean;
  maxSteps?: number;
}

export interface InputAnalysis {
  complexity: number;
  reasoningTypes: string[];
  domainKnowledge: string[];
}

export interface ReasoningPlan {
  steps: PlanStep[];
  toolsRequired: string[];
  estimatedComplexity: number;
  cached: boolean;
}

export type PlanStep = GenerationStep | ToolStep | DarwinGodelStep | AbsoluteZeroStep;

export interface BaseStep {
  id?: string;
  type: string;
  description: string;
}

export interface GenerationStep extends BaseStep {
  type: 'generation';
  input: string;
  context?: any;
  memories?: any[];
}

export interface ToolStep extends BaseStep {
  type: 'tool';
  toolName: string;
  parameters: Record<string, any>;
  simulated?: boolean;
  simulationResult?: string;
}

export interface DarwinGodelStep extends BaseStep {
  type: 'darwin-godel';
  input: string;
  hypotheses?: string[];
  iterations?: number;
}

export interface AbsoluteZeroStep extends BaseStep {
  type: 'absolute-zero';
  input: string;
  groundingFacts?: string[];
}

export interface ReasoningStep {
  step: string;
  input: string;
  output: string;
  error?: boolean;
}

export interface ToolCallResult {
  toolName: string;
  parameters: any;
  output?: any;
  error?: string;
  executionTime: number;
  success: boolean;
}

export interface ReasoningResult {
  content: string;
  reasoning: ReasoningStep[];
  toolCalls: ToolCallResult[];
  graph?: any;
  cached: boolean;
}

/**
 * Custom error for reasoning failures
 */
export class ReasoningError extends Error {
  public cause: any;
  constructor(message: string, cause?: any) {
    super(message);
    this.name = 'ReasoningError';
    this.cause = cause;
  }
}
