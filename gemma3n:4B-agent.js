"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.GemmaAgent = void 0;
require("dotenv/config");
const llama_cpp_client_1 = require("./clients/llama-cpp-client");
const log_analyzer_client_1 = require("./clients/log-analyzer-client");
const config_manager_1 = require("./config/config-manager");
const context_manager_1 = require("./context/context-manager");
const event_bus_1 = require("./events/event-bus");
const feedback_loop_1 = require("./learning/feedback-loop");
const memory_system_1 = require("./memory/memory-system");
const performance_monitor_1 = require("./monitoring/performance-monitor");
const plugin_manager_1 = require("./plugins/plugin-manager");
const reasoning_engine_1 = require("./reasoning/reasoning-engine");
const audit_service_1 = require("./services/audit-service");
const book_ingestion_service_1 = require("./services/book-ingestion-service");
const cybersecurity_knowledge_service_1 = require("./services/cybersecurity-knowledge-service");
const health_monitoring_service_1 = require("./services/health-monitoring-service");
const learn_mode_service_1 = require("./services/learn-mode-service");
const log_analysis_service_1 = require("./services/log-analysis-service");
const tool_registry_1 = require("./tools/tool-registry");
const logger_1 = require("./utils/logger");
const cag_service_1 = require("./services/cag-service");
/**
 * GemmaAgent - Core autonomous agent with advanced reasoning, learning capabilities,
 * and integration with Gemma 3n LLM backend. Supports workspace features (MCP, VertexAI Search, etc.)
 */
