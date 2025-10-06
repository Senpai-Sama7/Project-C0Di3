/**
 * Lightweight Dependency Injection Container
 * Supports constructor injection, singleton/transient lifetimes, and factories
 */

export type Lifetime = 'singleton' | 'transient';

export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (...args: any[]) => T | Promise<T>;
  lifetime: Lifetime;
  dependencies?: Array<string | symbol>;
}

export interface ContainerOptions {
  strict?: boolean; // Throw error if dependency not found (default: true)
  enableLogging?: boolean; // Log container operations
}

export class Container {
  private descriptors: Map<string | symbol, ServiceDescriptor> = new Map();
  private singletons: Map<string | symbol, any> = new Map();
  private resolutionStack: Array<string | symbol> = [];
  private options: ContainerOptions;

  constructor(options: ContainerOptions = {}) {
    this.options = {
      strict: options.strict ?? true,
      enableLogging: options.enableLogging ?? false
    };
  }

  /**
   * Register a service with the container
   */
  register<T>(
    token: string | symbol,
    factory: (...args: any[]) => T | Promise<T>,
    lifetime: Lifetime = 'singleton',
    dependencies: Array<string | symbol> = []
  ): this {
    this.descriptors.set(token, {
      token,
      factory,
      lifetime,
      dependencies
    });

    this.log(`Registered service: ${String(token)} (${lifetime})`);
    return this;
  }

  /**
   * Register a class with automatic dependency resolution
   */
  registerClass<T>(
    token: string | symbol,
    classConstructor: new (...args: any[]) => T,
    lifetime: Lifetime = 'singleton',
    dependencies: Array<string | symbol> = []
  ): this {
    return this.register(
      token,
      (...args) => new classConstructor(...args),
      lifetime,
      dependencies
    );
  }

  /**
   * Register a singleton value directly
   */
  registerValue<T>(token: string | symbol, value: T): this {
    this.singletons.set(token, value);
    this.log(`Registered value: ${String(token)}`);
    return this;
  }

  /**
   * Resolve a service from the container
   */
  async resolve<T>(token: string | symbol): Promise<T> {
    // Check if already in singleton cache
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      throw new Error(
        `Circular dependency detected: ${this.resolutionStack.map(t => String(t)).join(' -> ')} -> ${String(token)}`
      );
    }

    // Get descriptor
    const descriptor = this.descriptors.get(token);
    if (!descriptor) {
      if (this.options.strict) {
        throw new Error(`Service not registered: ${String(token)}`);
      }
      return undefined as any;
    }

    // Track resolution stack
    this.resolutionStack.push(token);

