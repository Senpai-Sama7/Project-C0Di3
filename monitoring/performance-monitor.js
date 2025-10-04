"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
const event_bus_1 = require("../events/event-bus");
const logger_1 = require("../utils/logger");
class PerformanceMonitor {
    constructor(options) {
        this.metrics = new Map();
        this.startTimes = new Map();
        this.operations = new Map();
        this.eventBus = options.eventBus || new event_bus_1.EventBus();
        this.logger = new logger_1.Logger('PerformanceMonitor');
        this.enableLogging = options.enableLogging || false;
        this.logToWorkspace = options.logToWorkspace;
        // Initialize metric storage
        for (const metric of options.metrics) {
            this.metrics.set(metric, []);
        }
        // Set up event listeners
        this.setupEventListeners();
    }
    setupEventListeners() {
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
    startTimer(name) {
        this.startTimes.set(name, Date.now());
    }
    stopTimer(name) {
        const startTime = this.startTimes.get(name);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.startTimes.delete(name);
            return duration;
        }
        return 0;
    }
    startRequest(requestId) {
        this.startTimer(`request.${requestId}`);
        return {
            end: (options) => {
                const duration = this.stopTimer(`request.${requestId}`);
                this.recordMetric('latency', duration);
                if (options === null || options === void 0 ? void 0 : options.error) {
                    this.logger.error(`Request ${requestId} failed after ${duration}ms`, options.error);
                }
            }
        };
    }
    endRequest(requestId) {
        const duration = this.stopTimer(`request.${requestId}`);
        this.recordMetric('latency', duration);
    }
    recordMetric(name, value) {
        if (this.metrics.has(name)) {
            const metricData = {
                value,
                timestamp: Date.now()
            };
            this.metrics.get(name).push(metricData);
            // Keep only last 1000 entries per metric
            const metricArray = this.metrics.get(name);
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
    trackToolExecution(data) {
        if (data.executionTime) {
            this.recordMetric('toolExecutionTime', data.executionTime);
        }
    }
    startOperation(name) {
        this.startTimer(name);
    }
    endOperation(name, data) {
        const duration = this.stopTimer(name);
        this.recordMetric(`${name}Duration`, duration);
        if (data === null || data === void 0 ? void 0 : data.error) {
            this.recordMetric(`${name}Errors`, 1);
        }
    }
    getMetric(name) {
        return this.metrics.get(name) || [];
    }
    getLatestMetric(name) {
        const metric = this.metrics.get(name);
        if (metric && metric.length > 0) {
            return metric[metric.length - 1];
        }
        return null;
    }
    getAverageMetric(name, windowSize = 10) {
        const metric = this.metrics.get(name);
        if (metric && metric.length > 0) {
            const window = metric.slice(-windowSize);
            const sum = window.reduce((acc, entry) => acc + entry.value, 0);
            return sum / window.length;
        }
        return 0;
    }
    getAllMetrics() {
        return new Map(this.metrics);
    }
    getSummary() {
        const summary = {};
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
    getMetrics() {
        return this.getSummary();
    }
    getDetailedMetrics() {
        return {
            summary: this.getSummary(),
            raw: this.getAllMetrics()
        };
    }
    generateReport() {
        const summary = this.getSummary();
        this.logger.info('Performance Report:', summary);
        return summary;
    }
    clearMetrics() {
        for (const metric of this.metrics.keys()) {
            this.metrics.set(metric, []);
        }
        this.logger.info('All metrics cleared');
    }
    recordLatency(duration) {
        this.recordMetric('latency', duration);
    }
    recordTokenUsage(tokens) {
        this.recordMetric('tokenUsage', tokens);
    }
    recordMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            this.recordMetric('memoryUsage', memUsage.heapUsed);
        }
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
