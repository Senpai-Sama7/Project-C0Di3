/**
 * Comprehensive monitoring and metrics collection system
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

export interface MetricAggregation {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private maxMetricsPerKey: number = 1000;
  private aggregationWindow: number = 60000; // 1 minute default

  constructor(options?: { maxMetricsPerKey?: number; aggregationWindow?: number }) {
    this.maxMetricsPerKey = options?.maxMetricsPerKey || 1000;
    this.aggregationWindow = options?.aggregationWindow || 60000;
  }

  /**
   * Record a counter metric (incrementing value)
   */
  counter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'counter'
    });
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge'
    });
  }

  /**
   * Record a histogram metric (distribution of values)
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'histogram'
    });
  }

  /**
   * Time an operation and record as a timer metric
   */
  async time<T>(
    name: string,
    operation: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - start;
      this.recordMetric({
        name,
        value: duration,
        timestamp: new Date(),
        tags,
        type: 'timer'
      });
    }
  }

  /**
   * Get a timer function that can be stopped manually
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric({
        name,
        value: duration,
        timestamp: new Date(),
        tags,
        type: 'timer'
      });
    };
  }

  /**
   * Get raw metrics for a specific name
   */
  getMetrics(name: string, since?: Date): Metric[] {
    const metrics = this.metrics.get(name) || [];
    if (since) {
      return metrics.filter(m => m.timestamp >= since);
    }
    return [...metrics];
  }

  /**
   * Get aggregated statistics for a metric
   */
  getAggregation(name: string, since?: Date): MetricAggregation | null {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    const aggregation: MetricAggregation = {
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length
    };

    // Calculate percentiles for histograms and timers
    if (metrics[0].type === 'histogram' || metrics[0].type === 'timer') {
      aggregation.p50 = this.percentile(values, 50);
      aggregation.p95 = this.percentile(values, 95);
      aggregation.p99 = this.percentile(values, 99);
    }

    return aggregation;
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): Record<string, MetricAggregation> {
    const summary: Record<string, MetricAggregation> = {};
    for (const name of this.getMetricNames()) {
      const agg = this.getAggregation(name);
      if (agg) {
        summary[name] = agg;
      }
    }
    return summary;
  }

  /**
   * Clear metrics older than specified time
   */
  cleanup(olderThan: Date): void {
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp >= olderThan);
      if (filtered.length === 0) {
        this.metrics.delete(name);
      } else {
        this.metrics.set(name, filtered);
      }
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);

    // Keep only recent metrics to prevent memory leak
    if (existing.length > this.maxMetricsPerKey) {
      existing.shift();
    }

    this.metrics.set(metric.name, existing);
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
}

/**
 * Performance tracker for tracking operation performance
 */
export class PerformanceTracker {
  private metrics: MetricsCollector;
  private thresholds: Map<string, number> = new Map();
  private violations: Array<{ operation: string; duration: number; threshold: number; timestamp: Date }> = [];

  constructor(metrics?: MetricsCollector) {
    this.metrics = metrics || new MetricsCollector();
  }

  /**
   * Set performance threshold for an operation
   */
  setThreshold(operation: string, durationMs: number): void {
    this.thresholds.set(operation, durationMs);
  }

  /**
   * Track an operation and check against threshold
   */
  async track<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      this.metrics.histogram(`operation.${operation}`, duration, context);

      // Check threshold
      const threshold = this.thresholds.get(operation);
      if (threshold && duration > threshold) {
        this.violations.push({
          operation,
          duration,
          threshold,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Get performance violations
   */
  getViolations(since?: Date): typeof this.violations {
    if (since) {
      return this.violations.filter(v => v.timestamp >= since);
    }
    return [...this.violations];
  }

  /**
   * Get metrics collector
   */
  getMetrics(): MetricsCollector {
    return this.metrics;
  }
}

/**
 * System-wide metrics singleton
 */
class SystemMetrics {
  private static instance: MetricsCollector;

  static getInstance(): MetricsCollector {
    if (!SystemMetrics.instance) {
      SystemMetrics.instance = new MetricsCollector();
      
      // Auto cleanup every 5 minutes
      setInterval(() => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        SystemMetrics.instance.cleanup(fiveMinutesAgo);
      }, 60000);
    }
    return SystemMetrics.instance;
  }
}

export const metrics = SystemMetrics.getInstance();

/**
 * Example usage:
 * 
 * // Record metrics
 * metrics.counter('requests.total', 1, { endpoint: '/api/chat' });
 * metrics.gauge('memory.heap_used', process.memoryUsage().heapUsed);
 * 
 * // Time an operation
 * await metrics.time('llm.complete', async () => {
 *   return await llmService.complete(prompt);
 * }, { model: 'gemma' });
 * 
 * // Manual timer
 * const stopTimer = metrics.startTimer('operation.process');
 * // ... do work ...
 * stopTimer();
 * 
 * // Get aggregations
 * const stats = metrics.getAggregation('llm.complete');
 * console.log(`LLM avg response time: ${stats?.avg}ms`);
 * console.log(`LLM p95 response time: ${stats?.p95}ms`);
 */
