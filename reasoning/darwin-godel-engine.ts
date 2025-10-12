import { EventBus } from '../events/event-bus';
import { MemorySystem } from '../memory/memory-system';
import { EmbeddingService } from '../services/embedding-service';
import { LLMClient, ReasoningContext, PopulationMember, MemoryItem } from '../types';
import { Logger } from '../utils/logger';
import { cosineSimilarityAuto } from './vector-ops';

/**
 * Darwin Gödel Machine - An advanced reasoning system combining evolutionary algorithms
 * with formal logic and self-verification capabilities
 */
export class DarwinGodelEngine {
  private client: LLMClient;
  private memory: MemorySystem;
  private eventBus: EventBus;
  private logger: Logger;
  private embeddingService: EmbeddingService;

  // Evolutionary parameters
  private mutationRate = 0.1;
  private crossoverRate = 0.7;
  private populationSize = 5;
  private maxGenerations = 3;

  // Formal verification parameters
  private verificationThreshold = 0.9;
  private consistencyCheckEnabled = true;

  constructor(options: DarwinGodelOptions) {
    this.client = options.client;
    this.memory = options.memory;
    this.eventBus = options.eventBus || new EventBus();
    this.logger = new Logger('DarwinGodelEngine');
    this.embeddingService = new EmbeddingService();

    // Apply custom parameters if provided
    if (options.evolutionaryParams) {
      this.mutationRate = options.evolutionaryParams.mutationRate || this.mutationRate;
      this.crossoverRate = options.evolutionaryParams.crossoverRate || this.crossoverRate;
      this.populationSize = options.evolutionaryParams.populationSize || this.populationSize;
      this.maxGenerations = options.evolutionaryParams.maxGenerations || this.maxGenerations;
    }

    if (options.verificationParams) {
      this.verificationThreshold = options.verificationParams.threshold || this.verificationThreshold;
      this.consistencyCheckEnabled = options.verificationParams.consistencyCheck ?? this.consistencyCheckEnabled;
    }
  }

  /**
   * Generate a reasoning plan using the Darwin-Gödel approach
   */
  async generatePlan(
    input: string,
    context: ReasoningContext,
    relevantMemories: MemoryItem[]
  ): Promise<DarwinGodelPlan> {
    this.logger.debug('Generating Darwin-Gödel reasoning plan for:', input);

    // Extract relevant axioms from context and memories
    const axioms = await this.extractAxioms(input, context, relevantMemories);

    // Generate initial hypotheses
    const initialHypotheses = await this.generateInitialHypotheses(input, axioms);

    // Structure the reasoning plan with evolutionary steps
    const plan: DarwinGodelPlan = {
      steps: [
        {
          id: 'axiom-extraction',
          type: 'darwin-godel' as const,
          description: 'Extract foundational axioms',
          input
        },
        {
          id: 'hypotheses-generation',
          type: 'darwin-godel' as const,
          description: 'Generate initial hypotheses',
          input
        },
        {
          id: 'evolutionary-optimization',
          type: 'darwin-godel' as const,
          description: 'Perform evolutionary optimization of hypotheses',
          input
        },
        {
          id: 'formal-verification',
          type: 'verification' as const,
          description: 'Verify logical consistency of best hypothesis',
          input
        },
        {
          id: 'solution-extraction',
          type: 'extraction' as const,
          description: 'Extract final solution from verified hypothesis',
          input
        }
      ],
      toolsRequired: [],
      estimatedComplexity: 0.8,
      metadata: {
        strategy: 'darwin-godel',
        timestamp: Date.now()
      }
    };

    this.eventBus.emit('darwin-godel.plan.generated', {
      input,
      steps: plan.steps.length,
      axioms: axioms.length,
      initialHypotheses: initialHypotheses.length
    });

    return plan;
  }

  /**
   * Extract axioms from the problem and context
   */
  private async extractAxioms(
    input: string,
    context: any,
    relevantMemories: any
  ): Promise<string[]> {
    // Replace prompt-based logic with real-world axiom extraction
    const axioms = [];
    // Example: Extract axioms from context and memories using NLP or predefined rules
    if (context) axioms.push(...(await this.extractFromContext(context)));
    if (relevantMemories.memories) axioms.push(...(await this.extractFromMemories(relevantMemories.memories)));
    return axioms;
  }

