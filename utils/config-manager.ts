/**
 * Centralized Configuration Management System
 * Provides type-safe configuration with validation, environment profiles, and hot reloading
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: any;
    validator?: (value: any) => boolean;
    description?: string;
  };
}

export interface ConfigOptions {
  env?: string; // Environment profile (development, staging, production)
  configDir?: string; // Directory containing config files
  validateOnLoad?: boolean; // Validate config on load (default: true)
  watchForChanges?: boolean; // Enable hot reloading (default: false)
}

export class ConfigManager extends EventEmitter {
  private config: Map<string, any> = new Map();
  private schema?: ConfigSchema;
  private options: Required<ConfigOptions>;
  private fileWatcher?: fs.FSWatcher;

  constructor(options: ConfigOptions = {}) {
    super();
    
    this.options = {
      env: options.env || process.env.NODE_ENV || 'development',
      configDir: options.configDir || path.join(process.cwd(), 'config'),
      validateOnLoad: options.validateOnLoad ?? true,
      watchForChanges: options.watchForChanges ?? false
    };
  }

  /**
   * Define configuration schema for validation
   */
  defineSchema(schema: ConfigSchema): this {
    this.schema = schema;
    return this;
  }

  /**
   * Load configuration from files and environment variables
   */
  async load(): Promise<void> {
    // Load base config
    await this.loadFromFile('default.json');
    
    // Load environment-specific config
    await this.loadFromFile(`${this.options.env}.json`);
    
    // Override with environment variables
    this.loadFromEnvironment();
    
    // Validate if schema is defined
    if (this.options.validateOnLoad && this.schema) {
      this.validate();
    }

    // Apply defaults for missing required values
    this.applyDefaults();

    // Setup file watcher if enabled
    if (this.options.watchForChanges) {
      this.setupFileWatcher();
    }

    this.emit('loaded');
  }

  /**
   * Get a configuration value
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    const value = this.config.get(key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a configuration value
   */
  set(key: string, value: any): void {
    const oldValue = this.config.get(key);
    this.config.set(key, value);
    
    if (oldValue !== value) {
      this.emit('changed', { key, oldValue, newValue: value });
    }
  }

  /**
   * Check if a configuration key exists
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Get all configuration as object
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of this.config.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get configuration for a specific namespace
   */
  getNamespace(namespace: string): Record<string, any> {
    const result: Record<string, any> = {};
    const prefix = `${namespace}.`;
    
    for (const [key, value] of this.config.entries()) {
      if (key.startsWith(prefix)) {
        const subKey = key.substring(prefix.length);
        result[subKey] = value;
      }
    }
    
    return result;
  }

  /**
   * Validate configuration against schema
   */
  validate(): void {
    if (!this.schema) {
      return;
    }

    const errors: string[] = [];

    for (const [key, rules] of Object.entries(this.schema)) {
      const value = this.config.get(key);

      // Check required
      if (rules.required && value === undefined) {
        errors.push(`Required configuration missing: ${key}`);
        continue;
      }

      // Skip validation if value is undefined and not required
      if (value === undefined) {
        continue;
      }

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(
          `Invalid type for ${key}: expected ${rules.type}, got ${actualType}`
        );
        continue;
      }

      // Run custom validator
      if (rules.validator && !rules.validator(value)) {
        errors.push(`Validation failed for ${key}: ${value}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Apply default values from schema
   */
  private applyDefaults(): void {
    if (!this.schema) {
      return;
    }

    for (const [key, rules] of Object.entries(this.schema)) {
      if (!this.config.has(key) && rules.default !== undefined) {
        this.config.set(key, rules.default);
      }
    }
  }

  /**
   * Load configuration from a JSON file
   */
  private async loadFromFile(filename: string): Promise<void> {
    const filepath = path.join(this.options.configDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return; // File doesn't exist, skip
    }

    try {
      const content = await fs.promises.readFile(filepath, 'utf8');
      const data = JSON.parse(content);
      
      // Flatten nested objects with dot notation
      this.flattenAndSet(data);
    } catch (error) {
      throw new Error(`Failed to load config from ${filepath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): void {
    const prefix = 'APP_';
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key
          .substring(prefix.length)
          .toLowerCase()
          .replace(/_/g, '.');
        
        // Try to parse as JSON, fall back to string
        try {
          this.config.set(configKey, JSON.parse(value!));
        } catch {
          this.config.set(configKey, value);
        }
      }
    }
  }

  /**
   * Flatten nested objects and set in config map
   */
  private flattenAndSet(obj: any, prefix: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenAndSet(value, fullKey);
      } else {
        this.config.set(fullKey, value);
      }
    }
  }

  /**
   * Setup file watcher for hot reloading
   */
  private setupFileWatcher(): void {
    if (!fs.existsSync(this.options.configDir)) {
      return;
    }

    this.fileWatcher = fs.watch(
      this.options.configDir,
      { recursive: false },
      async (eventType, filename) => {
        if (!filename || !filename.endsWith('.json')) {
          return;
        }

        console.log(`Config file changed: ${filename}, reloading...`);
        
        try {
          await this.load();
          this.emit('reloaded');
        } catch (error) {
          console.error('Failed to reload config:', error);
          this.emit('error', error);
        }
      }
    );
  }

  /**
   * Stop watching for changes
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    this.removeAllListeners();
  }
}

/**
 * Global configuration singleton
 */
let globalConfig: ConfigManager | null = null;

export function getGlobalConfig(): ConfigManager {
  if (!globalConfig) {
    globalConfig = new ConfigManager();
  }
  return globalConfig;
}

export function setGlobalConfig(config: ConfigManager): void {
  globalConfig = config;
}

/**
 * Example usage:
 * 
 * // Define schema
 * const config = new ConfigManager({ env: 'production' });
 * 
 * config.defineSchema({
 *   'llm.apiUrl': {
 *     type: 'string',
 *     required: true,
 *     description: 'LLM API endpoint URL'
 *   },
 *   'llm.timeout': {
 *     type: 'number',
 *     default: 15000,
 *     validator: (v) => v > 0 && v < 60000
 *   },
 *   'memory.encryptionKey': {
 *     type: 'string',
 *     required: true,
 *     validator: (v) => v.length >= 32
 *   },
 *   'auth.jwtSecret': {
 *     type: 'string',
 *     required: true,
 *     validator: (v) => v.length >= 32
 *   }
 * });
 * 
 * // Load configuration
 * await config.load();
 * 
 * // Access configuration
 * const apiUrl = config.get<string>('llm.apiUrl');
 * const timeout = config.get<number>('llm.timeout', 15000);
 * 
 * // Get namespace
 * const llmConfig = config.getNamespace('llm');
 * 
 * // Listen for changes
 * config.on('changed', ({ key, oldValue, newValue }) => {
 *   console.log(`Config changed: ${key} = ${newValue}`);
 * });
 * 
 * // Environment variable override:
 * // APP_LLM_API_URL=http://localhost:8000 npm start
 */
