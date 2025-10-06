import 'dotenv/config';
import { LlamaCppClient } from './clients/llama-cpp-client';
import { LogAnalyzerClient } from './clients/log-analyzer-client';
import { ConfigManager } from './config/config-manager';
import { ContextManager } from './context/context-manager';
import { EventBus } from './events/event-bus';
import {
  AgentResponse,
  LearningOptions,
  LLMClient,
  PerformanceMetrics,
  ProcessOptions,
  ReasoningOptions,
  Tool
} from './types';

import { FeedbackLoop } from './learning/feedback-loop';
import { MemorySystem } from './memory/memory-system';
import { PerformanceMonitor } from './monitoring/performance-monitor';
import { PluginManager } from './plugins/plugin-manager';
import { ReasoningEngine } from './reasoning/reasoning-engine';
import { AuditService } from './services/audit-service';
import { BookIngestionService } from './services/book-ingestion-service';
import { CybersecurityKnowledgeService } from './services/cybersecurity-knowledge-service';
import { HealthMonitoringService } from './services/health-monitoring-service';
import { LearnModeService } from './services/learn-mode-service';
import { LogAnalysisService } from './services/log-analysis-service';
import { ToolRegistry } from './tools/tool-registry';
import { Logger } from './utils/logger';
import { CAGService } from './services/cag-service';
import { Container, ServiceTokens } from './utils/di-container';

/**
 * GemmaAgent - Core autonomous agent with advanced reasoning, learning capabilities,
 * and integration with Gemma 3n LLM backend. Supports workspace features (MCP, VertexAI Search, etc.)
 */
export class GemmaAgent {
  private container: Container;
  private client: LLMClient;
  private memory: MemorySystem;
  private toolRegistry: ToolRegistry;
  private reasoningEngine: ReasoningEngine;
  private feedbackLoop: FeedbackLoop;
  private contextManager: ContextManager;
  private pluginManager: PluginManager;
  private performanceMonitor: PerformanceMonitor;
  private configManager: ConfigManager;
  private eventBus: EventBus;
  private logger: Logger;
  private auditService: AuditService;
  private logAnalysisService: LogAnalysisService;
  private learnModeService: LearnModeService;
  private healthMonitoringService: HealthMonitoringService;
  private bookIngestionService: BookIngestionService;
  private cybersecurityKnowledgeService: CybersecurityKnowledgeService;
  private cagService: CAGService;

  // Workspace integration properties
  private sessionId: string;
  private chatLogFile?: string;
  private sessionLogFile?: string;
  private mcpEnabled: boolean = false;
  private vertexAIEnabled: boolean = false;

  constructor(config?: any, container?: Container) {
    if (config instanceof Container && !container) {
      container = config;
      config = undefined;
    }
    const { container: resolvedContainer, configManager } = this.setupContainer(config, container);
    this.container = resolvedContainer;
    this.configManager = configManager;

    // Initialize session and workspace integration
    this.sessionId = config?.sessionId || `session-${Date.now()}`;
    this.chatLogFile = config?.workspaceIntegration?.chatLogFile;
    this.sessionLogFile = config?.workspaceIntegration?.sessionLogFile;
    this.mcpEnabled = config?.workspaceIntegration?.mcpEnabled || false;
    this.vertexAIEnabled = config?.workspaceIntegration?.vertexAIEnabled || false;

    this.logger = this.container.resolveSync<Logger>(ServiceTokens.Logger);
    this.eventBus = this.container.resolveSync<EventBus>(ServiceTokens.EventBus);
    this.performanceMonitor = this.container.resolveSync<PerformanceMonitor>(ServiceTokens.MetricsCollector);

    if (this.chatLogFile) {
      (this.performanceMonitor as any).logToWorkspace = (data: any) => this.logToWorkspace('performance', data);
    }

    // Ensure encryption key exists before resolving audit service
    const encryptionKey = this.configManager.get('agent.encryptionKey') || process.env.AGENT_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key for audit logs is not set. Please set AGENT_ENCRYPTION_KEY in environment or config.');
    }

    this.auditService = this.container.resolveSync<AuditService>(ServiceTokens.AuditService);
    this.logAnalysisService = this.container.resolveSync<LogAnalysisService>(ServiceTokens.LogAnalysisService);