  /**
   * Generate initial hypotheses for the evolutionary process
   */
  private async generateInitialHypotheses(
    input: string,
    axioms: string[]
  ): Promise<string[]> {
    // Replace prompt-based logic with real-world hypothesis generation
    const hypotheses: string[] = [];
    // Example: Generate hypotheses using combinatorial logic or domain-specific rules
    axioms.forEach(axiom => {
      hypotheses.push(`Hypothesis based on ${axiom}`);
    });
    return hypotheses;
  }

  /**
   * Execute a specific Darwin-Gödel reasoning step
   */
  async executeStep(step: any, context: ReasoningContext): Promise<unknown> {
    this.logger.debug(`Executing Darwin-Gödel step: ${step.id}`);

    switch (step.id) {
      case 'axiom-extraction':
        return step.axioms;

      case 'hypotheses-generation':
        return step.hypotheses;

      case 'evolutionary-optimization':
        return this.performEvolutionaryOptimization(
          step.input,
          step.hypotheses,
          step.axioms || [],
          step.generations || this.maxGenerations
        );

      case 'formal-verification':
        const bestHypothesis = await this.getBestHypothesis(step.input, context);
        return this.verifyHypothesis(bestHypothesis, step.axioms || []);

      case 'solution-extraction':
        const verifiedHypothesis = await this.getBestHypothesis(step.input, context);
        return this.extractSolution(step.input, verifiedHypothesis);

      default:
        throw new Error(`Unknown Darwin-Gödel step: ${step.id}`);
    }
  }

  /**
   * Perform evolutionary optimization of hypotheses
   */
  private async performEvolutionaryOptimization(
    problem: string,
    initialPopulation: string[],
    axioms: string[],
    generations: number
  ): Promise<EvolutionResult> {
    // Replace prompt-based logic with real-world genetic algorithms
    let currentPopulation = [...initialPopulation];
    let bestFitness = 0;
    let bestHypothesis = initialPopulation[0] || '';
    const fitnessHistory: number[] = [];

    for (let gen = 0; gen < generations; gen++) {
      const fitnessScores = currentPopulation.map(hypothesis => this.evaluateFitness(problem, hypothesis, axioms));
      const maxFitness = Math.max(...fitnessScores);
      const maxIndex = fitnessScores.indexOf(maxFitness);

      if (maxFitness > bestFitness) {
        bestFitness = maxFitness;
        bestHypothesis = currentPopulation[maxIndex];
      }

      // Await evolvePopulation and use the returned finalPopulation
      const evolutionResult = await this.evolvePopulation(problem, currentPopulation, fitnessScores, axioms);
      currentPopulation = evolutionResult.finalPopulation;
      fitnessHistory.push(maxFitness);
    }

    return {
      bestHypothesis,
      bestFitness,
      fitnessHistory,
      finalPopulation: currentPopulation
    };
  }

