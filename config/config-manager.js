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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class ConfigManager {
    constructor(options = {}) {
        this.config = {};
        this.defaultConfig = {};
        // System configuration protection
        this.advancedPasswordHash = null;
        this.advancedAuthenticated = false;
        this.configPath = options.configPath;
        this.defaultConfig = options.defaultConfig || {};
        // Load default config from workspace
        this.loadDefaultConfig();
        // Load user config if path provided
        if (this.configPath && fs.existsSync(this.configPath)) {
            this.loadConfig();
        }
    }
    loadDefaultConfig() {
        try {
            const workspaceConfigPath = path.join(process.cwd(), 'config', 'default.json');
            if (fs.existsSync(workspaceConfigPath)) {
                const defaultConfig = fs.readJsonSync(workspaceConfigPath);
                this.config = Object.assign({}, defaultConfig);
            }
        }
        catch (error) {
            console.warn('Could not load default config:', error);
        }
    }
    loadConfig() {
        try {
            if (this.configPath && fs.existsSync(this.configPath)) {
                const userConfig = fs.readJsonSync(this.configPath);
                this.config = Object.assign(Object.assign({}, this.config), userConfig);
            }
        }
        catch (error) {
            console.error('Error loading config:', error);
        }
    }
    get(key, defaultValue) {
        const keys = key.split('.');
        let current = this.config;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            }
            else {
                return defaultValue;
            }
        }
        return current !== undefined ? current : defaultValue;
    }
    set(key, value) {
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
    getAll() {
        return Object.assign({}, this.config);
    }
    save() {
        if (this.configPath) {
            try {
                fs.ensureDirSync(path.dirname(this.configPath));
                fs.writeJsonSync(this.configPath, this.config, { spaces: 2 });
            }
            catch (error) {
                console.error('Error saving config:', error);
            }
        }
    }
    merge(config) {
        this.config = Object.assign(Object.assign({}, this.config), config);
    }
    reset() {
        this.config = Object.assign({}, this.defaultConfig);
    }
    // User mode (safe, simulation, pro, beginner, etc.)
    getUserMode() {
        return this.get('userMode', 'safe');
    }
    setUserMode(mode) {
        this.set('userMode', mode);
    }
    // Simulation mode (true/false) - default to false for production safety
    getSimulationMode() {
        return this.get('simulationMode', false);
    }
    setSimulationMode(enabled) {
        this.set('simulationMode', enabled);
    }
    // Check if we're in training/learning mode
    isTrainingMode() {
        return this.get('trainingMode', false);
    }
    setTrainingMode(enabled) {
        this.set('trainingMode', enabled);
    }
    // Advanced mode - only accessible via environment variable
    isSenseiMode() {
        return process.env.ADVANCED_MODE === 'true' || process.env.ADVANCED_MODE === '1' ||
            process.env.SENSEI_MODE === 'true' || process.env.SENSEI_MODE === '1';
    }
    setSenseiMode(enabled) {
        // This is intentionally not persisted to config
        // Only accessible via environment variable
    }
    setSenseiPassword(password) {
        // Hash the password using a simple but effective method
        const crypto = require('crypto');
        this.advancedPasswordHash = crypto.createHash('sha256').update(password).digest('hex');
        // console.log(`Sensei password hash set (debug only, remove for prod): ${this.advancedPasswordHash}`); // For debugging
    }
    authenticateSensei(passwordToAuthenticate) {
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
    isSenseiAuthenticated() {
        return this.advancedAuthenticated;
    }
    clearSenseiAuth() {
        this.advancedAuthenticated = false;
    }
    // Per-tool permissions (allow/deny, requireApproval, simulationOnly)
    getToolPermissions(toolName) {
        return this.get(`toolPermissions.${toolName}`, { allow: true, requireApproval: false, simulationOnly: false });
    }
    setToolPermissions(toolName, permissions) {
        this.set(`toolPermissions.${toolName}`, permissions);
    }
}
exports.ConfigManager = ConfigManager;
