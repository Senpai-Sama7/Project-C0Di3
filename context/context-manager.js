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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextManager = exports.ContextManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const fastGlob = __importStar(require("fast-glob"));
/**
 * Context Manager - Manages project context, conversation history, and volatile state
 */
class ContextManager {
    constructor() {
        this.context = {
            projectContext: null,
            conversationHistory: [],
            volatileContext: new Map(),
        };
        this.logger = new logger_1.Logger('ContextManager');
    }
    loadProjectContext(projectPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.logger.info(`Loading project context for ${projectPath}`);
                // Validate project path exists
                if (!(yield fs.pathExists(projectPath))) {
                    throw new Error(`Project path does not exist: ${projectPath}`);
                }
                const projectContext = {
                    rootPath: projectPath,
                    files: [],
                    dependencies: new Map(),
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
                const files = yield fastGlob.default(filePatterns, {
                    cwd: projectPath,
                    ignore: ignorePatterns,
                    absolute: false,
                    stats: false
                });
                projectContext.files = files;
                this.logger.debug(`Found ${files.length} project files`);
                // Parse package.json for dependencies
                const packageJsonPath = path.join(projectPath, 'package.json');
                if (yield fs.pathExists(packageJsonPath)) {
                    try {
                        const packageJson = yield fs.readJson(packageJsonPath);
                        // Load dependencies
                        if (packageJson.dependencies) {
                            for (const [name, version] of Object.entries(packageJson.dependencies)) {
                                projectContext.dependencies.set(name, version);
                            }
                        }
                        // Load devDependencies
                        if (packageJson.devDependencies) {
                            for (const [name, version] of Object.entries(packageJson.devDependencies)) {
                                projectContext.dependencies.set(`${name} (dev)`, version);
                            }
                        }
                        this.logger.debug(`Loaded ${projectContext.dependencies.size} dependencies from package.json`);
                    }
                    catch (error) {
                        this.logger.warn('Failed to parse package.json:', error);
                    }
                }
                // Parse requirements.txt for Python dependencies
                const requirementsPath = path.join(projectPath, 'requirements.txt');
                if (yield fs.pathExists(requirementsPath)) {
                    try {
                        const requirements = yield fs.readFile(requirementsPath, 'utf-8');
                        const lines = requirements.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
                        for (const line of lines) {
                            const match = line.match(/^([a-zA-Z0-9_-]+)([>=<~!]+.*)?$/);
                            if (match) {
                                const [, name, version] = match;
                                projectContext.dependencies.set(`${name} (py)`, version || '*');
                            }
                        }
                        this.logger.debug(`Loaded ${lines.length} Python dependencies from requirements.txt`);
                    }
                    catch (error) {
                        this.logger.warn('Failed to parse requirements.txt:', error);
                    }
                }
                // Parse Cargo.toml for Rust dependencies
                const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
                if (yield fs.pathExists(cargoTomlPath)) {
                    try {
                        const cargoToml = yield fs.readFile(cargoTomlPath, 'utf-8');
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
                    }
                    catch (error) {
                        this.logger.warn('Failed to parse Cargo.toml:', error);
                    }
                }
                // Store the project context
                this.context.projectContext = projectContext;
                this.logger.info(`Project context loaded: ${projectContext.files.length} files, ${projectContext.dependencies.size} dependencies`);
                return this.context;
            }
            catch (error) {
                this.logger.error('Failed to load project context:', error);
                throw error;
            }
        });
    }
    addContextEntry(entry) {
        this.context.conversationHistory.push(entry);
    }
    getContext() {
        return this.context;
    }
    setVolatile(key, value) {
        this.context.volatileContext.set(key, value);
    }
    getVolatile(key) {
        return this.context.volatileContext.get(key);
    }
    clearContext() {
        this.context.projectContext = null;
        this.context.conversationHistory = [];
        this.context.volatileContext.clear();
    }
}
exports.ContextManager = ContextManager;
exports.contextManager = new ContextManager();
