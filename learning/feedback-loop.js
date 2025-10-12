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
exports.FeedbackLoop = void 0;
const event_bus_1 = require("../events/event-bus");
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Recursive learning and feedback loop system for continuous improvement
 */
class FeedbackLoop {
    constructor(options) {
        this.learningHistory = [];
        this.lastPerformanceMetrics = {
            successRate: 0,
            accuracy: 0,
            relevance: 0,
            efficiency: 0
        };
        this.memory = options.memory;
        this.reasoningEngine = options.reasoningEngine;
        this.eventBus = options.eventBus || new event_bus_1.EventBus();
        this.logger = new logger_1.Logger('FeedbackLoop');
        this.learningRate = options.learningRate || 0.1;
        this.persistencePath = options.persistencePath || './data/learning';
        // Create persistence directory if it doesn't exist
        fs.ensureDirSync(this.persistencePath);
        // Load previous learning history if available
        this.loadLearningHistory();
        // Register event handlers
        this.eventBus.on('agent.feedback', this.processFeedback.bind(this));
    }
    /**
     * Load learning history from disk
     */
    loadLearningHistory() {
        const historyFile = path.join(this.persistencePath, 'learning-history.json');
        try {
            if (fs.existsSync(historyFile)) {
                this.learningHistory = fs.readJsonSync(historyFile);
                this.logger.info(`Loaded ${this.learningHistory.length} learning entries from history`);
            }
        }
        catch (error) {
            this.logger.warn('Failed to load learning history:', error);
            this.learningHistory = [];
        }
    }
    /**
     * Save learning history to disk
     */
    saveLearningHistory() {
        const historyFile = path.join(this.persistencePath, 'learning-history.json');
        try {
            fs.writeJsonSync(historyFile, this.learningHistory);
        }
        catch (error) {
            this.logger.warn('Failed to save learning history:', error);
        }
    }
    /**
     * Learn from an interaction
     */
    learn(input_1, result_1) {
        return __awaiter(this, arguments, void 0, function* (input, result, options = {}) {
            const inputText = typeof input === 'string' ? input : JSON.stringify(input);
            // Calculate the performance metrics for this interaction
            const metrics = yield this.calculatePerformanceMetrics(inputText, result);
            this.lastPerformanceMetrics = metrics;
            // Create a learning entry
            const learningEntry = {
                timestamp: Date.now(),
                input: inputText,
                resultSummary: this.summarizeResult(result),
                feedback: options.feedback,
                metrics,
                improvements: []
            };
            // Generate improvements based on the interaction
            const improvements = yield this.generateImprovements(inputText, result, metrics);
            learningEntry.improvements = improvements;
            // Store in learning history
            this.learningHistory.push(learningEntry);
            // Limit history size
            if (this.learningHistory.length > 1000) {
                this.learningHistory = this.learningHistory.slice(-1000);
            }
            // Save learning history
            this.saveLearningHistory();
            // Emit learning event
            this.eventBus.emit('learning.entry', {
                metrics,
                improvements: improvements.length
            });
            this.logger.debug(`Learned from interaction: ${inputText.substring(0, 50)}...`);
        });
    }
    /**
     * Learn from an error
     */
    learnFromError(error) {
        return __awaiter(this, void 0, void 0, function* () {
            // Record the error in learning history
            const learningEntry = {
                timestamp: Date.now(),
                input: error.message,
                resultSummary: 'Error encountered',
                error: {
                    message: error.message,
                    stack: error.stack
                },
                metrics: {
                    successRate: 0,
                    accuracy: 0,
                    relevance: 0,
                    efficiency: 0
                },
                improvements: ['Handle this error case explicitly']
            };
            // Store in learning history
            this.learningHistory.push(learningEntry);
            // Save learning history
            this.saveLearningHistory();
            // Emit error learning event
            this.eventBus.emit('learning.error', {
                error: error.message
            });
            this.logger.debug(`Learned from error: ${error.message}`);
        });
    }
    /**
     * Process explicit feedback from the user
     */
    processFeedback(feedback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('Processing feedback:', feedback.feedback);
            // Find the most recent learning entry
            const recentEntry = this.learningHistory[this.learningHistory.length - 1];
            if (recentEntry) {
                // Update the entry with feedback
                recentEntry.feedback = feedback.feedback;
                recentEntry.metrics = Object.assign(Object.assign({}, recentEntry.metrics), { successRate: feedback.rating / 5 });
                // Generate additional improvements based on feedback
                if (feedback.feedback) {
                    const improvements = yield this.generateImprovementsFromFeedback(recentEntry.input, feedback.feedback);
                    recentEntry.improvements = [
                        ...recentEntry.improvements,
                        ...improvements
                    ];
                }
                // Save updated learning history
                this.saveLearningHistory();
            }
            // Emit feedback processed event
            this.eventBus.emit('learning.feedback.processed', {
                rating: feedback.rating,
                improvements: (recentEntry === null || recentEntry === void 0 ? void 0 : recentEntry.improvements.length) || 0
            });
        });
    }
    /**
     * Handle memory updates
     */
    onMemoryUpdate(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // This is called when memory is updated
            // We can use this to trigger learning from memory changes
            // For now, just log the event
            this.logger.debug('Memory updated:', data.interactionId);
        });
    }
    /**
     * Summarize a result for storage
     */
    summarizeResult(result) {
        if (typeof result === 'string') {
            return result.length > 200 ? result.substring(0, 200) + '...' : result;
        }
        if (result.content) {
            return typeof result.content === 'string'
                ? (result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content)
                : JSON.stringify(result.content).substring(0, 200) + '...';
        }
        return JSON.stringify(result).substring(0, 200) + '...';
    }
    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics(input, result) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real implementation, this would use more sophisticated methods
            // to evaluate the quality of the response
            // For this example, we'll use simplified metrics
            let successRate = 1.0; // Assume success if no error
            let accuracy = 0.8; // Default accuracy
            let relevance = 0.8; // Default relevance
            let efficiency = 0.7; // Default efficiency
            // Check if result contains error indicators
            const resultText = typeof result === 'string'
                ? result
                : (result.content || JSON.stringify(result));
            if (resultText.includes('error') || resultText.includes('failed') || resultText.includes('unable')) {
                successRate = 0.3;
                accuracy = 0.4;
            }
            // Consider response length for efficiency
            if (typeof resultText === 'string') {
                const words = resultText.split(' ').length;
                if (words > 500) {
                    efficiency = 0.5; // Penalize very long responses
                }
                else if (words < 20) {
                    efficiency = 0.6; // Slightly penalize very short responses
                }
                else {
                    efficiency = 0.9; // Optimal length
                }
            }
            // Apply learning rate to smooth changes in metrics
            return {
                successRate: this.lastPerformanceMetrics.successRate * (1 - this.learningRate) + successRate * this.learningRate,
                accuracy: this.lastPerformanceMetrics.accuracy * (1 - this.learningRate) + accuracy * this.learningRate,
                relevance: this.lastPerformanceMetrics.relevance * (1 - this.learningRate) + relevance * this.learningRate,
                efficiency: this.lastPerformanceMetrics.efficiency * (1 - this.learningRate) + efficiency * this.learningRate
            };
        });
    }
    /**
     * Generate improvements based on the interaction
     */
    generateImprovements(input, result, metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            // For a production implementation, this would use more sophisticated analysis
            // to identify areas for improvement
            const improvements = [];
            // Add improvements based on metrics
            if (metrics.successRate < 0.7) {
                improvements.push('Improve success rate by handling more edge cases');
            }
            if (metrics.accuracy < 0.7) {
                improvements.push('Enhance accuracy by validating information before responding');
            }
            if (metrics.relevance < 0.7) {
                improvements.push('Increase relevance by focusing more on the specific query');
            }
            if (metrics.efficiency < 0.7) {
                improvements.push('Improve efficiency by providing more concise responses');
            }
            return improvements;
        });
    }
    /**
     * Generate improvements based on explicit feedback
     */
    generateImprovementsFromFeedback(input, feedback) {
        return __awaiter(this, void 0, void 0, function* () {
            const improvements = [];
            // Analyze feedback for specific improvement areas
            const feedbackLower = feedback.toLowerCase();
            // Check for accuracy concerns
            if (feedbackLower.includes('inaccurate') || feedbackLower.includes('wrong') || feedbackLower.includes('incorrect')) {
                improvements.push('Verify information accuracy before responding');
                improvements.push('Cross-reference facts with reliable sources');
            }
            // Check for completeness concerns
            if (feedbackLower.includes('incomplete') || feedbackLower.includes('missing') || feedbackLower.includes('more detail')) {
                improvements.push('Provide more comprehensive responses');
                improvements.push('Include additional relevant details');
            }
            // Check for relevance concerns
            if (feedbackLower.includes('off-topic') || feedbackLower.includes('not relevant') || feedbackLower.includes('unrelated')) {
                improvements.push('Focus more directly on the user query');
                improvements.push('Filter out tangential information');
            }
            // Check for clarity concerns
            if (feedbackLower.includes('unclear') || feedbackLower.includes('confusing') || feedbackLower.includes('hard to understand')) {
                improvements.push('Simplify explanations');
                improvements.push('Use clearer language and examples');
            }
            // Check for length concerns
            if (feedbackLower.includes('too long') || feedbackLower.includes('verbose') || feedbackLower.includes('wordy')) {
                improvements.push('Provide more concise responses');
                improvements.push('Eliminate redundant information');
            }
            if (feedbackLower.includes('too short') || feedbackLower.includes('brief') || feedbackLower.includes('need more')) {
                improvements.push('Expand on key points');
                improvements.push('Provide more context and examples');
            }
            // Check for technical concerns
            if (feedbackLower.includes('technical') || feedbackLower.includes('complex') || feedbackLower.includes('jargon')) {
                improvements.push('Adjust technical level to match user expertise');
                improvements.push('Explain technical terms when used');
            }
            // Generic improvement if no specific pattern matched
            if (improvements.length === 0) {
                improvements.push('Address user feedback directly');
                improvements.push('Review and improve response quality');
            }
            return improvements;
        });
    }
    /**
     * Get performance metrics from the learning system
     */
    getPerformanceMetrics() {
        return this.lastPerformanceMetrics;
    }
    /**
     * Get learning insights
     */
    getLearningInsights() {
        return __awaiter(this, void 0, void 0, function* () {
            // Calculate trend data
            const recentEntries = this.learningHistory.slice(-30);
            const metrics = recentEntries.map(entry => entry.metrics);
            const averageMetrics = {
                successRate: metrics.reduce((sum, m) => sum + m.successRate, 0) / Math.max(metrics.length, 1),
                accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / Math.max(metrics.length, 1),
                relevance: metrics.reduce((sum, m) => sum + m.relevance, 0) / Math.max(metrics.length, 1),
                efficiency: metrics.reduce((sum, m) => sum + m.efficiency, 0) / Math.max(metrics.length, 1)
            };
            // Compile common improvements
            const allImprovements = this.learningHistory
                .flatMap(entry => entry.improvements)
                .filter(Boolean);
            const improvementCounts = allImprovements.reduce((counts, improvement) => {
                counts[improvement] = (counts[improvement] || 0) + 1;
                return counts;
            }, {});
            const topImprovements = Object.entries(improvementCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([improvement]) => improvement);
            return {
                totalLearningEntries: this.learningHistory.length,
                averageMetrics,
                topImprovements,
                recentFeedback: recentEntries
                    .filter(entry => entry.feedback)
                    .map(entry => entry.feedback)
                    .slice(0, 5)
            };
        });
    }
}
exports.FeedbackLoop = FeedbackLoop;