    try {
      this.client = this.container.resolveSync<LLMClient>(ServiceTokens.LLMClient);
      this.logger.info('LLM client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LLM client:', error);
      throw new Error('LLM client is required. Please ensure llama.cpp server is running or configure a valid LLM endpoint.');
    }

    this.learnModeService = this.container.resolveSync<LearnModeService>(ServiceTokens.LearnModeService);

    this.memory = this.container.resolveSync<MemorySystem>(ServiceTokens.MemorySystem);
    this.bookIngestionService = this.container.resolveSync<BookIngestionService>(ServiceTokens.BookIngestionService);

    this.cybersecurityKnowledgeService = this.container.resolveSync<CybersecurityKnowledgeService>(ServiceTokens.CybersecurityKnowledgeService);
    this.cagService = this.container.resolveSync<CAGService>(ServiceTokens.CAGService);

    this.healthMonitoringService = this.container.resolveSync<HealthMonitoringService>(ServiceTokens.HealthMonitoringService);

    this.toolRegistry = this.container.resolveSync<ToolRegistry>(ServiceTokens.ToolRegistry);
    this.pluginManager = this.container.resolveSync<PluginManager>(ServiceTokens.PluginManager);

    this.reasoningEngine = this.container.resolveSync<ReasoningEngine>(ServiceTokens.ReasoningEngine);
    this.feedbackLoop = this.container.resolveSync<FeedbackLoop>(ServiceTokens.FeedbackLoop);

    this.contextManager = this.container.resolveSync<ContextManager>(ServiceTokens.ContextManager);

