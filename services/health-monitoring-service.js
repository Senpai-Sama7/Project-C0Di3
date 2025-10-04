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
exports.HealthMonitoringService = void 0;
class HealthMonitoringService {
    constructor(eventBus, logger, performanceMonitor, memorySystem, client) {
        this.healingActions = new Map();
        this.checkInterval = 300000; // 5 minutes
        this.eventBus = eventBus;
        this.logger = logger;
        this.performanceMonitor = performanceMonitor;
        this.memorySystem = memorySystem;
        this.client = client;
        this.healthStatus = {
            overall: 'healthy',
            components: {},
            recommendations: [],
            lastFullCheck: new Date()
        };
        this.initializeHealingActions();
        this.startHealthChecks();
    }
    initializeHealingActions() {
        const actions = [
            {
                name: 'clear-memory-cache',
                description: 'Clear memory cache to free up resources',
                severity: 'low',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Clear memory cache if method exists
                        if ('clearCache' in this.memorySystem && typeof this.memorySystem.clearCache === 'function') {
                            yield this.memorySystem.clearCache();
                        }
                        this.logger.info('Memory cache cleared successfully');
                        return true;
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error('Failed to clear memory cache:', errorMessage);
                        return false;
                    }
                })
            },
            {
                name: 'restart-performance-monitoring',
                description: 'Restart performance monitoring to reset metrics',
                severity: 'medium',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Reset performance monitoring if method exists
                        if ('reset' in this.performanceMonitor && typeof this.performanceMonitor.reset === 'function') {
                            this.performanceMonitor.reset();
                        }
                        this.logger.info('Performance monitoring restarted');
                        return true;
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error('Failed to restart performance monitoring:', errorMessage);
                        return false;
                    }
                })
            },
            {
                name: 'optimize-memory-usage',
                description: 'Optimize memory usage by compacting data structures',
                severity: 'medium',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Optimize memory usage if method exists
                        if ('optimize' in this.memorySystem && typeof this.memorySystem.optimize === 'function') {
                            yield this.memorySystem.optimize();
                        }
                        this.logger.info('Memory usage optimized');
                        return true;
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error('Failed to optimize memory usage:', errorMessage);
                        return false;
                    }
                })
            },
            {
                name: 'validate-system-integrity',
                description: 'Run system integrity checks and repair if needed',
                severity: 'high',
                execute: () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        // Perform system integrity checks
                        const isValid = yield this.validateSystemIntegrity();
                        if (isValid) {
                            this.logger.info('System integrity validated');
                            return true;
                        }
                        else {
                            this.logger.warn('System integrity issues detected');
                            return false;
                        }
                    }
                    catch (error) {
                        this.logger.error('Failed to validate system integrity:', error);
                        return false;
                    }
                })
            }
        ];
        actions.forEach(action => {
            this.healingActions.set(action.name, action);
        });
    }
    startHealthChecks() {
        this.checkTimer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.performHealthCheck();
        }), this.checkInterval);
        // Perform initial health check
        this.performHealthCheck();
    }
    performHealthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('Performing health check...');
            const components = yield Promise.all([
                this.checkPerformanceHealth(),
                this.checkMemoryHealth(),
                this.checkLLMHealth(),
                this.checkEventBusHealth()
            ]);
            const componentStatuses = components.reduce((acc, component) => {
                acc[component.name] = {
                    status: component.status,
                    message: component.message,
                    lastCheck: new Date(),
                    metrics: component.metrics
                };
                return acc;
            }, {});
            // Determine overall health
            const statuses = Object.values(componentStatuses).map(c => c.status);
            let overall = 'healthy';
            if (statuses.some(s => s === 'unhealthy')) {
                overall = 'unhealthy';
            }
            else if (statuses.some(s => s === 'degraded')) {
                overall = 'degraded';
            }
            // Generate recommendations
            const recommendations = this.generateRecommendations(componentStatuses);
            this.healthStatus = {
                overall,
                components: componentStatuses,
                recommendations,
                lastFullCheck: new Date()
            };
            this.eventBus.emit('health.check.completed', {
                status: this.healthStatus,
                timestamp: new Date()
            });
            // Trigger self-healing if needed
            if (overall !== 'healthy') {
                yield this.triggerSelfHealing();
            }
            return this.healthStatus;
        });
    }
    checkPerformanceHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const metrics = this.performanceMonitor.getDetailedMetrics();
                let status = 'healthy';
                let message = 'Performance metrics are within normal ranges';
                // Check for performance issues
                if (metrics.latency && metrics.latency > 5000) {
                    status = 'degraded';
                    message = 'High latency detected';
                }
                if (metrics.memoryUsage && metrics.memoryUsage > 0.8) {
                    status = 'degraded';
                    message = 'High memory usage detected';
                }
                if (metrics.latency && metrics.latency > 10000) {
                    status = 'unhealthy';
                    message = 'Critical latency issues';
                }
                return {
                    name: 'performance',
                    status,
                    message,
                    metrics
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    name: 'performance',
                    status: 'unhealthy',
                    message: `Performance monitoring failed: ${errorMessage}`
                };
            }
        });
    }
    checkMemoryHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const stats = yield this.memorySystem.getStatistics();
                let status = 'healthy';
                let message = 'Memory system is operating normally';
                // Check memory usage patterns
                if (stats.cacheHitRate && stats.cacheHitRate < 0.5) {
                    status = 'degraded';
                    message = 'Low cache hit rate detected';
                }
                // Check for high memory usage if the property exists
                const memoryUsage = (_a = stats.totalMemoryUsage) !== null && _a !== void 0 ? _a : stats.memoryUsage;
                if (memoryUsage && memoryUsage > 1000000000) { // 1GB
                    status = 'degraded';
                    message = 'High memory usage detected';
                }
                return {
                    name: 'memory',
                    status,
                    message,
                    metrics: stats
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    name: 'memory',
                    status: 'unhealthy',
                    message: `Memory system check failed: ${errorMessage}`
                };
            }
        });
    }
    checkLLMHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Test LLM with a simple query
                const testPrompt = 'Respond with "OK" if you are functioning properly.';
                const startTime = Date.now();
                const response = yield this.client.generate({ prompt: testPrompt });
                const responseTime = Date.now() - startTime;
                let status = 'healthy';
                let message = 'LLM is responding normally';
                if (responseTime > 10000) {
                    status = 'degraded';
                    message = 'LLM response time is slow';
                }
                if (responseTime > 30000) {
                    status = 'unhealthy';
                    message = 'LLM response time is critically slow';
                }
                if (!response || response.length === 0) {
                    status = 'unhealthy';
                    message = 'LLM is not responding';
                }
                return {
                    name: 'llm',
                    status,
                    message,
                    metrics: {
                        responseTime,
                        responseLength: (response === null || response === void 0 ? void 0 : response.length) || 0
                    }
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    name: 'llm',
                    status: 'unhealthy',
                    message: `LLM health check failed: ${errorMessage}`
                };
            }
        });
    }
    checkEventBusHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Test event bus functionality
                let testPassed = false;
                const testHandler = () => {
                    testPassed = true;
                };
                this.eventBus.on('health.test', testHandler);
                this.eventBus.emit('health.test', { test: true });
                // Wait a bit for the event to be processed
                yield new Promise(resolve => setTimeout(resolve, 100));
                this.eventBus.off('health.test', testHandler);
                const status = testPassed ? 'healthy' : 'unhealthy';
                const message = testPassed ? 'Event bus is functioning normally' : 'Event bus is not responding';
                return {
                    name: 'eventbus',
                    status,
                    message
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    name: 'eventbus',
                    status: 'unhealthy',
                    message: `Event bus health check failed: ${errorMessage}`
                };
            }
        });
    }
    generateRecommendations(components) {
        const recommendations = [];
        Object.entries(components).forEach(([name, component]) => {
            if (component.status === 'degraded' || component.status === 'unhealthy') {
                switch (name) {
                    case 'performance':
                        recommendations.push('Consider optimizing performance by clearing caches or restarting services');
                        break;
                    case 'memory':
                        recommendations.push('Memory usage is high - consider clearing cache or optimizing data structures');
                        break;
                    case 'llm':
                        recommendations.push('LLM performance is degraded - check network connectivity and service status');
                        break;
                    case 'eventbus':
                        recommendations.push('Event bus issues detected - restart may be required');
                        break;
                }
            }
        });
        return recommendations;
    }
    triggerSelfHealing() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Triggering self-healing procedures...');
            const healingActions = Array.from(this.healingActions.values());
            // Execute healing actions based on severity
            for (const action of healingActions) {
                if (this.shouldExecuteHealingAction(action)) {
                    this.logger.info(`Executing healing action: ${action.name}`);
                    try {
                        const success = yield action.execute();
                        if (success) {
                            this.logger.info(`Healing action ${action.name} completed successfully`);
                            this.eventBus.emit('health.healing.success', {
                                action: action.name,
                                timestamp: new Date()
                            });
                        }
                        else {
                            this.logger.warn(`Healing action ${action.name} failed`);
                            this.eventBus.emit('health.healing.failed', {
                                action: action.name,
                                timestamp: new Date()
                            });
                        }
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error(`Error executing healing action ${action.name}:`, errorMessage);
                        this.eventBus.emit('health.healing.error', {
                            action: action.name,
                            error: errorMessage,
                            timestamp: new Date()
                        });
                    }
                }
            }
        });
    }
    shouldExecuteHealingAction(action) {
        // Logic to determine if a healing action should be executed
        // based on current health status and action severity
        const { overall } = this.healthStatus;
        if (overall === 'unhealthy') {
            return true; // Execute all healing actions for unhealthy state
        }
        if (overall === 'degraded' && action.severity !== 'high') {
            return true; // Execute low and medium severity actions for degraded state
        }
        return false;
    }
    validateSystemIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Perform various system integrity checks
                const checks = [
                    this.checkConfigurationIntegrity(),
                    this.checkDataIntegrity(),
                    this.checkServiceIntegrity()
                ];
                const results = yield Promise.all(checks);
                return results.every(result => result);
            }
            catch (error) {
                this.logger.error('System integrity validation failed:', error);
                return false;
            }
        });
    }
    checkConfigurationIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if all required configuration is present and valid
            return true; // Placeholder
        });
    }
    checkDataIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check data consistency and integrity
            return true; // Placeholder
        });
    }
    checkServiceIntegrity() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if all services are running and responsive
            return true; // Placeholder
        });
    }
    getHealthStatus() {
        return this.healthStatus;
    }
    generateHealthReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield this.performHealthCheck();
            let report = `# System Health Report\n\n`;
            report += `**Overall Status:** ${status.overall.toUpperCase()}\n`;
            report += `**Last Check:** ${status.lastFullCheck.toISOString()}\n\n`;
            report += `## Component Status\n\n`;
            Object.entries(status.components).forEach(([name, component]) => {
                let emoji;
                if (component.status === 'healthy') {
                    emoji = '✅';
                }
                else if (component.status === 'degraded') {
                    emoji = '⚠️';
                }
                else {
                    emoji = '❌';
                }
                report += `${emoji} **${name}**: ${component.status} - ${component.message}\n`;
            });
            if (status.recommendations.length > 0) {
                report += `\n## Recommendations\n\n`;
                status.recommendations.forEach((rec, index) => {
                    report += `${index + 1}. ${rec}\n`;
                });
            }
            return report;
        });
    }
    stop() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
    }
}
exports.HealthMonitoringService = HealthMonitoringService;