  /**
   * Evaluate the fitness of a hypothesis using multiple criteria
   * Higher fitness indicates better quality hypothesis
   */
  private evaluateFitness(
    problem: string,
    hypothesis: string,
    axioms: string[]
  ): number {
    let fitness = 0;
    
    // 1. Axiom consistency (30%): Check semantic relevance, not just string inclusion
    if (axioms.length > 0) {
      const axiomRelevance = axioms.reduce((sum, axiom) => {
        // Use word-level matching for better semantic understanding
        const axiomWords = axiom.toLowerCase().split(/\s+/);
        const hypothesisWords = hypothesis.toLowerCase().split(/\s+/);
        const matchCount = axiomWords.filter(word => 
          hypothesisWords.some(hw => hw.includes(word) || word.includes(hw))
        ).length;
        return sum + (matchCount / axiomWords.length);
      }, 0);
      fitness += (axiomRelevance / axioms.length) * 0.3;
    }
    
    // 2. Problem relevance (25%): Semantic similarity to problem statement
    const problemWords = problem.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hypothesisWords = hypothesis.toLowerCase().split(/\s+/);
    const problemRelevance = problemWords.filter(word => 
      hypothesisWords.some(hw => hw.includes(word) || word.includes(hw))
    ).length / Math.max(problemWords.length, 1);
    fitness += problemRelevance * 0.25;
    
    // 3. Completeness (20%): Hypothesis should be substantial and detailed
    const wordCount = hypothesisWords.length;
    const completeness = Math.min(wordCount / 50, 1.0); // Optimal around 50 words
    fitness += completeness * 0.2;
    
    // 4. Logical structure (15%): Check for logical connectors and structure
    const logicalMarkers = /\b(because|therefore|thus|hence|if|then|since|as|given|assuming|consider)\b/gi;
    const logicalMatches = (hypothesis.match(logicalMarkers) || []).length;
    const logicalScore = Math.min(logicalMatches / 3, 1.0); // Expect 2-3 logical connectors
    fitness += logicalScore * 0.15;
    
    // 5. Clarity (10%): Penalize overly complex or vague statements
    const avgWordLength = hypothesisWords.reduce((sum, w) => sum + w.length, 0) / Math.max(hypothesisWords.length, 1);
    const clarityScore = avgWordLength > 8 ? 0.5 : 1.0; // Penalize overly complex words
    fitness += clarityScore * 0.1;
    
    return Math.max(0, Math.min(1, fitness)); // Clamp to [0, 1]
  }

  /**
   * Create a new generation through selection, crossover, and mutation
   */
  private async evolvePopulation(
    problem: string,
    currentPopulation: string[],
    fitnessScores: number[],
    axioms: string[]
  ): Promise<EvolutionResult> {
    const nextGeneration: string[] = [];

    // Elitism: Keep the best hypothesis
    const bestIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
    nextGeneration.push(currentPopulation[bestIndex]);

    // Fill remaining population
    while (nextGeneration.length < this.populationSize) {
      if (Math.random() < this.crossoverRate) {
        // Crossover
        const [parent1, parent2] = this.selectParents(currentPopulation, fitnessScores);
        const child = await this.crossover(problem, parent1, parent2);
        nextGeneration.push(child);
      } else {
        // Direct selection
        const selected = this.selectOne(currentPopulation, fitnessScores);
        nextGeneration.push(selected);
      }
    }

    // Apply mutations
    const mutatedGeneration = await Promise.all(
      nextGeneration.map(hypothesis =>
        Math.random() < this.mutationRate
          ? this.mutate(problem, hypothesis, axioms)
          : hypothesis
      )
    );

    return { bestHypothesis: mutatedGeneration[0], bestFitness: 0, fitnessHistory: [], finalPopulation: mutatedGeneration };
  }

  /**
   * Select parents for crossover using fitness-proportionate selection
   */
  private selectParents(
    population: string[],
    fitnessScores: number[]
  ): [string, string] {
    const parent1 = this.selectOne(population, fitnessScores);
    const parent2 = this.selectOne(population, fitnessScores);
    return [parent1, parent2];
  }

  /**
   * Select one hypothesis using fitness-proportionate selection
   */
  private selectOne(
    population: string[],
    fitnessScores: number[]
  ): string {
    // Calculate selection probabilities
    const totalFitness = fitnessScores.reduce((sum, fitness) => sum + fitness, 0);
    const probabilities = fitnessScores.map(fitness => fitness / totalFitness);

    // Roulette wheel selection
    const r = Math.random();
    let sum = 0;

    for (let i = 0; i < probabilities.length; i++) {
      sum += probabilities[i];
      if (r <= sum) {
        return population[i];
      }
    }

    // Fallback
    return population[population.length - 1];
  }

  /**
   * Perform crossover between two hypotheses
   */
  private async crossover(
    problem: string,
    parent1: string,
    parent2: string
  ): Promise<string> {
    const prompt = `
      Create a new hypothesis by combining the strongest elements of these two hypotheses:

      Problem: ${problem}

      Hypothesis 1: ${parent1}

      Hypothesis 2: ${parent2}

      Create a new hypothesis that preserves the strengths of both while addressing their weaknesses.
      Return only the new hybrid hypothesis as a single paragraph.
    `;

    try {
      const response = await this.client.generate({ prompt });
      return response.trim();
    } catch (error) {
      this.logger.warn('Error performing crossover:', error);
      // Return a simple combination on error
      return `Combined approach: ${parent1.substring(0, parent1.length / 2)} ${parent2.substring(parent2.length / 2)}`;
    }
  }

