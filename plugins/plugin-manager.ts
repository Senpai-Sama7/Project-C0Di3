import * as fs from 'fs';
import * as path from 'path';
import { EventBus } from '../events/event-bus';
import { ToolRegistry } from '../tools/tool-registry';
import { Logger } from '../utils/logger';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  init(registry: ToolRegistry, eventBus: EventBus): Promise<void>;
  destroy?(): Promise<void>;
}

export interface PluginManagerOptions {
  registry: ToolRegistry;
  allowedDirectories: string[];
  eventBus?: EventBus;
  autoLoad?: boolean;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private registry: ToolRegistry;
  private eventBus: EventBus;
  private logger: Logger;
  private allowedDirectories: string[];

  constructor(options: PluginManagerOptions) {
    this.registry = options.registry;
    this.eventBus = options.eventBus || new EventBus();
    this.logger = new Logger('PluginManager');
    this.allowedDirectories = options.allowedDirectories;

    if (options.autoLoad) {
      this.loadAllPlugins();
    }
  }

  async loadPlugin(pluginPath: string): Promise<boolean> {
    try {
      // Security check - ensure plugin is in allowed directory
      const isAllowed = this.allowedDirectories.some(dir =>
        path.resolve(pluginPath).startsWith(path.resolve(dir))
      );

      if (!isAllowed) {
        this.logger.warn(`Plugin not in allowed directory: ${pluginPath}`);
        return false;
      }

      const plugin = require(pluginPath);

      if (this.isValidPlugin(plugin)) {
        await plugin.init(this.registry, this.eventBus);
        this.plugins.set(plugin.name, plugin);

        this.logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
        this.eventBus.emit('plugin.loaded', { name: plugin.name, version: plugin.version });

        return true;
      } else {
        this.logger.warn(`Invalid plugin format: ${pluginPath}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      return false;
    }
  }

  async unloadPlugin(name: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(name);
      if (plugin) {
        if (plugin.destroy) {
          await plugin.destroy();
        }

        this.plugins.delete(name);
        this.logger.info(`Unloaded plugin: ${name}`);
        this.eventBus.emit('plugin.unloaded', { name });

        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to unload plugin ${name}:`, error);
      return false;
    }
  }

  private async loadAllPlugins(): Promise<void> {
    for (const directory of this.allowedDirectories) {
      if (fs.existsSync(directory)) {
        await this.loadPluginsFromDirectory(directory);
      }
    }
  }

  private async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          const pluginPath = path.join(directory, entry.name);
          await this.loadPlugin(pluginPath);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load plugins from directory ${directory}:`, error);
    }
  }

  private isValidPlugin(plugin: any): plugin is Plugin {
    return (
      plugin &&
      typeof plugin.name === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.description === 'string' &&
      typeof plugin.init === 'function'
    );
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  isPluginLoaded(name: string): boolean {
    return this.plugins.has(name);
  }

  async reloadPlugin(name: string): Promise<boolean> {
    const success = await this.unloadPlugin(name);
    if (success) {
      // Note: This is a simplified reload - in practice, you'd need to track plugin paths
      this.logger.info(`Plugin ${name} unloaded, manual reload required`);
    }
    return success;
  }

  async unloadAllPlugins(): Promise<void> {
    const pluginNames = this.getPluginNames();
    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }
  }

  async loadPlugins(): Promise<void> {
    this.loadAllPlugins();
  }

  async unloadPlugins(): Promise<void> {
    await this.unloadAllPlugins();
  }
}
