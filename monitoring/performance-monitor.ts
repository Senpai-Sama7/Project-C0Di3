import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';

export interface PerformanceMetrics {
  latency?: number;
  tokenUsage?: number;
  memoryUsage?: number;
  toolExecutionTime?: number;
  reasoningComplexity?: number;
  timestamp?: number;
}

export interface PerformanceMonitorOptions {
  metrics: string[];
  eventBus?: EventBus;
  enableLogging?: boolean;
  logToWorkspace?: (data: any) => void;
}

export class PerformanceMonitor {
  private metrics: Map<string, any[]> = new Map();
  public eventBus: EventBus;
  private logger: Logger;
  private enableLogging: boolean;
  private logToWorkspace?: (data: any) => void;
  private startTimes: Map<string, number> = new Map();
  private operations: Map<string, number> = new Map();

  constructor(options: PerformanceMonitorOptions) {
    this.eventBus = options.eventBus || new EventBus();
    this.logger = new Logger('PerformanceMonitor');
    this.enableLogging = options.enableLogging || false;
    this.logToWorkspace = options.logToWorkspace;

    // Initialize metric storage
    for (const metric of options.metrics) {
      this.metrics.set(metric, []);
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('tool.execution.start', (data) => {
      this.startTimer(`tool.${data.name}`);
    });

    this.eventBus.on('tool.execution.success', (data) => {
      this.recordMetric('toolExecutionTime', data.executionTime);
      this.stopTimer(`tool.${data.name}`);
    });

    this.eventBus.on('reasoning.start', (data) => {
      this.startTimer('reasoning');
    });

    this.eventBus.on('reasoning.complete', (data) => {
      this.recordMetric('reasoningComplexity', data.complexity || 1);
      this.stopTimer('reasoning');
    });
  }

  startTimer(name: string): void {
    this.startTimes.set(name, Date.now());
  }

  stopTimer(name: string): number {
    const startTime = this.startTimes.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(name);
      return duration;
    }
    return 0;
  }

  public startRequest(requestId: string): { end: (options?: { error?: Error }) => void } {
    this.startTimer(`request.${requestId}`);
    return {
      end: (options?: { error?: Error }) => {
        const duration = this.stopTimer(`request.${requestId}`);
        this.recordMetric('latency', duration);
        if (options?.error) {
          this.logger.error(`Request ${requestId} failed after ${duration}ms`, options.error);
        }
      }
    };
  }

  public endRequest(requestId: string): void {
    const duration = this.stopTimer(`request.${requestId}`);
    this.recordMetric('latency', duration);
  }

  recordMetric(name: string, value: number): void {
    if (this.metrics.has(name)) {
      const metricData = {
        value,
        timestamp: Date.now()
      };

      this.metrics.get(name)!.push(metricData);

      // Keep only last 1000 entries per metric
      const metricArray = this.metrics.get(name)!;
      if (metricArray.length > 1000) {
        metricArray.shift();
      }

      if (this.enableLogging) {
        this.logger.debug(`Metric recorded: ${name} = ${value}`);
      }

      // Log to workspace if enabled
      if (this.logToWorkspace) {
        this.logToWorkspace({
          type: 'performance_metric',
          metric: name,
          value,
          timestamp: metricData.timestamp
        });
      }

      this.eventBus.emit('metric.recorded', { name, value, timestamp: metricData.timestamp });
    }
  }

  trackToolExecution(data: any): void {
    if (data.executionTime) {
      this.recordMetric('toolExecutionTime', data.executionTime);
    }
  }

  startOperation(name: string): void {
    this.startTimer(name);
  }

  endOperation(name: string, data?: any): void {
    const duration = this.stopTimer(name);
    this.recordMetric(`${name}Duration`, duration);

    if (data?.error) {
      this.recordMetric(`${name}Errors`, 1);
    }
  }

  getMetric(name: string): any[] {
    return this.metrics.get(name) || [];
  }

  getLatestMetric(name: string): any | null {
    const metric = this.metrics.get(name);
    if (metric && metric.length > 0) {
      return metric[metric.length - 1];
    }
    return null;
  }

  getAverageMetric(name: string, windowSize: number = 10): number {
    const metric = this.metrics.get(name);
    if (metric && metric.length > 0) {
      const window = metric.slice(-windowSize);
      const sum = window.reduce((acc, entry) => acc + entry.value, 0);
      return sum / window.length;
    }
    return 0;
  }

  getAllMetrics(): Map<string, any[]> {
    return new Map(this.metrics);
  }

  getSummary(): any {
    const summary: any = {};

    for (const [name, data] of this.metrics) {
      if (data.length > 0) {
        const values = data.map(entry => entry.value);
        summary[name] = {
          count: values.length,
          latest: values[values.length - 1],
          average: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }

    return summary;
  }

  getMetrics(): any {
    return this.getSummary();
  }

  getDetailedMetrics(): any {
    return {
      summary: this.getSummary(),
      raw: this.getAllMetrics()
    };
  }

  generateReport(): any {
    const summary = this.getSummary();
    this.logger.info('Performance Report:', summary);
    return summary;
  }

  clearMetrics(): void {
    for (const metric of this.metrics.keys()) {
      this.metrics.set(metric, []);
    }
    this.logger.info('All metrics cleared');
  }

  recordLatency(duration: number): void {
    this.recordMetric('latency', duration);
  }

  recordTokenUsage(tokens: number): void {
    this.recordMetric('tokenUsage', tokens);
  }

  recordMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.recordMetric('memoryUsage', memUsage.heapUsed);
    }
  }
}
