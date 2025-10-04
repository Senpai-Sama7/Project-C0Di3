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
exports.PluginManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const event_bus_1 = require("../events/event-bus");
const logger_1 = require("../utils/logger");
class PluginManager {
    constructor(options) {
        this.plugins = new Map();
        this.registry = options.registry;
        this.eventBus = options.eventBus || new event_bus_1.EventBus();
        this.logger = new logger_1.Logger('PluginManager');
        this.allowedDirectories = options.allowedDirectories;
        if (options.autoLoad) {
            this.loadAllPlugins();
        }
    }
    loadPlugin(pluginPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Security check - ensure plugin is in allowed directory
                const isAllowed = this.allowedDirectories.some(dir => path.resolve(pluginPath).startsWith(path.resolve(dir)));
                if (!isAllowed) {
                    this.logger.warn(`Plugin not in allowed directory: ${pluginPath}`);
                    return false;
                }
                const plugin = require(pluginPath);
                if (this.isValidPlugin(plugin)) {
                    yield plugin.init(this.registry, this.eventBus);
                    this.plugins.set(plugin.name, plugin);
                    this.logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
                    this.eventBus.emit('plugin.loaded', { name: plugin.name, version: plugin.version });
                    return true;
                }
                else {
                    this.logger.warn(`Invalid plugin format: ${pluginPath}`);
                    return false;
                }
            }
            catch (error) {
                this.logger.error(`Failed to load plugin from ${pluginPath}:`, error);
                return false;
            }
        });
    }
    unloadPlugin(name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const plugin = this.plugins.get(name);
                if (plugin) {
                    if (plugin.destroy) {
                        yield plugin.destroy();
                    }
                    this.plugins.delete(name);
                    this.logger.info(`Unloaded plugin: ${name}`);
                    this.eventBus.emit('plugin.unloaded', { name });
                    return true;
                }
                return false;
            }
            catch (error) {
                this.logger.error(`Failed to unload plugin ${name}:`, error);
                return false;
            }
        });
    }
    loadAllPlugins() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const directory of this.allowedDirectories) {
                if (fs.existsSync(directory)) {
                    yield this.loadPluginsFromDirectory(directory);
                }
            }
        });
    }
    loadPluginsFromDirectory(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const entries = fs.readdirSync(directory, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
                        const pluginPath = path.join(directory, entry.name);
                        yield this.loadPlugin(pluginPath);
                    }
                }
            }
            catch (error) {
                this.logger.error(`Failed to load plugins from directory ${directory}:`, error);
            }
        });
    }
    isValidPlugin(plugin) {
        return (plugin &&
            typeof plugin.name === 'string' &&
            typeof plugin.version === 'string' &&
            typeof plugin.description === 'string' &&
            typeof plugin.init === 'function');
    }
    getPlugin(name) {
        return this.plugins.get(name);
    }
    listPlugins() {
        return Array.from(this.plugins.values());
    }
    getPluginNames() {
        return Array.from(this.plugins.keys());
    }
    isPluginLoaded(name) {
        return this.plugins.has(name);
    }
    reloadPlugin(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const success = yield this.unloadPlugin(name);
            if (success) {
                // Note: This is a simplified reload - in practice, you'd need to track plugin paths
                this.logger.info(`Plugin ${name} unloaded, manual reload required`);
            }
            return success;
        });
    }
    unloadAllPlugins() {
        return __awaiter(this, void 0, void 0, function* () {
            const pluginNames = this.getPluginNames();
            for (const name of pluginNames) {
                yield this.unloadPlugin(name);
            }
        });
    }
    loadPlugins() {
        return __awaiter(this, void 0, void 0, function* () {
            this.loadAllPlugins();
        });
    }
    unloadPlugins() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.unloadAllPlugins();
        });
    }
}
exports.PluginManager = PluginManager;