    try {
      // Resolve dependencies
      const deps = await Promise.all(
        (descriptor.dependencies || []).map(dep => this.resolve(dep))
      );

      // Create instance
      const instance = await descriptor.factory(...deps);

      // Cache if singleton
      if (descriptor.lifetime === 'singleton') {
        this.singletons.set(token, instance);
        this.log(`Cached singleton: ${String(token)}`);
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Synchronous resolve (only works if all dependencies are already resolved)
   */
  resolveSync<T>(token: string | symbol): T {
    // Check singleton cache
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    const descriptor = this.descriptors.get(token);
    if (!descriptor) {
      if (this.options.strict) {
        throw new Error(`Service not registered: ${String(token)}`);
      }
      return undefined as any;
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      throw new Error(
        `Circular dependency detected: ${this.resolutionStack.map(t => String(t)).join(' -> ')} -> ${String(token)}`
      );
    }

    this.resolutionStack.push(token);

    try {
      // Resolve dependencies synchronously
      const deps = (descriptor.dependencies || []).map(dep => this.resolveSync(dep));

      // Create instance
      const instance = descriptor.factory(...deps);

      // Check if factory returned a promise (error in sync mode)
      if (instance instanceof Promise) {
        throw new Error(`Cannot resolve async factory synchronously: ${String(token)}`);
      }

      // Cache if singleton
      if (descriptor.lifetime === 'singleton') {
        this.singletons.set(token, instance);
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: string | symbol): boolean {
    return this.descriptors.has(token) || this.singletons.has(token);
  }

  /**
   * Clear all singletons (useful for testing)
   */
  clearSingletons(): void {
    this.singletons.clear();
    this.log('Cleared all singletons');
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.descriptors.clear();
    this.singletons.clear();
    this.resolutionStack = [];
    this.log('Cleared container');
  }

  /**
   * Get all registered service tokens
   */
  getRegistered(): Array<string | symbol> {
    return Array.from(this.descriptors.keys());
  }

  /**
   * Create a child container that inherits parent registrations
   */
  createChild(): Container {
    const child = new Container(this.options);
    
    // Copy descriptors
    for (const [token, descriptor] of this.descriptors.entries()) {
      child.descriptors.set(token, descriptor);
    }

    // Don't copy singletons - child creates its own
    return child;
  }

  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(`[Container] ${message}`);
    }
  }
}

/**
 * Service tokens (symbols for type safety)
 */
export const ServiceTokens = {
  // Core services
  EventBus: Symbol('EventBus'),
  Logger: Symbol('Logger'),
  Config: Symbol('Config'),
  
  // Memory system
  MemorySystem: Symbol('MemorySystem'),
  VectorStore: Symbol('VectorStore'),
  EmbeddingService: Symbol('EmbeddingService'),
  
  // LLM services
  LLMService: Symbol('LLMService'),
  LLMClient: Symbol('LLMClient'),
  
  // Security services
  AuthService: Symbol('AuthService'),
  AuditService: Symbol('AuditService'),

  // Reasoning engines
  ReasoningEngine: Symbol('ReasoningEngine'),
  DarwinGodelEngine: Symbol('DarwinGodelEngine'),
  AbsoluteZeroReasoner: Symbol('AbsoluteZeroReasoner'),

  // Tools
  ToolRegistry: Symbol('ToolRegistry'),

  // Agent subsystems
  PluginManager: Symbol('PluginManager'),
  FeedbackLoop: Symbol('FeedbackLoop'),
  ContextManager: Symbol('ContextManager'),
  BookIngestionService: Symbol('BookIngestionService'),
  LearnModeService: Symbol('LearnModeService'),
  LogAnalyzerClient: Symbol('LogAnalyzerClient'),
  LogAnalysisService: Symbol('LogAnalysisService'),
  CybersecurityKnowledgeService: Symbol('CybersecurityKnowledgeService'),
  CAGService: Symbol('CAGService'),
  HealthMonitoringService: Symbol('HealthMonitoringService'),

  // Infrastructure
  HealthCheck: Symbol('HealthCheck'),
  MetricsCollector: Symbol('MetricsCollector')
};

/**
 * Global container instance
 */
let globalContainer: Container | null = null;

export function getGlobalContainer(): Container {
  if (!globalContainer) {
    globalContainer = new Container({ enableLogging: false });
  }
  return globalContainer;
}

export function setGlobalContainer(container: Container): void {
  globalContainer = container;
}

/**
 * Example usage:
 * 
 * // Create container
 * const container = new Container();
 * 
 * // Register services
 * container.registerValue('config', {
 *   apiUrl: 'http://localhost:8000',
 *   timeout: 15000
 * });
 * 
 * container.register(
 *   'logger',
 *   () => new Logger('App'),
 *   'singleton'
 * );
 * 
 * container.register(
 *   'llmService',
 *   (config, logger) => new LLMService(config),
 *   'singleton',
 *   ['config', 'logger']
 * );
 * 
 * container.registerClass(
 *   'memorySystem',
 *   MemorySystem,
 *   'singleton',
 *   ['vectorStore', 'embeddingService']
 * );
 * 
 * // Resolve services
 * const llmService = await container.resolve<LLMService>('llmService');
 * const memory = await container.resolve<MemorySystem>('memorySystem');
 * 
 * // Use symbols for type safety
 * container.register(ServiceTokens.LLMService, () => new LLMService());
 * const service = await container.resolve<LLMService>(ServiceTokens.LLMService);
 */
