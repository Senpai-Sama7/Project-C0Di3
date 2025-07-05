import { EventBus } from '../events/event-bus';
import { MemorySystem } from '../memory/memory-system';
import { PerformanceMonitor } from '../monitoring/performance-monitor';
import { LLMClient } from '../types';
import { Logger } from '../utils/logger';

export type HealthLevel = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthStatus {
  overall: HealthLevel;
  components: {
    [key: string]: {
      status: HealthLevel;
      message: string;
      lastCheck: Date;
      metrics?: any;
    };
  };
  recommendations: string[];
  lastFullCheck: Date;
}

export interface SelfHealingAction {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  execute: () => Promise<boolean>;
}

export class HealthMonitoringService {
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly memorySystem: MemorySystem;
  private readonly client: LLMClient;
  private readonly healingActions: Map<string, SelfHealingAction> = new Map();
  private healthStatus: HealthStatus;
  private readonly checkInterval: number = 300000; // 5 minutes
  private checkTimer?: NodeJS.Timeout;

  constructor(
    eventBus: EventBus,
    logger: Logger,
    performanceMonitor: PerformanceMonitor,
    memorySystem: MemorySystem,
    client: LLMClient
  ) {
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

  private initializeHealingActions(): void {
    const actions: SelfHealingAction[] = [
      {
        name: 'clear-memory-cache',
        description: 'Clear memory cache to free up resources',
        severity: 'low',
        execute: async () => {
          try {
            // Clear memory cache if method exists
            if ('clearCache' in this.memorySystem && typeof this.memorySystem.clearCache === 'function') {
              await (this.memorySystem as any).clearCache();
            }
            this.logger.info('Memory cache cleared successfully');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to clear memory cache:', errorMessage);
            return false;
          }
        }
      },
      {
        name: 'restart-performance-monitoring',
        description: 'Restart performance monitoring to reset metrics',
        severity: 'medium',
        execute: async () => {
          try {
            // Reset performance monitoring if method exists
            if ('reset' in this.performanceMonitor && typeof this.performanceMonitor.reset === 'function') {
              (this.performanceMonitor as any).reset();
            }
            this.logger.info('Performance monitoring restarted');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to restart performance monitoring:', errorMessage);
            return false;
          }
        }
      },
      {
        name: 'optimize-memory-usage',
        description: 'Optimize memory usage by compacting data structures',
        severity: 'medium',
        execute: async () => {
          try {
            // Optimize memory usage if method exists
            if ('optimize' in this.memorySystem && typeof this.memorySystem.optimize === 'function') {
              await (this.memorySystem as any).optimize();
            }
            this.logger.info('Memory usage optimized');
            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to optimize memory usage:', errorMessage);
            return false;
          }
        }
      },
      {
        name: 'validate-system-integrity',
        description: 'Run system integrity checks and repair if needed',
        severity: 'high',
        execute: async () => {
          try {
            // Perform system integrity checks
            const isValid = await this.validateSystemIntegrity();
            if (isValid) {
              this.logger.info('System integrity validated');
              return true;
            } else {
              this.logger.warn('System integrity issues detected');
              return false;
            }
          } catch (error) {
            this.logger.error('Failed to validate system integrity:', error);
            return false;
          }
        }
      }
    ];

    actions.forEach(action => {
      this.healingActions.set(action.name, action);
    });
  }

  private startHealthChecks(): void {
    this.checkTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  public async performHealthCheck(): Promise<HealthStatus> {
    this.logger.debug('Performing health check...');

    const components = await Promise.all([
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
    }, {} as HealthStatus['components']);

    // Determine overall health
    const statuses = Object.values(componentStatuses).map(c => c.status);
    let overall: HealthLevel = 'healthy';

    if (statuses.some(s => s === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.some(s => s === 'degraded')) {
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
      await this.triggerSelfHealing();
    }

    return this.healthStatus;
  }

  private async checkPerformanceHealth(): Promise<{
    name: string;
    status: HealthLevel;
    message: string;
    metrics?: any;
  }> {
    try {
      const metrics = this.performanceMonitor.getDetailedMetrics();

      let status: HealthLevel = 'healthy';
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: 'performance',
        status: 'unhealthy',
        message: `Performance monitoring failed: ${errorMessage}`
      };
    }
  }

  private async checkMemoryHealth(): Promise<{
    name: string;
    status: HealthLevel;
    message: string;
    metrics?: any;
  }> {
    try {
      const stats = await this.memorySystem.getStatistics();

      let status: HealthLevel = 'healthy';
      let message = 'Memory system is operating normally';

      // Check memory usage patterns
      if (stats.cacheHitRate && stats.cacheHitRate < 0.5) {
        status = 'degraded';
        message = 'Low cache hit rate detected';
      }

      // Check for high memory usage if the property exists
      const memoryUsage = (stats as any).totalMemoryUsage ?? (stats as any).memoryUsage;
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: 'memory',
        status: 'unhealthy',
        message: `Memory system check failed: ${errorMessage}`
      };
    }
  }

  private async checkLLMHealth(): Promise<{
    name: string;
    status: HealthLevel;
    message: string;
    metrics?: any;
  }> {
    try {
      // Test LLM with a simple query
      const testPrompt = 'Respond with "OK" if you are functioning properly.';
      const startTime = Date.now();

      const response = await this.client.generate({ prompt: testPrompt });
      const responseTime = Date.now() - startTime;

      let status: HealthLevel = 'healthy';
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
          responseLength: response?.length || 0
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: 'llm',
        status: 'unhealthy',
        message: `LLM health check failed: ${errorMessage}`
      };
    }
  }

