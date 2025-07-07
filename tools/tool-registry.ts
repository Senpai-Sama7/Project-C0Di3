import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';
import { OsqueryTool } from './blue/osquery';
import { SnortTool } from './blue/snort';
import { YaraTool } from './blue/yara';
import { BurpSuiteTool } from './red/burpsuite';
import { NmapTool } from './red/nmap';
import { SqlmapTool } from './red/sqlmap';

export interface Tool {
  name: string;
  description: string;
  parameters?: any;
  execute(input: any, context?: any): Promise<any>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

export class ToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.logger = new Logger('ToolRegistry');
    // Register Red/Blue team tools
    this.register(NmapTool);
    this.register(SqlmapTool);
    this.register(BurpSuiteTool);
    this.register(SnortTool);
    this.register(OsqueryTool);
    this.register(YaraTool);
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.logger.info(`Registered tool: ${tool.name}`);
    this.eventBus.emit('tool.registered', { name: tool.name, description: tool.description });
  }

  unregister(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      this.logger.info(`Unregistered tool: ${name}`);
      this.eventBus.emit('tool.unregistered', { name });
    }
    return removed;
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getTool(name: string): Tool | undefined {
    return this.get(name);
  }

  getAllTools(): Tool[] {
    return this.list();
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  listNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(name: string, input: any, context?: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      // Check for simulation/permissions in context
      if (context?.simulation || context?.permissions?.simulationOnly) {
        return {
          success: true,
          result: `[SIMULATED OUTPUT for ${name}]`,
          executionTime: 0
        };
      }
      if (context?.permissions?.requireApproval) {
        throw new Error(`Tool ${name} requires user approval.`);
      }
      if (context?.permissions?.allow === false) {
        throw new Error(`Tool ${name} is not allowed.`);
      }

      this.logger.debug(`Executing tool: ${name}`);
      this.eventBus.emit('tool.execution.start', { name, input });

      const result = await tool.execute(input, context);
      const executionTime = Date.now() - startTime;

      this.logger.debug(`Tool execution completed: ${name} (${executionTime}ms)`);
      this.eventBus.emit('tool.execution.success', { name, result, executionTime });

      return {
        success: true,
        result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Tool execution failed: ${name} - ${errorMessage}`);
      this.eventBus.emit('tool.execution.error', { name, error: errorMessage, executionTime });

      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  getToolsSchema(): any[] {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters ?? {}
    }));
  }

  clear(): void {
    const toolNames = this.listNames();
    this.tools.clear();
    this.logger.info(`Cleared ${toolNames.length} tools`);
    this.eventBus.emit('tools.cleared', { count: toolNames.length });
  }

  async loadBuiltinTools(): Promise<void> {
    // Load basic built-in tools
    const builtinTools = [
      {
        name: 'memory_search',
        description: 'Search through agent memory',
        execute: async (input: any) => {
          return { result: 'Memory search not implemented yet' };
        }
      },
      {
        name: 'context_analysis',
        description: 'Analyze current context',
        execute: async (input: any) => {
          return { result: 'Context analysis not implemented yet' };
        }
      }
    ];

    for (const tool of builtinTools) {
      this.register(tool);
    }

    this.logger.info(`Loaded ${builtinTools.length} built-in tools`);
  }
}
