// import { Agent, Crew, Task } from '@donovan/crewai-typescript';
// CrewAI integration is currently disabled due to missing dependency.
// You can re-enable this integration by installing the required package and uncommenting the code below.

// export class CrewAIManager {
//   // ... implementation ...
// }

// import { ConfigManager } from '../config/config-manager';
// import { EventBus } from '../events/event-bus';
// import { Logger } from '../utils/logger';

/**
 * Integration with CrewAI for multi-agent collaboration
 */
// export class CrewAIManager {
//   private eventBus: EventBus;
//   private configManager: ConfigManager;
//   private logger: Logger;
//   private crews: Map<string, Crew> = new Map();
//   private agents: Map<string, Agent> = new Map();
//   private tasks: Map<string, Task> = new Map();
//   private initialized = false;
//
//   constructor(options: any) {
//     this.eventBus = options.eventBus;
//     this.configManager = options.configManager;
//     this.logger = new Logger('CrewAIManager');
//   }
//
//   /**
//    * Initialize the CrewAI manager
//    */
//   async initialize(): Promise<void> {
//     if (this.initialized) {
//       return;
//     }
//
//     this.logger.info('Initializing CrewAI integration...');
//
//     try {
//       // Optionally load agent configurations
//       const agentConfigs = this.configManager.get('crewai.agents', {});
//       for (const [agentName, config] of Object.entries(agentConfigs)) {
//         const agentConfig = config as any;
//         const agent = new Agent({
//           role: agentConfig.role,
//           goal: agentConfig.goal,
//           backstory: agentConfig.backstory,
//           tools: agentConfig.tools || []
//         });
//         this.agents.set(agentName, agent);
//       }
//
//       // Optionally load task configurations
//       const taskConfigs = this.configManager.get('crewai.tasks', {});
//       for (const [taskName, config] of Object.entries(taskConfigs)) {
//         const taskConfig = config as any;
//         const task = new Task({
//           name: taskName,
//           description: taskConfig.description,
//           expectedOutput: taskConfig.expectedOutput,
//           tools: taskConfig.tools || []
//         });
//         this.tasks.set(taskName, task);
//       }
//
//       // Optionally load crew configurations
//       const crewConfigs = this.configManager.get('crewai.crews', {});
//       for (const [crewName, config] of Object.entries(crewConfigs)) {
//         const crewConfig = config as any;
//         const agents = (crewConfig.agents || []).map((agentName: string) => {
//           const agent = this.agents.get(agentName);
//           if (!agent) throw new Error(`Agent not found: ${agentName}`);
//           return agent;
//         });
//         const tasks = (crewConfig.tasks || []).map((taskName: string) => {
//           const task = this.tasks.get(taskName);
//           if (!task) throw new Error(`Task not found: ${taskName}`);
//           return task;
//         });
//         const crew = new Crew({
//           name: crewConfig.name || crewName,
//           agents,
//           tasks,
//           process: crewConfig.process || 'sequential'
//         });
//         this.crews.set(crewName, crew);
//       }
//
//       this.initialized = true;
//       this.logger.info('CrewAI integration initialized successfully');
//       this.eventBus.emit('crewai.initialized', { status: 'success' });
//     } catch (error) {
//       this.logger.error('Failed to initialize CrewAI manager:', error);
//       this.eventBus.emit('crewai.initialized', {
//         status: 'error',
//         error: (error as Error).message
//       });
//       throw error;
//     }
//   }
//
//   /**
//    * Run a predefined crew
//    */
//   async runCrew(crewName: string, input?: any): Promise<any> {
//     if (!this.initialized) {
//       await this.initialize();
//     }
//     const crew = this.crews.get(crewName);
//     if (!crew) throw new Error(`Crew not found: ${crewName}`);
//     return crew.kickoff(input);
//   }
// }
//
// export interface CrewAIManagerOptions {
//   configManager: ConfigManager;
//   eventBus?: EventBus;
// }
