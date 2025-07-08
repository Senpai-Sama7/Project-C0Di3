import * as fs from 'fs-extra';
import * as path from 'path';

export interface ConfigOptions {
  configPath?: string;
  defaultConfig?: any;
}

export class ConfigManager {
  private config: any = {};
  private configPath?: string;
  private defaultConfig: any = {};

  constructor(options: ConfigOptions = {}) {
    this.configPath = options.configPath;
    this.defaultConfig = options.defaultConfig || {};

    // Load default config from workspace
    this.loadDefaultConfig();

    // Load user config if path provided
    if (this.configPath && fs.existsSync(this.configPath)) {
      this.loadConfig();
    }
  }

  private loadDefaultConfig(): void {
    try {
      const workspaceConfigPath = path.join(process.cwd(), 'config', 'default.json');
      if (fs.existsSync(workspaceConfigPath)) {
        const defaultConfig = fs.readJsonSync(workspaceConfigPath);
        this.config = { ...defaultConfig };
      }
    } catch (error) {
      console.warn('Could not load default config:', error);
    }
  }

  private loadConfig(): void {
    try {
      if (this.configPath && fs.existsSync(this.configPath)) {
        const userConfig = fs.readJsonSync(this.configPath);
        this.config = { ...this.config, ...userConfig };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  get(key: string, defaultValue?: any): any {
    const keys = key.split('.');
    let current = this.config;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }

    return current !== undefined ? current : defaultValue;
  }

  set(key: string, value: any): void {
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
  }

  getAll(): any {
    return { ...this.config };
  }

  save(): void {
    if (this.configPath) {
      try {
        fs.ensureDirSync(path.dirname(this.configPath));
        fs.writeJsonSync(this.configPath, this.config, { spaces: 2 });
      } catch (error) {
        console.error('Error saving config:', error);
      }
    }
  }

  merge(config: any): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    this.config = { ...this.defaultConfig };
  }

  // User mode (safe, simulation, pro, beginner, etc.)
  getUserMode(): string {
    return this.get('userMode', 'safe');
  }
  setUserMode(mode: string): void {
    this.set('userMode', mode);
  }

  // Simulation mode (true/false) - default to false for production safety
  getSimulationMode(): boolean {
    return this.get('simulationMode', false);
  }
  setSimulationMode(enabled: boolean): void {
    this.set('simulationMode', enabled);
  }

  // Check if we're in training/learning mode
  isTrainingMode(): boolean {
    return this.get('trainingMode', false);
  }
  setTrainingMode(enabled: boolean): void {
    this.set('trainingMode', enabled);
  }

  // Advanced mode - only accessible via environment variable
  isSenseiMode(): boolean {
    return process.env.ADVANCED_MODE === 'true' || process.env.ADVANCED_MODE === '1' ||
           process.env.SENSEI_MODE === 'true' || process.env.SENSEI_MODE === '1';
  }
  setSenseiMode(enabled: boolean): void {
    // This is intentionally not persisted to config
    // Only accessible via environment variable
  }

  // System configuration protection
  private advancedPasswordHash: string | null = null;
  private advancedAuthenticated: boolean = false;

  setSenseiPassword(password: string): void {
    // Hash the password using a simple but effective method
    const crypto = require('crypto');
    this.advancedPasswordHash = crypto.createHash('sha256').update(password).digest('hex');
    // console.log(`Sensei password hash set (debug only, remove for prod): ${this.advancedPasswordHash}`); // For debugging
  }

  authenticateSensei(passwordToAuthenticate: string): boolean {
    const configuredSenseiPassword = process.env.SENSEI_PASSWORD;

    if (!configuredSenseiPassword) {
      console.warn('SENSEI_PASSWORD environment variable is not set. Sensei mode authentication is not possible.');
      return false;
    }

    // If advancedPasswordHash is not set yet, set it from the env var for the first auth attempt.
    if (!this.advancedPasswordHash) {
        this.setSenseiPassword(configuredSenseiPassword);
    }

    const crypto = require('crypto');
    const inputHash = crypto.createHash('sha256').update(passwordToAuthenticate).digest('hex');

    if (inputHash === this.advancedPasswordHash) {
      this.advancedAuthenticated = true;
      console.log('Sensei mode authentication successful.');
      return true;
    }

    console.warn('Sensei mode authentication failed.');
    return false;
  }

  isSenseiAuthenticated(): boolean {
    return this.advancedAuthenticated;
  }

  clearSenseiAuth(): void {
    this.advancedAuthenticated = false;
  }

  // Per-tool permissions (allow/deny, requireApproval, simulationOnly)
  getToolPermissions(toolName: string): any {
    return this.get(`toolPermissions.${toolName}`, { allow: true, requireApproval: false, simulationOnly: false });
  }
  setToolPermissions(toolName: string, permissions: any): void {
    this.set(`toolPermissions.${toolName}`, permissions);
  }
}