    // Log session start to workspace logs
    void this.logToWorkspace('session_start', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      mcpEnabled: this.mcpEnabled,
      vertexAIEnabled: this.vertexAIEnabled
    });

    // Register event handlers
    this.registerEventHandlers();

    // Initialize subsystems
    this.initialize();
  }

  private setupContainer(config?: any, existingContainer?: Container): { container: Container; configManager: ConfigManager } {
    const container = existingContainer ?? new Container();
    let configManager: ConfigManager;

    if (container.has(ServiceTokens.Config)) {
      configManager = container.resolveSync<ConfigManager>(ServiceTokens.Config);
    } else if (config?.configManager instanceof ConfigManager) {
      configManager = config.configManager;
      container.registerValue(ServiceTokens.Config, configManager);
    } else {
      configManager = new ConfigManager(config);
      container.registerValue(ServiceTokens.Config, configManager);
    }

    if (!container.has(ServiceTokens.EventBus)) {
      container.register(ServiceTokens.EventBus, () => new EventBus());
    }

    if (!container.has(ServiceTokens.Logger)) {
      container.register(ServiceTokens.Logger, () => new Logger('GemmaAgent', configManager.get('logging.level', 'info') ?? 'info'));
    }

    if (!container.has(ServiceTokens.LLMClient)) {
      container.register(
        ServiceTokens.LLMClient,
        () => new LlamaCppClient(configManager.get('llm.apiUrl', process.env.LLM_API_URL ?? 'http://localhost:8000'))
      );
    }

    if (!container.has(ServiceTokens.ToolRegistry)) {
      container.register(
        ServiceTokens.ToolRegistry,
        (eventBus: EventBus) => new ToolRegistry(eventBus),
        'singleton',
        [ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.MetricsCollector)) {
      container.register(
        ServiceTokens.MetricsCollector,
        (eventBus: EventBus) =>
          new PerformanceMonitor({
            metrics: ['latency', 'tokenUsage', 'memoryUsage', 'toolExecutionTime', 'reasoningComplexity'],
            eventBus,
            enableLogging: configManager.get('monitoring.enableLogging', false)
          }),
        'singleton',
        [ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.MemorySystem)) {
      container.register(
        ServiceTokens.MemorySystem,
        (eventBus: EventBus) =>
          new MemorySystem({
            vectorStoreType: configManager.get('memory.vectorStore', 'inmemory'),
            persistencePath: configManager.get('memory.persistencePath', './data/memory'),
            cacheSize: configManager.get('memory.cacheSize', 10000),
            cacheTTL: configManager.get('memory.cacheTTL', 3600),
            workingMemoryCapacity: configManager.get('memory.workingMemoryCapacity', 10),
            encryptionKey: configManager.get('memory.encryptionKey', process.env.MEMORY_ENCRYPTION_KEY),
            eventBus
          }),
        'singleton',
        [ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.ContextManager)) {
      container.register(ServiceTokens.ContextManager, () => new ContextManager());
    }

    if (!container.has(ServiceTokens.CybersecurityKnowledgeService)) {
      container.register(
        ServiceTokens.CybersecurityKnowledgeService,
        (memory: MemorySystem, client: LLMClient, eventBus: EventBus) =>
          new CybersecurityKnowledgeService(
            memory,
            client,
            eventBus,
            configManager.get('cybersecurity.booksPath', './memory/cybersecurity-books')
          ),
        'singleton',
        [ServiceTokens.MemorySystem, ServiceTokens.LLMClient, ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.CAGService)) {
      container.register(
        ServiceTokens.CAGService,
        (client: LLMClient, knowledgeService: CybersecurityKnowledgeService, eventBus: EventBus) =>
          new CAGService(client, knowledgeService, eventBus),
        'singleton',
        [ServiceTokens.LLMClient, ServiceTokens.CybersecurityKnowledgeService, ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.BookIngestionService)) {
      container.register(
        ServiceTokens.BookIngestionService,
        (memory: MemorySystem) => new BookIngestionService(memory.getVectorStore()),
        'singleton',
        [ServiceTokens.MemorySystem]
      );
    }

    if (!container.has(ServiceTokens.ReasoningEngine)) {
      container.register(
        ServiceTokens.ReasoningEngine,
        (
          memory: MemorySystem,
          client: LLMClient,
          toolRegistry: ToolRegistry,
          eventBus: EventBus,
          knowledgeService: CybersecurityKnowledgeService
        ) =>
          new ReasoningEngine({
            memory,
            client,
            toolRegistry,
            eventBus,
            zeroShotEnabled: configManager.get('reasoning.zeroShotEnabled', true),
            cybersecurityKnowledgeService: knowledgeService
          }),
        'singleton',
        [
          ServiceTokens.MemorySystem,
          ServiceTokens.LLMClient,
          ServiceTokens.ToolRegistry,
          ServiceTokens.EventBus,
          ServiceTokens.CybersecurityKnowledgeService
        ]
      );
    }

    if (!container.has(ServiceTokens.FeedbackLoop)) {
      container.register(
        ServiceTokens.FeedbackLoop,
        (memory: MemorySystem, reasoning: ReasoningEngine, eventBus: EventBus) =>
          new FeedbackLoop({
            memory,
            reasoningEngine: reasoning,
            eventBus,
            learningRate: configManager.get('learning.learningRate', 0.1)
          }),
        'singleton',
        [ServiceTokens.MemorySystem, ServiceTokens.ReasoningEngine, ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.PluginManager)) {
      container.register(
        ServiceTokens.PluginManager,
        (toolRegistry: ToolRegistry, eventBus: EventBus) =>
          new PluginManager({
            registry: toolRegistry,
            allowedDirectories: configManager.get('plugins.allowedDirectories', ['./plugins']),
            eventBus
          }),
        'singleton',
        [ServiceTokens.ToolRegistry, ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.LearnModeService)) {
      container.register(
        ServiceTokens.LearnModeService,
        (client: LLMClient, logger: Logger, eventBus: EventBus) => new LearnModeService(client, logger, eventBus),
        'singleton',
        [ServiceTokens.LLMClient, ServiceTokens.Logger, ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.HealthMonitoringService)) {
      container.register(
        ServiceTokens.HealthMonitoringService,
        (
          eventBus: EventBus,
          logger: Logger,
          performanceMonitor: PerformanceMonitor,
          memory: MemorySystem,
          client: LLMClient
        ) => new HealthMonitoringService(eventBus, logger, performanceMonitor, memory, client),
        'singleton',
        [
          ServiceTokens.EventBus,
          ServiceTokens.Logger,
          ServiceTokens.MetricsCollector,
          ServiceTokens.MemorySystem,
          ServiceTokens.LLMClient
        ]
      );
    }

    if (!container.has(ServiceTokens.LogAnalyzerClient)) {
      container.register(
        ServiceTokens.LogAnalyzerClient,
        (logger: Logger) =>
          new LogAnalyzerClient(configManager.get('services.logAnalyzer.baseUrl', 'http://localhost:5001'), logger),
        'singleton',
        [ServiceTokens.Logger]
      );
    }

    if (!container.has(ServiceTokens.AuditService)) {
      container.register(
        ServiceTokens.AuditService,
        (eventBus: EventBus) => {
          const key = configManager.get('agent.encryptionKey') || process.env.AGENT_ENCRYPTION_KEY;
          if (!key) {
            throw new Error('Encryption key for audit logs is not set. Please set AGENT_ENCRYPTION_KEY in environment or config.');
          }
          return new AuditService(
            configManager.get('logging.auditLogDir', './data/logs'),
            eventBus,
            key
          );
        },
        'singleton',
        [ServiceTokens.EventBus]
      );
    }

    if (!container.has(ServiceTokens.LogAnalysisService)) {
      container.register(
        ServiceTokens.LogAnalysisService,
        (logAnalyzer: LogAnalyzerClient, auditService: AuditService, logger: Logger) =>
          new LogAnalysisService(logAnalyzer, auditService, logger),
        'singleton',
        [ServiceTokens.LogAnalyzerClient, ServiceTokens.AuditService, ServiceTokens.Logger]
      );
    }

    return { container, configManager };
  }

  private registerEventHandlers(): void {
    this.eventBus.on('agent.request', (data: { requestId: string }) => this.performanceMonitor.startRequest(data.requestId));
    this.eventBus.on('agent.response', (data: { requestId: string }) => this.performanceMonitor.endRequest(data.requestId));
    this.eventBus.on('agent.error', this.handleError.bind(this));
    this.eventBus.on('memory.update', this.feedbackLoop.onMemoryUpdate.bind(this.feedbackLoop));
    this.eventBus.on('tool.execution', this.performanceMonitor.trackToolExecution.bind(this.performanceMonitor));
  }

  private handleError(error: Error): void {
    this.logger.error('Agent error:', error);
    // Implement self-healing measures
    this.feedbackLoop.learnFromError(error);
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing GemmaAgent...');

      // Load built-in tools
      await this.toolRegistry.loadBuiltinTools();

      // Load plugins
      await this.pluginManager.loadPlugins();

      // Initialize memory systems
      await this.memory.initialize();

      // Initialize cybersecurity knowledge service
      await this.cybersecurityKnowledgeService.initialize();

      // Initialize integrations
      // await Promise.all([
      //   this.langgraph.initialize()
      // ]);

      this.logger.info('GemmaAgent initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize GemmaAgent:', error);
      throw error;
    }
  }

  public async ingestBook(filePath: string): Promise<void> {
    await this.bookIngestionService.ingestBook(filePath);
  }

  /**
   * Process a user request through the agent
   * @param input User input text or structured request
   * @param options Processing options
   * @returns Response from the agent
   */
  public async process(input: string, options: ProcessOptions = {}): Promise<AgentResponse> {
    const requestId = this.sessionId;
    this.eventBus.emit('agent.request', { requestId });
    const performance = this.performanceMonitor.startRequest(requestId);

    try {
      // Build context for the current request
      const context = await this.contextManager.loadProjectContext(input);

      // Generate and validate reasoning plan
      const reasoningPlan = await this.generateReasoningPlan(input, context, options);
      await this.validateToolPermissions(reasoningPlan);

      // Execute reasoning steps
      const result = await this.reasoningEngine.executeReasoningPlan(reasoningPlan, context);

      // Learn from this interaction
      await this.learnFromInteraction(input, result, options);

      performance.end();

      return {
        text: typeof result === 'string' ? result : (result?.content || ''),
        reasoning: result.reasoning,
        toolCalls: result.toolCalls,
        performance: this.performanceMonitor.getMetrics(),
        memory: context
      };
    } catch (error: any) {
      this.eventBus.emit('agent.error', error);
      performance.end({ error });
      this.logger.error('Error in process:', error);
      throw error;
    }
  }

  /**
   * Generate reasoning plan for the given input
   */
  private async generateReasoningPlan(input: string, context: any, options: ProcessOptions) {
    const reasoningOptions: ReasoningOptions = {
      strategy: typeof options.strategy === 'string' ? options.strategy : 'auto',
      depth: typeof options.maxSteps === 'number' ? options.maxSteps : undefined,
      verificationEnabled: true
    };
    return await this.reasoningEngine.generatePlan(input, context, reasoningOptions);
  }

  /**
   * Validate tool permissions for the reasoning plan
   */
  private async validateToolPermissions(reasoningPlan: any): Promise<void> {
    for (const step of reasoningPlan.steps) {
      if (step.type === 'tool') {
        const perms = this.isSenseiMode() ?
          this.getSenseiToolPermissions(step.toolName) :
          this.getToolPermissions(step.toolName);

        if (!perms.allow) {
          throw new Error(`Tool ${step.toolName} is not allowed in current mode.`);
        }
        if (perms.requireApproval && !this.isSenseiMode()) {
          throw new Error(`Tool ${step.toolName} requires user approval.`);
        }
        if (this.shouldSimulateTool(perms)) {
          step.simulated = true;
          step.simulationResult = `[SIMULATED OUTPUT for ${step.toolName}]`;
        }
      }
    }
  }

  /**
   * Check if tool should be simulated
   */
  private shouldSimulateTool(perms: any): boolean {
    // Advanced mode bypasses all simulation
    if (this.isSenseiMode()) {
      return false;
    }

    // Check if tool should be simulated
    if (perms.simulationOnly) {
      return true;
    }

    // Check user mode simulation settings
    const userMode = this.getUserMode();
    if (userMode === 'safe' || userMode === 'beginner') {
      return true;
    }

    return this.getSimulationMode();
  }

  /**
   * Learn from the interaction
   */
  private async learnFromInteraction(input: string, result: any, options: ProcessOptions): Promise<void> {
    const learningOptions: LearningOptions = {
      enabled: options.learningEnabled !== false,
      learningRate: this.configManager.get('learning.learningRate', 0.1)
    };
    this.feedbackLoop.learn(input, result, learningOptions as any);
  }

  /**
   * Register a new tool with the agent
   * @param tool Tool implementation
   */
  public registerTool(tool: Tool): void {
    this.toolRegistry.register(tool);
  }

  /**
   * Get the agent's performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getDetailedMetrics();
  }

  /**
   * Gracefully shutdown the agent and persist memory
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down GemmaAgent...');
    try {
      // Stop health monitoring
      this.healthMonitoringService.stop();

      // Persist memory and cleanup
      await this.memory.persist();
      await this.pluginManager.unloadPlugins();

      // Generate final reports
      this.performanceMonitor.generateReport();
      await this.generateHealthReport();
      this.logger.info('Final health report generated');

      // Log shutdown to workspace
      await this.logToWorkspace('session_end', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        shutdown_reason: 'normal',
        final_health_status: this.getHealthStatus().overall
      });

      this.logger.info('GemmaAgent shutdown complete.');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Log an event or data to the workspace integration (e.g., MCP, VertexAI) using async file I/O
   * @param eventType Type of the event (e.g., 'session_start', 'performance')
   * @param data Data to log
   */
  private async logToWorkspace(type: string, data: any): Promise<void> {
    if (this.chatLogFile) {
      try {
        const fs = await import('fs/promises');
        const logEntry = {
          type,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          data
        };
        await fs.appendFile(this.chatLogFile, JSON.stringify(logEntry) + '\n');
        if (this.sessionLogFile) {
          await fs.appendFile(this.sessionLogFile, JSON.stringify(logEntry) + '\n');
        }
      } catch (error) {
        this.logger.error('Failed to log to workspace:', error);
      }
    }
  }

  /**
   * Get the agent's event bus for external listeners
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Start a new session
   */
  startNewSession(): string {
    this.sessionId = `session-${Date.now()}`;
    this.logger.info(`Started new session: ${this.sessionId}`);
    return this.sessionId;
  }

  /**
   * Clear a session's context
   */
  public async clearSessionContext(sessionId: string): Promise<void> {
    await this.contextManager.clearContext();
  }

  /**
   * Get session context
   */
  public async getSessionContext(sessionId: string): Promise<any> {
    return await this.contextManager.getContext();
  }

  public async getMemoryState(sessionId: string): Promise<any> {
    return this.memory.getStatistics();
  }

  /**
   * Set reasoning mode for a session
   */
  async setReasoningMode(sessionId: string, mode: string): Promise<void> {
    await this.reasoningEngine.setMode(sessionId, mode);
  }

  /**
   * Get/set user mode
   */
  public getUserMode(): string {
    return this.configManager.getUserMode();
  }
  public setUserMode(mode: string): void {
    this.configManager.setUserMode(mode);
  }

  /**
   * Get/set simulation mode
   */
  public getSimulationMode(): boolean {
    return this.configManager.getSimulationMode();
  }

  public setSimulationMode(enabled: boolean): void {
    this.configManager.setSimulationMode(enabled);
  }

  public isTrainingMode(): boolean {
    return this.configManager.isTrainingMode();
  }

  public setTrainingMode(enabled: boolean): void {
    this.configManager.setTrainingMode(enabled);
    // In training mode, enable simulation for safety
    if (enabled) {
      this.setSimulationMode(true);
    }
  }

  /**
   * Get/set tool permissions
   */
  public getToolPermissions(toolName: string): any {
    return this.configManager.getToolPermissions(toolName);
  }
  public setToolPermissions(toolName: string, permissions: any): void {
    this.configManager.setToolPermissions(toolName, permissions);
  }

  /**
   * Analyze the audit logs for anomalies.
   */
  public async analyzeAuditLogs(): Promise<any> {
    return this.logAnalysisService.analyzeAuditLogs();
  }

  /**
   * Learn Mode Methods
   */
  public async startTrainingMission(userId: string, missionId: string, options: any): Promise<string> {
    return this.learnModeService.startMission(userId, missionId, options);
  }

  public async provideLearningFeedback(userId: string, action: string, result: any): Promise<string> {
    return this.learnModeService.provideFeedback(userId, action, result);
  }

  public async provideHint(userId: string, context?: string): Promise<string> {
    return this.learnModeService.provideHint(userId, context);
  }

  public async completeMission(userId: string, submissionData: any): Promise<string> {
    return this.learnModeService.completeMission(userId, submissionData);
  }

  public listTrainingMissions(difficulty?: string, category?: string): string {
    return this.learnModeService.listMissions(difficulty, category);
  }

  public getLearningProgress(userId: string): string {
    return this.learnModeService.getProgress(userId);
  }

  public async explainConcept(concept: string): Promise<string> {
    return this.learnModeService.explainConcept(concept);
  }

  /**
   * Health Monitoring Methods
   */
  public async performHealthCheck(): Promise<any> {
    return this.healthMonitoringService.performHealthCheck();
  }

  public getHealthStatus(): any {
    return this.healthMonitoringService.getHealthStatus();
  }

  public async generateHealthReport(): Promise<string> {
    return this.healthMonitoringService.generateHealthReport();
  }

  public async triggerSelfHealing(): Promise<void> {
    // Health monitoring service handles self-healing automatically
    // This method can be used to trigger manual healing
    const status = await this.performHealthCheck();
    if (status.overall !== 'healthy') {
      this.logger.info('Manual self-healing triggered due to health issues');
    }
  }

  /**
   * Query cybersecurity knowledge for enhanced reasoning
   */
  public async queryCybersecurityKnowledge(query: string, options: any = {}): Promise<any> {
    return await this.cybersecurityKnowledgeService.queryKnowledge({
      query,
      category: options.category,
      difficulty: options.difficulty,
      maxResults: options.maxResults || 10,
      includeCode: options.includeCode !== false,
      includeTechniques: options.includeTechniques !== false
    });
  }

  /**
   * Get cybersecurity concept by ID
   */
  public getCybersecurityConcept(id: string): any {
    return this.cybersecurityKnowledgeService.getConcept(id);
  }

  /**
   * Get all cybersecurity concepts
   */
  public getAllCybersecurityConcepts(): any[] {
    return this.cybersecurityKnowledgeService.getAllConcepts();
  }

  /**
   * Get cybersecurity concepts by category
   */
  public getCybersecurityConceptsByCategory(category: string): any[] {
    return this.cybersecurityKnowledgeService.getConceptsByCategory(category);
  }

  /**
   * Get cybersecurity knowledge statistics
   */
  public getCybersecurityKnowledgeStatistics(): any {
    return this.cybersecurityKnowledgeService.getKnowledgeStatistics();
  }

  /**
   * Query cybersecurity knowledge using CAG (Cache-Augmented Generation)
   */
  async queryCybersecurityKnowledgeCAG(query: string, options: any = {}): Promise<any> {
    try {
      const cagQuery = {
        query,
        category: options.category,
        difficulty: options.difficulty,
        maxResults: options.maxResults || 10,
        includeCode: options.includeCode !== false,
        includeTechniques: options.includeTechniques !== false,
        useCache: options.useCache !== false,
        context: options.context
      };

      const result = await this.cagService.query(cagQuery);

      this.eventBus.emit('cybersecurity-knowledge.cag-query', {
        query,
        result: {
          cached: result.cached,
          cacheHitType: result.cacheHitType,
          confidence: result.confidence,
          processingTime: result.processingTime
        }
      });

      return {
        response: result.response,
        concepts: [], // CAG doesn't return individual concepts
        techniques: result.techniques,
        tools: result.tools,
        codeExamples: result.codeExamples,
        confidence: result.confidence,
        sources: result.sources,
        cached: result.cached,
        cacheHitType: result.cacheHitType,
        similarityScore: result.similarityScore,
        processingTime: result.processingTime
      };
    } catch (error) {
      this.logger.error('CAG query failed:', error);
      throw error;
    }
  }

  /**
   * Get CAG cache statistics
   */
  getCAGCacheStats(): any {
    return this.cagService.getCacheStats();
  }

  /**
   * Clear CAG cache
   */
  clearCAGCache(): void {
    this.cagService.clearCache();
  }

  /**
   * Pre-warm CAG cache with common cybersecurity queries
   */
  async preWarmCAGCache(): Promise<void> {
    const commonQueries = [
      "What is network reconnaissance?",
      "How do I detect SQL injection?",
      "What are common web vulnerabilities?",
      "How to perform penetration testing?",
      "What is lateral movement?",
      "How to monitor network traffic?",
      "What are the OWASP Top 10?",
      "How to analyze malware?",
      "What is incident response?",
      "How to secure web applications?"
    ];

    await this.cagService.preWarmCache(commonQueries);
  }

  /**
   * Export CAG cache for persistence
   */
  exportCAGCache(): any {
    return this.cagService.exportCache();
  }

  /**
   * Import CAG cache from persistence
   */
  importCAGCache(cacheData: any): void {
    this.cagService.importCache(cacheData);
  }

  // Advanced mode - full control, no restrictions
  public isSenseiMode(): boolean {
    return this.configManager.isSenseiMode() && this.configManager.isSenseiAuthenticated();
  }

  public setSenseiMode(enabled: boolean): void {
    this.configManager.setSenseiMode(enabled);
  }

  public authenticateSensei(password: string): boolean {
    return this.configManager.authenticateSensei(password);
  }

  public isSenseiAuthenticated(): boolean {
    return this.configManager.isSenseiAuthenticated();
  }

  public clearSenseiAuth(): void {
    this.configManager.clearSenseiAuth();
  }

  // Advanced mode tool permissions - bypass all restrictions
  public getSenseiToolPermissions(toolName: string): any {
    if (!this.isSenseiMode()) {
      return this.getToolPermissions(toolName);
    }
    // Advanced mode: full access to everything
    return {
      allow: true,
      requireApproval: false,
      simulationOnly: false,
      bypassRestrictions: true
    };
  }

  // Advanced mode: full system control
  public async senseiExecute(command: string, options: any = {}): Promise<any> {
    if (!this.isSenseiMode()) {
      throw new Error('Advanced mode required for this operation');
    }

    // Full system access in advanced mode
    const result = await this.process(command, {
      strategy: 'absolute-zero',
      maxSteps: 10,
      bypassRestrictions: true,
      fullControl: true,
      ...options
    });

    return result;
  }

  // Advanced mode: system diagnostics
  public async senseiDiagnostics(): Promise<any> {
    if (!this.isSenseiMode()) {
      throw new Error('Advanced mode required for diagnostics');
    }

    return {
      systemStatus: 'full_control',
      restrictions: 'none',
      simulation: false,
      permissions: 'unlimited',
      access: 'complete',
      timestamp: new Date().toISOString()
    };
  }
}
