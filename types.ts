/**
 * Agent response and options
 */
export interface AgentResponse {
  /**
   * The main text response from the agent
   */
  text: string;
  /**
   * Reasoning trace or steps (optional)
   */
  reasoning?: ReasoningStep[];
  /**
   * Tool calls made during reasoning (optional)
   */
  toolCalls?: ToolCallResult[];
  /**
   * Memory/context state (optional)
   */
  memory?: AgentContext;
  /**
   * Performance metrics (optional)
   */
  performance?: PerformanceMetrics;
  [key: string]: unknown;
}

/**
 * Options for processing a user request
 */
export interface ProcessOptions {
  sessionId?: string;
  context?: AgentContext;
  reasoningOptions?: ReasoningOptions;
  [key: string]: unknown;
}

/**
 * Options for reasoning plan generation and execution
 */
export interface ReasoningOptions {
  reasoningStrategy?: 'zero-shot' | 'darwin-godel' | 'absolute-zero';
  memoryLimit?: number;
  bypassCache?: boolean;
  maxSteps?: number;
  strategy?: string;
  depth?: number;
  verificationEnabled?: boolean;
}

/**
 * Tool interface for agent-registered tools
 */
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  execute(input: unknown, context?: AgentContext): Promise<unknown>;
}

/**
 * Performance metrics for agent operations
 */
export interface PerformanceMetrics {
  latency?: number;
  tokenUsage?: number;
  memoryUsage?: number;
  toolExecutionTime?: number;
  reasoningComplexity?: number;
  timestamp?: number;
}

/**
 * Options for agent learning/feedback
 */
export interface LearningOptions {
  feedback?: string;
  metrics?: Partial<PerformanceMetrics>;
  enabled?: boolean;
  learningRate?: number;
}

/**
 * LLM Client interface for both Gemini and LlamaCpp
 */
export interface LLMClient {
  generate(options: { prompt: string;[key: string]: unknown }): Promise<string>;
  generateStream?(options: { prompt: string;[key: string]: unknown }): AsyncGenerator<string, void, unknown>;
  embed?(text: string): Promise<number[]>;
}

/**
 * Project context for the agent
 */
export interface ProjectContext {
  rootPath: string;
  files: string[];
  dependencies: Map<string, string>;
}

/**
 * Entry in the agent's context history
 */
export interface ContextEntry {
  role: string;
  content: string;
  timestamp?: number;
}

/**
 * Full agent context (project, conversation, volatile)
 */
export interface AgentContext {
  projectContext: ProjectContext | null;
  conversationHistory: ContextEntry[];
  volatileContext: Map<string, unknown>;
  sessionId?: string;
  userId?: string;
  timestamp?: number;
  domain?: string;
  axioms?: string[];
  principles?: string[];
  constraints?: string[];
  rules?: string[];
  [key: string]: unknown;
}

/**
 * Concept representation for memory/knowledge graph
 */
export interface Concept {
  id: string;
  name: string;
  embedding: number[];
  relatedConcepts: string[];
  confidence: number;
  lastUpdated: number;
}

/**
 * Memory item for episodic/procedural/semantic memory
 */
export interface MemoryItem {
  key: string;
  content: unknown;
  timestamp?: number;
  principles?: string[];
  rules?: string[];
  [key: string]: unknown;
}

/**
 * Memory interface for memory stores
 */
export interface IMemory {
  add(item: MemoryItem): Promise<void>;
  find(query: string): Promise<MemoryItem[]>;
  getAll(): Promise<MemoryItem[]>;
}

// Reasoning step and tool call result types (imported from reasoning-engine if needed)
export interface ReasoningStep {
  step: string;
  input: string;
  output: string;
  error?: boolean;
}

export interface ToolCallResult {
  toolName: string;
  parameters: Record<string, unknown>;
  output?: unknown;
  error?: string;
  executionTime: number;
  success: boolean;
}

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /**
   * The interval for health checks (in seconds)
   */
  healthCheckInterval: number;
  /**
   * The URL for the log analyzer service
   */
  logAnalyzerUrl: string;
  /**
   * The encryption key for audit log encryption
   */
  encryptionKey: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Reasoning Plan Structure (Generic Version for cross-module usage)
 */
export interface GenericReasoningPlan {
  steps: GenericReasoningPlanStep[];
  estimatedComplexity?: number;
  toolsRequired?: string[];
  metadata?: {
    strategy: string;
    timestamp: number;
    version?: string;
  };
}

/**
 * Individual step in a generic reasoning plan
 */
export interface GenericReasoningPlanStep {
  id: string;
  type: 'generation' | 'tool' | 'darwin-godel' | 'absolute-zero' | 'verification' | 'extraction';
  description: string;
  input?: string;
  dependencies?: string[];
  tool?: string;
  parameters?: Record<string, unknown>;
  output?: unknown;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

/**
 * Context for reasoning operations
 */
export interface ReasoningContext extends AgentContext {
  memories?: MemoryItem[];
  relevantConcepts?: Concept[];
  hypotheses?: string[];
  axioms?: string[];
  problem?: string;
  [key: string]: unknown;
}

/**
 * Population member for evolutionary algorithms
 */
export interface PopulationMember {
  hypothesis: string;
  fitness: number;
  problem: string;
  axioms: string[];
  evaluated: boolean;
  timestamp: number;
  generation?: number;
}

/**
 * Memory retrieval result
 */
export interface MemoryRetrievalResult {
  memories: MemoryItem[];
  fromCache: boolean;
  cachedResult?: unknown;
  retrievalTime?: number;
}