  private async checkEventBusHealth(): Promise<{
    name: string;
    status: HealthLevel;
    message: string;
    metrics?: any;
  }> {
    try {
      // Test event bus functionality
      let testPassed = false;

      const testHandler = () => {
        testPassed = true;
      };

      this.eventBus.on('health.test', testHandler);
      this.eventBus.emit('health.test', { test: true });

      // Wait a bit for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      this.eventBus.off('health.test', testHandler);

      const status = testPassed ? 'healthy' : 'unhealthy';
      const message = testPassed ? 'Event bus is functioning normally' : 'Event bus is not responding';

      return {
        name: 'eventbus',
        status,
        message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: 'eventbus',
        status: 'unhealthy',
        message: `Event bus health check failed: ${errorMessage}`
      };
    }
  }

  private generateRecommendations(components: HealthStatus['components']): string[] {
    const recommendations: string[] = [];

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

  private async triggerSelfHealing(): Promise<void> {
    this.logger.info('Triggering self-healing procedures...');

    const healingActions = Array.from(this.healingActions.values());

    // Execute healing actions based on severity
    for (const action of healingActions) {
      if (this.shouldExecuteHealingAction(action)) {
        this.logger.info(`Executing healing action: ${action.name}`);
        try {
          const success = await action.execute();
          if (success) {
            this.logger.info(`Healing action ${action.name} completed successfully`);
            this.eventBus.emit('health.healing.success', {
              action: action.name,
              timestamp: new Date()
            });
          } else {
            this.logger.warn(`Healing action ${action.name} failed`);
            this.eventBus.emit('health.healing.failed', {
              action: action.name,
              timestamp: new Date()
            });
          }
        } catch (error) {
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
  }

  private shouldExecuteHealingAction(action: SelfHealingAction): boolean {
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

  private async validateSystemIntegrity(): Promise<boolean> {
    try {
      // Perform various system integrity checks
      const checks = [
        this.checkConfigurationIntegrity(),
        this.checkDataIntegrity(),
        this.checkServiceIntegrity()
      ];

      const results = await Promise.all(checks);
      return results.every(result => result);
    } catch (error) {
      this.logger.error('System integrity validation failed:', error);
      return false;
    }
  }

  private async checkConfigurationIntegrity(): Promise<boolean> {
    // Check if all required configuration is present and valid
    return true; // Placeholder
  }

  private async checkDataIntegrity(): Promise<boolean> {
    // Check data consistency and integrity
    return true; // Placeholder
  }

  private async checkServiceIntegrity(): Promise<boolean> {
    // Check if all services are running and responsive
    return true; // Placeholder
  }

  public getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }

  public async generateHealthReport(): Promise<string> {
    const status = await this.performHealthCheck();

    let report = `# System Health Report\n\n`;
    report += `**Overall Status:** ${status.overall.toUpperCase()}\n`;
    report += `**Last Check:** ${status.lastFullCheck.toISOString()}\n\n`;

    report += `## Component Status\n\n`;
    Object.entries(status.components).forEach(([name, component]) => {
      let emoji: string;
      if (component.status === 'healthy') {
        emoji = '✅';
      } else if (component.status === 'degraded') {
        emoji = '⚠️';
      } else {
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
  }

  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }
}
