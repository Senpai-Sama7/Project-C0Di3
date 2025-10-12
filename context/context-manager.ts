import { AgentContext, ContextEntry, ProjectContext } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../utils/logger';
import * as fastGlob from 'fast-glob';

/**
 * Context Manager - Manages project context, conversation history, and volatile state
 */
export class ContextManager {
  private context: AgentContext = {
    projectContext: null,
    conversationHistory: [],
    volatileContext: new Map<string, any>(),
  };
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ContextManager');
  }

  public async loadProjectContext(projectPath: string): Promise<AgentContext> {
    try {
      this.logger.info(`Loading project context for ${projectPath}`);
      
      // Validate project path exists
      if (!await fs.pathExists(projectPath)) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      const projectContext: ProjectContext = {
        rootPath: projectPath,
        files: [],
        dependencies: new Map<string, string>(),
      };

      // Scan for project files (excluding node_modules, .git, etc.)
      const filePatterns = [
        '**/*.ts',
        '**/*.js',
        '**/*.json',
        '**/*.md',
        '**/*.yaml',
        '**/*.yml'
      ];

      const ignorePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**'
      ];

      this.logger.debug('Scanning project files...');
      const files = await fastGlob.default(filePatterns, {
        cwd: projectPath,
        ignore: ignorePatterns,
        absolute: false,
        stats: false
      });

      projectContext.files = files;
      this.logger.debug(`Found ${files.length} project files`);

      // Parse package.json for dependencies
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageJson = await fs.readJson(packageJsonPath);
          
          // Load dependencies
          if (packageJson.dependencies) {
            for (const [name, version] of Object.entries(packageJson.dependencies)) {
              projectContext.dependencies.set(name, version as string);
            }
          }
          
          // Load devDependencies
          if (packageJson.devDependencies) {
            for (const [name, version] of Object.entries(packageJson.devDependencies)) {
              projectContext.dependencies.set(`${name} (dev)`, version as string);
            }
          }
          
          this.logger.debug(`Loaded ${projectContext.dependencies.size} dependencies from package.json`);
        } catch (error) {
          this.logger.warn('Failed to parse package.json:', error);
        }
      }

      // Parse requirements.txt for Python dependencies
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await fs.pathExists(requirementsPath)) {
        try {
          const requirements = await fs.readFile(requirementsPath, 'utf-8');
          const lines = requirements.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
          
          for (const line of lines) {
            const match = line.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
            if (match) {
              const [, name, version] = match;
              projectContext.dependencies.set(`${name} (py)`, version || '*');
            }
          }
          
          this.logger.debug(`Loaded ${lines.length} Python dependencies from requirements.txt`);
        } catch (error) {
          this.logger.warn('Failed to parse requirements.txt:', error);
        }
      }

      // Parse Cargo.toml for Rust dependencies
      const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
      if (await fs.pathExists(cargoTomlPath)) {
        try {
          const cargoToml = await fs.readFile(cargoTomlPath, 'utf-8');
          const depSection = cargoToml.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
          
          if (depSection) {
            const lines = depSection[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
            for (const line of lines) {
              const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
              if (match) {
                const [, name, version] = match;
                projectContext.dependencies.set(`${name} (rust)`, version);
              }
            }
          }
          
          this.logger.debug(`Loaded Rust dependencies from Cargo.toml`);
        } catch (error) {
          this.logger.warn('Failed to parse Cargo.toml:', error);
        }
      }

      // Store the project context
      this.context.projectContext = projectContext;
      
      this.logger.info(`Project context loaded: ${projectContext.files.length} files, ${projectContext.dependencies.size} dependencies`);
      return this.context;
    } catch (error) {
      this.logger.error('Failed to load project context:', error);
      throw error;
    }
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