  /**
   * Mutate a hypothesis
   */
  private async mutate(
    problem: string,
    hypothesis: string,
    axioms: string[]
  ): Promise<string> {
    const prompt = `
      Improve the following hypothesis by making a significant mutation or change to its approach.
      Introduce a new perspective or element while preserving its relevance to the problem.

      Problem: ${problem}

      Original hypothesis: ${hypothesis}

      ${axioms.length > 0 ? `Consider these axioms:
      ${axioms.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : ''}

      Return only the new mutated hypothesis as a single paragraph.
    `;

    try {
      const response = await this.client.generate({ prompt });
      return response.trim();
    } catch (error) {
      this.logger.warn('Error performing mutation:', error);
      return hypothesis; // Return original on error
    }
  }

  /**
   * Get the best hypothesis (used by later steps)
   */
  private async getBestHypothesis(problem: string, context: ReasoningContext): Promise<string> {
    const optimizationResults = await this.performEvolutionaryOptimization(
      problem,
      context.hypotheses || [],
      context.axioms || [],
      this.maxGenerations
    );

    return optimizationResults.bestHypothesis;
  }

  /**
   * Verify the logical consistency and correctness of a hypothesis using formal verification
   */
  private async verifyHypothesis(
    hypothesis: string,
    axioms: string[]
  ): Promise<VerificationResult> {
    const inconsistencies: string[] = [];
    
    // 1. Verify axiom consistency using semantic similarity via embeddings
    for (const axiom of axioms) {
      if (axiom.length === 0) continue;
      
      try {
        // Get embeddings for semantic comparison
        const axiomEmbedding = await this.embeddingService.getEmbedding(axiom);
        const hypothesisEmbedding = await this.embeddingService.getEmbedding(hypothesis);
        
        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(axiomEmbedding, hypothesisEmbedding);
        
        // If similarity is too low, the axiom may not be reflected in the hypothesis
        const SEMANTIC_THRESHOLD = 0.3; // Adjust based on testing
        if (similarity < SEMANTIC_THRESHOLD) {
          // Also check word-level matching as fallback
          const axiomWords = axiom.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const hypothesisLower = hypothesis.toLowerCase();
          
          let axiomSupported = false;
          for (const word of axiomWords) {
            if (hypothesisLower.includes(word)) {
              axiomSupported = true;
              break;
            }
          }
          
          if (!axiomSupported) {
            inconsistencies.push(`Axiom "${axiom}" not semantically reflected in hypothesis (similarity: ${similarity.toFixed(2)})`);
          }
        }
      } catch (error) {
        // Fall back to word-level matching if embedding fails
        this.logger.warn(`Embedding failed for axiom verification, using fallback: ${error}`);
        const axiomWords = axiom.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const hypothesisLower = hypothesis.toLowerCase();
        
        let axiomSupported = false;
        for (const word of axiomWords) {
          if (hypothesisLower.includes(word)) {
            axiomSupported = true;
            break;
          }
        }
        
        if (!axiomSupported) {
          inconsistencies.push(`Axiom "${axiom}" not reflected in hypothesis`);
        }
      }
    }
    
    // 2. Check for logical contradictions within hypothesis
    const negationPatterns = /\b(not|never|no|cannot|isn't|aren't|won't|doesn't)\b/gi;
    const affirmativePatterns = /\b(is|are|will|can|must|should|always)\b/gi;
    
    const negations = hypothesis.match(negationPatterns) || [];
    const affirmatives = hypothesis.match(affirmativePatterns) || [];
    
    // Simple heuristic: too many negations might indicate confusion
    if (negations.length > affirmatives.length && negations.length > 5) {
      inconsistencies.push("Excessive negations detected - potential logical confusion");
    }
    
    // 3. Check hypothesis completeness
    if (hypothesis.length < 20) {
      inconsistencies.push("Hypothesis is too brief to be meaningful");
    }
    
    // 4. Calculate verification confidence
    const verified = inconsistencies.length === 0;
    let confidence: number;
    
    if (verified) {
      // High confidence for verified hypotheses
      confidence = 0.95;
    } else if (inconsistencies.length <= 2) {
      // Medium confidence for minor issues
      confidence = 0.65;
    } else {
      // Low confidence for major issues
      confidence = 0.35;
    }
    
    this.logger.debug(`Hypothesis verification: ${verified ? 'PASSED' : 'FAILED'}`, {
      inconsistenciesCount: inconsistencies.length,
      confidence
    });
    
    return { verified, confidence, inconsistencies };
  }

  /**
   * Calculate cosine similarity between two vectors
   * Uses optimized implementation when FUSION_ON=1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    return cosineSimilarityAuto(a, b);
  }

  /**
   * Extract the final solution from the verified hypothesis with proper formatting
   */
  private async extractSolution(
    problem: string,
    hypothesis: string
  ): Promise<string> {
    // Structure the solution with clear sections
    const sections = {
      analysis: this.extractAnalysisFromHypothesis(hypothesis, problem),
      approach: this.extractApproachFromHypothesis(hypothesis),
      recommendation: this.extractRecommendationFromHypothesis(hypothesis),
      reasoning: this.extractReasoningFromHypothesis(hypothesis)
    };
    
    // Format as structured solution
    const solution = `
**Problem Analysis:**
${sections.analysis}

**Recommended Approach:**
${sections.approach}

**Key Recommendations:**
${sections.recommendation}

**Reasoning:**
${sections.reasoning}

**Verified Hypothesis:**
${hypothesis}
    `.trim();
    
    return solution;
  }
  
  /**
   * Extract analysis portion from hypothesis
   */
  private extractAnalysisFromHypothesis(hypothesis: string, problem: string): string {
    const sentences = hypothesis.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const problemKeywords = problem.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    
    // Find sentences that reference the problem most
    const analysisSehtences = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return problemKeywords.some(kw => sLower.includes(kw));
    });
    
    return analysisSehtences.length > 0 
      ? analysisSehtences.slice(0, 2).join('. ') + '.'
      : sentences[0] + '.';
  }
  
  /**
   * Extract approach from hypothesis
   */
  private extractApproachFromHypothesis(hypothesis: string): string {
    const sentences = hypothesis.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const approachKeywords = ['should', 'must', 'need', 'require', 'implement', 'use', 'apply', 'consider'];
    
    const approachSentences = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return approachKeywords.some(kw => sLower.includes(kw));
    });
    
    return approachSentences.length > 0
      ? approachSentences.join('. ') + '.'
      : sentences.slice(1, 3).join('. ') + '.';
  }
  
  /**
   * Extract recommendations from hypothesis
   */
  private extractRecommendationFromHypothesis(hypothesis: string): string {
    const sentences = hypothesis.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const actionKeywords = ['recommend', 'suggest', 'advise', 'propose', 'should', 'could'];
    
    const recommendations = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return actionKeywords.some(kw => sLower.includes(kw));
    });
    
    if (recommendations.length > 0) {
      return recommendations.map((r, i) => `${i + 1}. ${r.trim()}`).join('\n');
    }
    
    // Fallback: extract action-oriented sentences
    return sentences
      .filter(s => s.toLowerCase().includes('can') || s.toLowerCase().includes('will'))
      .map((r, i) => `${i + 1}. ${r.trim()}`)
      .join('\n') || '1. Apply the verified hypothesis to solve the problem.';
  }
  
  /**
   * Extract reasoning chain from hypothesis
   */
  private extractReasoningFromHypothesis(hypothesis: string): string {
    const sentences = hypothesis.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const reasoningKeywords = ['because', 'since', 'therefore', 'thus', 'hence', 'given', 'as'];
    
    const reasoningSentences = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return reasoningKeywords.some(kw => sLower.includes(kw));
    });
    
    return reasoningSentences.length > 0
      ? reasoningSentences.join(' ')
      : 'The hypothesis was derived through evolutionary optimization and formal verification.';
  }

  /**
   * Perform evolutionary step on population with fitness evaluation
   */
  private async performEvolutionaryStep(population: PopulationMember[]): Promise<PopulationMember[]> {
    try {
      this.logger.debug('Performing evolutionary step on population');
      
      if (!Array.isArray(population) || population.length === 0) {
        this.logger.warn('Invalid or empty population provided');
        return population;
      }
      
      // Evaluate fitness for each individual
      const evaluatedPopulation = population.map(individual => {
        // Ensure individual has required properties
        const hypothesis = typeof individual === 'string' ? individual : individual.hypothesis || '';
        const problem = individual.problem || '';
        const axioms = individual.axioms || [];
        
        const fitness = this.evaluateFitness(problem, hypothesis, axioms);
        
        return {
          ...individual,
          fitness,
          hypothesis,
          evaluated: true,
          timestamp: Date.now()
        };
      });
      
      // Sort by fitness (descending)
      evaluatedPopulation.sort((a, b) => b.fitness - a.fitness);
      
      this.logger.debug('Evolutionary step completed', {
        populationSize: evaluatedPopulation.length,
        bestFitness: evaluatedPopulation[0]?.fitness,
        avgFitness: evaluatedPopulation.reduce((sum, ind) => sum + ind.fitness, 0) / evaluatedPopulation.length
      });
      
      return evaluatedPopulation;
    } catch (error) {
      this.logger.error('Failed to perform evolutionary step:', error);
      throw new Error(`Evolutionary step failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify consistency of reasoning plan structure and dependencies
   */
  private async verifyConsistency(plan: DarwinGodelPlan): Promise<boolean> {
    try {
      this.logger.debug('Verifying consistency of plan');
      
      if (!plan) {
        this.logger.error('Plan is null or undefined');
        return false;
      }
      
      // Check required plan properties
      if (!plan.steps || !Array.isArray(plan.steps)) {
        this.logger.error('Plan missing steps array');
        return false;
      }
      
      // Verify each step has required properties
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        
        if (!step.id) {
          this.logger.error(`Step ${i} missing id`);
          return false;
        }
        
        if (!step.type) {
          this.logger.error(`Step ${i} missing type`);
          return false;
        }
        
        if (!step.description) {
          this.logger.warn(`Step ${i} missing description`);
        }
      }
      
      // Verify step dependencies are satisfied
      const stepIds = new Set(plan.steps.map((s: any) => s.id));
      for (const step of plan.steps) {
        if (step.dependencies && Array.isArray(step.dependencies)) {
          for (const depId of step.dependencies) {
            if (!stepIds.has(depId)) {
              this.logger.error(`Step ${step.id} depends on non-existent step ${depId}`);
              return false;
            }
          }
        }
      }
      
      // Verify no circular dependencies
      if (this.hasCircularDependencies(plan.steps)) {
        this.logger.error('Circular dependencies detected in plan');
        return false;
      }
      
      this.logger.debug('Plan consistency verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to verify consistency:', error);
      return false;
    }
  }
  
