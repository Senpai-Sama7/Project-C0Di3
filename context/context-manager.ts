import { AgentContext, ContextEntry, ProjectContext } from '../types';

export class ContextManager {
  private context: AgentContext = {
    projectContext: null,
    conversationHistory: [],
    volatileContext: new Map<string, any>(),
  };

  public async loadProjectContext(projectPath: string): Promise<AgentContext> {
    // In a real implementation, this would involve scanning the project,
    // parsing configuration files, and understanding the project structure.
    // For now, we'll simulate it with a placeholder.
    const projectContext: ProjectContext = {
      rootPath: projectPath,
      files: [], // This would be populated by a file scan
      dependencies: new Map<string, string>(), // Populated from package.json, etc.
    };
    this.context.projectContext = projectContext;
    console.log(`Project context loaded for ${projectPath}`);
    return this.context;
  }

  public addContextEntry(entry: ContextEntry): void {
    this.context.conversationHistory.push(entry);
  }

  public getContext(): AgentContext {
    return this.context;
  }

  public setVolatile(key: string, value: any): void {
    this.context.volatileContext.set(key, value);
  }

  public getVolatile<T>(key: string): T | undefined {
    return this.context.volatileContext.get(key) as T | undefined;
  }

  public clearContext(): void {
    this.context.projectContext = null;
    this.context.conversationHistory = [];
    this.context.volatileContext.clear();
  }
}

export const contextManager = new ContextManager();
