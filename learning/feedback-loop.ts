import { MemorySystem } from '../memory/memory-system';
import { ReasoningEngine } from '../reasoning/reasoning-engine';
import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';
import * as fs from 'fs-extra';
import * as path from 'path';
import { LLMClient } from '../types';

/**
 * Recursive learning and feedback loop system for continuous improvement
 */
export class FeedbackLoop {
  private memory: MemorySystem;
  private reasoningEngine: ReasoningEngine;
  private eventBus: EventBus;
  private logger: Logger;
  private learningHistory: LearningEntry[] = [];
  private learningRate: number;
  private persistencePath: string;
  private lastPerformanceMetrics: PerformanceMetrics = {
    successRate: 0,
    accuracy: 0,
    relevance: 0,
    efficiency: 0
  };

  constructor(options: FeedbackLoopOptions) {
    this.memory = options.memory;
    this.reasoningEngine = options.reasoningEngine;
    this.eventBus = options.eventBus || new EventBus();
    this.logger = new Logger('FeedbackLoop');
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
  private loadLearningHistory(): void {
    const historyFile = path.join(this.persistencePath, 'learning-history.json');

    try {
      if (fs.existsSync(historyFile)) {
        this.learningHistory = fs.readJsonSync(historyFile);
        this.logger.info(`Loaded ${this.learningHistory.length} learning entries from history`);
      }
    } catch (error) {
      this.logger.warn('Failed to load learning history:', error);
      this.learningHistory = [];
    }
  }

  /**
   * Save learning history to disk
   */
  private saveLearningHistory(): void {
    const historyFile = path.join(this.persistencePath, 'learning-history.json');

    try {
      fs.writeJsonSync(historyFile, this.learningHistory);
    } catch (error) {
      this.logger.warn('Failed to save learning history:', error);
    }
  }

  /**
   * Learn from an interaction
   */
  async learn(
    input: string | Record<string, any>,
    result: any,
    options: LearningOptions = {}
  ): Promise<void> {
    const inputText = typeof input === 'string' ? input : JSON.stringify(input);

    // Calculate the performance metrics for this interaction
    const metrics = await this.calculatePerformanceMetrics(inputText, result);
    this.lastPerformanceMetrics = metrics;

    // Create a learning entry
    const learningEntry: LearningEntry = {
      timestamp: Date.now(),
      input: inputText,
      resultSummary: this.summarizeResult(result),
      feedback: options.feedback,
      metrics,
      improvements: []
    };

    // Generate improvements based on the interaction
    const improvements = await this.generateImprovements(inputText, result, metrics);
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
  }

  /**
   * Learn from an error
   */
  async learnFromError(error: Error): Promise<void> {
    // Record the error in learning history
    const learningEntry: LearningEntry = {
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
  }

  /**
   * Process explicit feedback from the user
   */
  async processFeedback(feedback: FeedbackData): Promise<void> {
    this.logger.info('Processing feedback:', feedback.feedback);

    // Find the most recent learning entry
    const recentEntry = this.learningHistory[this.learningHistory.length - 1];

    if (recentEntry) {
      // Update the entry with feedback
      recentEntry.feedback = feedback.feedback;
      recentEntry.metrics = {
        ...recentEntry.metrics,
        successRate: feedback.rating / 5, // Normalize to 0-1 scale
      };

      // Generate additional improvements based on feedback
      if (feedback.feedback) {
        const improvements = await this.generateImprovementsFromFeedback(
          recentEntry.input,
          feedback.feedback
        );

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
      improvements: recentEntry?.improvements.length || 0
    });
  }

  /**
   * Handle memory updates
   */
  async onMemoryUpdate(data: any): Promise<void> {
    // This is called when memory is updated
    // We can use this to trigger learning from memory changes

    // For now, just log the event
    this.logger.debug('Memory updated:', data.interactionId);
  }

  /**
   * Summarize a result for storage
   */
  private summarizeResult(result: any): string {
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
  private async calculatePerformanceMetrics(
    input: string,
    result: any
  ): Promise<PerformanceMetrics> {
    // In a real implementation, this would use more sophisticated methods
    // to evaluate the quality of the response

    // For this example, we'll use simplified metrics
    let successRate = 1.0; // Assume success if no error
    let accuracy = 0.8;    // Default accuracy
    let relevance = 0.8;   // Default relevance
    let efficiency = 0.7;  // Default efficiency

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
      } else if (words < 20) {
        efficiency = 0.6; // Slightly penalize very short responses
      } else {
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
  }

  /**
   * Generate improvements based on the interaction
   */
  private async generateImprovements(
    input: string,
    result: any,
    metrics: PerformanceMetrics
  ): Promise<string[]> {
    // For a production implementation, this would use more sophisticated analysis
    // to identify areas for improvement

    const improvements: string[] = [];

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
  }

  /**
   * Generate improvements based on explicit feedback
   */
  private async generateImprovementsFromFeedback(
    input: string,
    feedback: string
  ): Promise<string[]> {
    // In a real implementation, this would use the LLM to analyze the feedback
    // and generate specific improvement actions

    // For this example, we'll return placeholder improvements
    return [
      'Address user feedback directly',
      'Implement specific changes mentioned in feedback'
    ];
  }

  /**
   * Get performance metrics from the learning system
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.lastPerformanceMetrics;
  }

  /**
   * Get learning insights
   */
  async getLearningInsights(): Promise<LearningInsights> {
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
    }, {} as Record<string, number>);

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
        .map(entry => entry.feedback!)
        .slice(0, 5)
    };
  }
}

export interface FeedbackLoopOptions {
  memory: MemorySystem;
  reasoningEngine: ReasoningEngine;
  eventBus?: EventBus;
  learningRate?: number;
  persistencePath?: string;
  llmClient?: LLMClient;
}

export interface LearningOptions {
  feedback?: string;
  metrics?: Partial<PerformanceMetrics>;
}

export interface LearningEntry {
  timestamp: number;
  input: string;
  resultSummary: string;
  feedback?: string;
  error?: {
    message: string;
    stack?: string;
  };
  metrics: PerformanceMetrics;
  improvements: string[];
}

export interface PerformanceMetrics {
  successRate: number;  // 0-1 scale
  accuracy: number;     // 0-1 scale
  relevance: number;    // 0-1 scale
  efficiency: number;   // 0-1 scale
}

export interface FeedbackData {
  feedback: string;
  rating: number;  // 1-5 scale
}

export interface LearningInsights {
  totalLearningEntries: number;
  averageMetrics: PerformanceMetrics;
  topImprovements: string[];
  recentFeedback: string[];
}