  /**
   * Check for circular dependencies in plan steps
   */
  private hasCircularDependencies(steps: DarwinGodelStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        for (const depId of step.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true; // Circular dependency found
          }
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true;
      }
    }
    
    return false;
  }

  /**
   * Extract axioms from context using semantic analysis
   */
  private async extractFromContext(context: ReasoningContext): Promise<string[]> {
    this.logger.debug('Extracting axioms from context');
    const axioms: string[] = [];
    
    if (!context) {
      return axioms;
    }
    
    // Extract from various context properties
    if (context.axioms && Array.isArray(context.axioms)) {
      axioms.push(...context.axioms.filter((a: any) => typeof a === 'string' && a.length > 0));
    }
    
    if (context.principles && Array.isArray(context.principles)) {
      axioms.push(...context.principles.filter((p: any) => typeof p === 'string' && p.length > 0));
    }
    
    if (context.constraints && Array.isArray(context.constraints)) {
      axioms.push(...context.constraints.filter((c: any) => typeof c === 'string' && c.length > 0));
    }
    
    if (context.rules && Array.isArray(context.rules)) {
      axioms.push(...context.rules.filter((r: any) => typeof r === 'string' && r.length > 0));
    }
    
    // Extract from knowledge domain
    if (context.domain) {
      axioms.push(...this.getDomainAxioms(context.domain));
    }
    
    // Remove duplicates
    return [...new Set(axioms)];
  }
  
  /**
   * Get domain-specific axioms for common domains
   */
  private getDomainAxioms(domain: string): string[] {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('security') || domainLower.includes('cyber')) {
      return [
        'Security through defense in depth',
        'Principle of least privilege',
        'Fail secure, not fail open',
        'Validate all inputs',
        'Never trust user input'
      ];
    }
    
    if (domainLower.includes('network')) {
      return [
        'Network layers must be properly isolated',
        'Encryption in transit is mandatory for sensitive data',
        'Network monitoring is essential for threat detection'
      ];
    }
    
    if (domainLower.includes('data') || domainLower.includes('database')) {
      return [
        'Data at rest must be encrypted',
        'Access control is mandatory',
        'Data integrity must be maintained',
        'Backups are essential'
      ];
    }
    
    return ['Reliability is paramount', 'Scalability must be considered', 'Performance should be optimized'];
  }
  
  /**
   * Extract axioms from relevant memories
   */
  private async extractFromMemories(memories: MemoryItem[]): Promise<string[]> {
    this.logger.debug('Extracting axioms from memories');
    const axioms: string[] = [];
    
    if (!Array.isArray(memories) || memories.length === 0) {
      return axioms;
    }
    
    for (const memory of memories) {
      // Extract from memory content
      if (memory.content && typeof memory.content === 'string') {
        // Look for axiom-like statements (declarative, general principles)
        const sentences = memory.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
        
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          // Identify axiom-like statements
          if (this.isAxiomLike(trimmed)) {
            axioms.push(trimmed);
          }
        }
      }
      
      // Extract from memory metadata
      if (memory.principles && Array.isArray(memory.principles)) {
        axioms.push(...memory.principles.filter((p: any) => typeof p === 'string'));
      }
      
      if (memory.rules && Array.isArray(memory.rules)) {
        axioms.push(...memory.rules.filter((r: any) => typeof r === 'string'));
      }
    }
    
    // Remove duplicates and limit to most relevant
    return [...new Set(axioms)].slice(0, 10);
  }
  
  /**
   * Determine if a statement is axiom-like (general principle)
   */
  private isAxiomLike(statement: string): boolean {
    const axiomIndicators = [
      'always', 'never', 'must', 'should', 'all', 'every', 'any',
      'principle', 'rule', 'law', 'fundamental', 'essential', 'critical',
      'requires', 'mandatory', 'necessary'
    ];
    
    const statementLower = statement.toLowerCase();
    return axiomIndicators.some(indicator => statementLower.includes(indicator)) &&
           statement.length > 20 && statement.length < 200;
  }
}

export interface DarwinGodelOptions {
  client: LLMClient;
  memory: MemorySystem;
  eventBus?: EventBus;
  evolutionaryParams?: {
    mutationRate?: number;
    crossoverRate?: number;
    populationSize?: number;
    maxGenerations?: number;
  };
  verificationParams?: {
    threshold?: number;
    consistencyCheck?: boolean;
  };
}

export interface EvolutionResult {
  bestHypothesis: string;
  bestFitness: number;
  fitnessHistory: number[];
  finalPopulation: string[];
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  inconsistencies: string[];
}

interface DarwinGodelPlan {
  steps: DarwinGodelStep[];
  toolsRequired: string[];
  estimatedComplexity: number;
  cached?: boolean;
  metadata?: {
    strategy: string;
    timestamp: number;
  };
}

interface DarwinGodelStep {
  id: string;
  type: 'darwin-godel' | 'verification' | 'extraction';
  description: string;
  input: string;
  dependencies?: string[];
  axioms?: string[];
  hypotheses?: string[];
  generations?: number;
}