class GemmaAgent {
    constructor(config) {
        var _a, _b, _c, _d, _e;
        this.mcpEnabled = false;
        this.vertexAIEnabled = false;
        // Initialize session and workspace integration
        this.sessionId = (config === null || config === void 0 ? void 0 : config.sessionId) || `session-${Date.now()}`;
        this.chatLogFile = (_a = config === null || config === void 0 ? void 0 : config.workspaceIntegration) === null || _a === void 0 ? void 0 : _a.chatLogFile;
        this.sessionLogFile = (_b = config === null || config === void 0 ? void 0 : config.workspaceIntegration) === null || _b === void 0 ? void 0 : _b.sessionLogFile;
        this.mcpEnabled = ((_c = config === null || config === void 0 ? void 0 : config.workspaceIntegration) === null || _c === void 0 ? void 0 : _c.mcpEnabled) || false;
        this.vertexAIEnabled = ((_d = config === null || config === void 0 ? void 0 : config.workspaceIntegration) === null || _d === void 0 ? void 0 : _d.vertexAIEnabled) || false;
        // Initialize subsystems
        this.configManager = (config === null || config === void 0 ? void 0 : config.configManager) || new config_manager_1.ConfigManager(config);
        this.eventBus = new event_bus_1.EventBus();
        this.logger = new logger_1.Logger(this.configManager.get('logging.level', 'info'));
        // Encryption key for audit logs
        const encryptionKey = this.configManager.get('agent.encryptionKey') || process.env.AGENT_ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error('Encryption key for audit logs is not set. Please set AGENT_ENCRYPTION_KEY in environment or config.');
        }
        this.auditService = new audit_service_1.AuditService(this.configManager.get('logging.auditLogDir', './data/logs'), this.eventBus, encryptionKey);
        const logAnalyzerClient = new log_analyzer_client_1.LogAnalyzerClient(this.configManager.get('services.logAnalyzer.baseUrl', 'http://localhost:5001'), this.logger);
        this.logAnalysisService = new log_analysis_service_1.LogAnalysisService(logAnalyzerClient, this.auditService, this.logger);
        // Log session start to workspace logs
        this.logToWorkspace('session_start', {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            mcpEnabled: this.mcpEnabled,
            vertexAIEnabled: this.vertexAIEnabled
        });
        // Performance monitoring with workspace integration
        this.performanceMonitor = new performance_monitor_1.PerformanceMonitor({
            metrics: ['latency', 'tokenUsage', 'memoryUsage', 'toolExecutionTime', 'reasoningComplexity'],
            eventBus: this.eventBus,
            logToWorkspace: this.chatLogFile ? (data) => this.logToWorkspace('performance', data) : undefined
        });
        // Core AI capabilities - require real LLM client
        try {
            this.client = new llama_cpp_client_1.LlamaCppClient(this.configManager.get('llm.apiUrl', (_e = process.env.LLM_API_URL) !== null && _e !== void 0 ? _e : 'http://localhost:8000'));
            this.logger.info('LLM client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize LLM client:', error);
            throw new Error('LLM client is required. Please ensure llama.cpp server is running or configure a valid LLM endpoint.');
        }
        // Initialize learn mode service after client is available
        this.learnModeService = new learn_mode_service_1.LearnModeService(this.client, this.logger, this.eventBus);
        // Memory systems
        this.memory = new memory_system_1.MemorySystem({
            vectorStoreType: this.configManager.get('memory.vectorStore', 'inmemory'),
            persistencePath: this.configManager.get('memory.persistencePath', './data/memory'),
            cacheSize: this.configManager.get('memory.cacheSize', 10000),
            cacheTTL: this.configManager.get('memory.cacheTTL', 3600),
            workingMemoryCapacity: this.configManager.get('memory.workingMemoryCapacity', 10),
            eventBus: this.eventBus
        });
        this.bookIngestionService = new book_ingestion_service_1.BookIngestionService(this.memory.getVectorStore());
        // Initialize cybersecurity knowledge service
        this.cybersecurityKnowledgeService = new cybersecurity_knowledge_service_1.CybersecurityKnowledgeService(this.memory, this.client, this.eventBus);
        // Initialize CAG service
        this.cagService = new cag_service_1.CAGService(this.client, this.cybersecurityKnowledgeService, this.eventBus);
        // Initialize health monitoring service after memory is available
        this.healthMonitoringService = new health_monitoring_service_1.HealthMonitoringService(this.eventBus, this.logger, this.performanceMonitor, this.memory, this.client);
        // Tools and extensions
        this.toolRegistry = new tool_registry_1.ToolRegistry(this.eventBus);
        this.pluginManager = new plugin_manager_1.PluginManager({
            registry: this.toolRegistry,
            allowedDirectories: this.configManager.get('plugins.allowedDirectories', ['./plugins']),
            eventBus: this.eventBus
        });
        // Advanced reasoning and learning
        this.reasoningEngine = new reasoning_engine_1.ReasoningEngine({
            memory: this.memory,
            client: this.client,
            eventBus: this.eventBus,
            zeroShotEnabled: this.configManager.get('reasoning.zeroShotEnabled', true),
            cybersecurityKnowledgeService: this.cybersecurityKnowledgeService
        });
        this.feedbackLoop = new feedback_loop_1.FeedbackLoop({
            memory: this.memory,
            reasoningEngine: this.reasoningEngine,
            eventBus: this.eventBus,
            learningRate: this.configManager.get('learning.learningRate', 0.1)
        });
        // Context management
        this.contextManager = new context_manager_1.ContextManager();
        // Register event handlers
        this.registerEventHandlers();
        // Initialize subsystems
        this.initialize();
    }
    registerEventHandlers() {
        this.eventBus.on('agent.request', (data) => this.performanceMonitor.startRequest(data.requestId));
        this.eventBus.on('agent.response', (data) => this.performanceMonitor.endRequest(data.requestId));
        this.eventBus.on('agent.error', this.handleError.bind(this));
        this.eventBus.on('memory.update', this.feedbackLoop.onMemoryUpdate.bind(this.feedbackLoop));
        this.eventBus.on('tool.execution', this.performanceMonitor.trackToolExecution.bind(this.performanceMonitor));
    }
    handleError(error) {
        this.logger.error('Agent error:', error);
        // Implement self-healing measures
        this.feedbackLoop.learnFromError(error);
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info('Initializing GemmaAgent...');
                // Load built-in tools
                yield this.toolRegistry.loadBuiltinTools();
                // Load plugins
                yield this.pluginManager.loadPlugins();
                // Initialize memory systems
                yield this.memory.initialize();
                // Initialize cybersecurity knowledge service
                yield this.cybersecurityKnowledgeService.initialize();
                // Initialize integrations
                // await Promise.all([
                //   this.langgraph.initialize()
                // ]);
                this.logger.info('GemmaAgent initialized successfully.');
            }
            catch (error) {
                this.logger.error('Failed to initialize GemmaAgent:', error);
                throw error;
            }
        });
    }
    ingestBook(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bookIngestionService.ingestBook(filePath);
        });
    }
    /**
     * Process a user request through the agent
     * @param input User input text or structured request
     * @param options Processing options
     * @returns Response from the agent
     */
    process(input_1) {
        return __awaiter(this, arguments, void 0, function* (input, options = {}) {
            const requestId = this.sessionId;
            this.eventBus.emit('agent.request', { requestId });
            const performance = this.performanceMonitor.startRequest(requestId);
            try {
                // Build context for the current request
                const context = yield this.contextManager.loadProjectContext(input);
                // Generate and validate reasoning plan
                const reasoningPlan = yield this.generateReasoningPlan(input, context, options);
                yield this.validateToolPermissions(reasoningPlan);
                // Execute reasoning steps
                const result = yield this.reasoningEngine.executeReasoningPlan(reasoningPlan, context);
                // Learn from this interaction
                yield this.learnFromInteraction(input, result, options);
                performance.end();
                return {
                    text: typeof result === 'string' ? result : ((result === null || result === void 0 ? void 0 : result.content) || ''),
                    reasoning: result.reasoning,
                    toolCalls: result.toolCalls,
                    performance: this.performanceMonitor.getMetrics(),
                    memory: context
                };
            }
            catch (error) {
                this.eventBus.emit('agent.error', error);
                performance.end({ error });
                this.logger.error('Error in process:', error);
                throw error;
            }
        });
    }
    /**
     * Generate reasoning plan for the given input
     */
    generateReasoningPlan(input, context, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const reasoningOptions = {
                strategy: typeof options.strategy === 'string' ? options.strategy : 'auto',
                depth: typeof options.maxSteps === 'number' ? options.maxSteps : undefined,
                verificationEnabled: true
            };
            return yield this.reasoningEngine.generatePlan(input, context, reasoningOptions);
        });
    }
    /**
     * Validate tool permissions for the reasoning plan
     */
    validateToolPermissions(reasoningPlan) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Check if tool should be simulated
     */
    shouldSimulateTool(perms) {
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
    learnFromInteraction(input, result, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const learningOptions = {
                enabled: options.learningEnabled !== false,
                learningRate: this.configManager.get('learning.learningRate', 0.1)
            };
            this.feedbackLoop.learn(input, result, learningOptions);
        });
    }
    /**
     * Register a new tool with the agent
     * @param tool Tool implementation
     */
    registerTool(tool) {
        this.toolRegistry.register(tool);
    }
    /**
     * Get the agent's performance metrics
     */
    getPerformanceMetrics() {
        return this.performanceMonitor.getDetailedMetrics();
    }
    /**
     * Gracefully shutdown the agent and persist memory
     */
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Shutting down GemmaAgent...');
            try {
                // Stop health monitoring
                this.healthMonitoringService.stop();
                // Persist memory and cleanup
                yield this.memory.persist();
                yield this.pluginManager.unloadPlugins();
                // Generate final reports
                this.performanceMonitor.generateReport();
                yield this.generateHealthReport();
                this.logger.info('Final health report generated');
                // Log shutdown to workspace
                yield this.logToWorkspace('session_end', {
                    sessionId: this.sessionId,
                    timestamp: new Date().toISOString(),
                    shutdown_reason: 'normal',
                    final_health_status: this.getHealthStatus().overall
                });
                this.logger.info('GemmaAgent shutdown complete.');
            }
            catch (error) {
                this.logger.error('Error during shutdown:', error);
                throw error;
            }
        });
    }
    /**
     * Log an event or data to the workspace integration (e.g., MCP, VertexAI) using async file I/O
     * @param eventType Type of the event (e.g., 'session_start', 'performance')
     * @param data Data to log
     */
    logToWorkspace(type, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.chatLogFile) {
                try {
                    const fs = yield Promise.resolve().then(() => __importStar(require('fs/promises')));
                    const logEntry = {
                        type,
                        sessionId: this.sessionId,
                        timestamp: new Date().toISOString(),
                        data
                    };
                    yield fs.appendFile(this.chatLogFile, JSON.stringify(logEntry) + '\n');
                    if (this.sessionLogFile) {
                        yield fs.appendFile(this.sessionLogFile, JSON.stringify(logEntry) + '\n');
                    }
                }
                catch (error) {
                    this.logger.error('Failed to log to workspace:', error);
                }
            }
        });
    }
    /**
     * Get the agent's event bus for external listeners
     */
    getEventBus() {
        return this.eventBus;
    }
    /**
     * Start a new session
     */
    startNewSession() {
        this.sessionId = `session-${Date.now()}`;
        this.logger.info(`Started new session: ${this.sessionId}`);
        return this.sessionId;
    }
    /**
     * Clear a session's context
     */
    clearSessionContext(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.contextManager.clearContext();
        });
    }
    /**
     * Get session context
     */
    getSessionContext(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.contextManager.getContext();
        });
    }
    getMemoryState(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.memory.getStatistics();
        });
    }
    /**
     * Set reasoning mode for a session
     */
    setReasoningMode(sessionId, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reasoningEngine.setMode(sessionId, mode);
        });
    }
    /**
     * Get/set user mode
     */
    getUserMode() {
        return this.configManager.getUserMode();
    }
    setUserMode(mode) {
        this.configManager.setUserMode(mode);
    }
    /**
     * Get/set simulation mode
     */
    getSimulationMode() {
        return this.configManager.getSimulationMode();
    }
    setSimulationMode(enabled) {
        this.configManager.setSimulationMode(enabled);
    }
    isTrainingMode() {
        return this.configManager.isTrainingMode();
    }
    setTrainingMode(enabled) {
        this.configManager.setTrainingMode(enabled);
        // In training mode, enable simulation for safety
        if (enabled) {
            this.setSimulationMode(true);
        }
    }
    /**
     * Get/set tool permissions
     */
    getToolPermissions(toolName) {
        return this.configManager.getToolPermissions(toolName);
    }
    setToolPermissions(toolName, permissions) {
        this.configManager.setToolPermissions(toolName, permissions);
    }
    /**
     * Analyze the audit logs for anomalies.
     */
    analyzeAuditLogs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.logAnalysisService.analyzeAuditLogs();
        });
    }
    /**
     * Learn Mode Methods
     */
    startTrainingMission(userId, missionId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.learnModeService.startMission(userId, missionId, options);
        });
    }
    provideLearningFeedback(userId, action, result) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.learnModeService.provideFeedback(userId, action, result);
        });
    }
    provideHint(userId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.learnModeService.provideHint(userId, context);
        });
    }
    completeMission(userId, submissionData) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.learnModeService.completeMission(userId, submissionData);
        });
    }
    listTrainingMissions(difficulty, category) {
        return this.learnModeService.listMissions(difficulty, category);
    }
    getLearningProgress(userId) {
        return this.learnModeService.getProgress(userId);
    }
    explainConcept(concept) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.learnModeService.explainConcept(concept);
        });
    }
    /**
     * Health Monitoring Methods
     */
    performHealthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.healthMonitoringService.performHealthCheck();
        });
    }
    getHealthStatus() {
        return this.healthMonitoringService.getHealthStatus();
    }
    generateHealthReport() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.healthMonitoringService.generateHealthReport();
        });
    }
    triggerSelfHealing() {
        return __awaiter(this, void 0, void 0, function* () {
            // Health monitoring service handles self-healing automatically
            // This method can be used to trigger manual healing
            const status = yield this.performHealthCheck();
            if (status.overall !== 'healthy') {
                this.logger.info('Manual self-healing triggered due to health issues');
            }
        });
    }
    /**
     * Query cybersecurity knowledge for enhanced reasoning
     */
    queryCybersecurityKnowledge(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, options = {}) {
            return yield this.cybersecurityKnowledgeService.queryKnowledge({
                query,
                category: options.category,
                difficulty: options.difficulty,
                maxResults: options.maxResults || 10,
                includeCode: options.includeCode !== false,
                includeTechniques: options.includeTechniques !== false
            });
        });
    }
    /**
     * Get cybersecurity concept by ID
     */
    getCybersecurityConcept(id) {
        return this.cybersecurityKnowledgeService.getConcept(id);
    }
    /**
     * Get all cybersecurity concepts
     */
    getAllCybersecurityConcepts() {
        return this.cybersecurityKnowledgeService.getAllConcepts();
    }
    /**
     * Get cybersecurity concepts by category
     */
    getCybersecurityConceptsByCategory(category) {
        return this.cybersecurityKnowledgeService.getConceptsByCategory(category);
    }
    /**
     * Get cybersecurity knowledge statistics
     */
    getCybersecurityKnowledgeStatistics() {
        return this.cybersecurityKnowledgeService.getKnowledgeStatistics();
    }
    /**
     * Query cybersecurity knowledge using CAG (Cache-Augmented Generation)
     */
    queryCybersecurityKnowledgeCAG(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, options = {}) {
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
                const result = yield this.cagService.query(cagQuery);
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
            }
            catch (error) {
                this.logger.error('CAG query failed:', error);
                throw error;
            }
        });
    }
    /**
     * Get CAG cache statistics
     */
    getCAGCacheStats() {
        return this.cagService.getCacheStats();
    }
    /**
     * Clear CAG cache
     */
    clearCAGCache() {
        this.cagService.clearCache();
    }
    /**
     * Pre-warm CAG cache with common cybersecurity queries
     */
    preWarmCAGCache() {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.cagService.preWarmCache(commonQueries);
        });
    }
    /**
     * Export CAG cache for persistence
     */
    exportCAGCache() {
        return this.cagService.exportCache();
    }
    /**
     * Import CAG cache from persistence
     */
    importCAGCache(cacheData) {
        this.cagService.importCache(cacheData);
    }
    // Advanced mode - full control, no restrictions
    isSenseiMode() {
        return this.configManager.isSenseiMode() && this.configManager.isSenseiAuthenticated();
    }
    setSenseiMode(enabled) {
        this.configManager.setSenseiMode(enabled);
    }
    authenticateSensei(password) {
        return this.configManager.authenticateSensei(password);
    }
    isSenseiAuthenticated() {
        return this.configManager.isSenseiAuthenticated();
    }
    clearSenseiAuth() {
        this.configManager.clearSenseiAuth();
    }
    // Advanced mode tool permissions - bypass all restrictions
    getSenseiToolPermissions(toolName) {
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
    senseiExecute(command_1) {
        return __awaiter(this, arguments, void 0, function* (command, options = {}) {
            if (!this.isSenseiMode()) {
                throw new Error('Advanced mode required for this operation');
            }
            // Full system access in advanced mode
            const result = yield this.process(command, Object.assign({ strategy: 'absolute-zero', maxSteps: 10, bypassRestrictions: true, fullControl: true }, options));
            return result;
        });
    }
    // Advanced mode: system diagnostics
    senseiDiagnostics() {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
exports.GemmaAgent = GemmaAgent;
