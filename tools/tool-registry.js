"use strict";
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
exports.ToolRegistry = void 0;
const event_bus_1 = require("../events/event-bus");
const logger_1 = require("../utils/logger");
const osquery_1 = require("./blue/osquery");
const snort_1 = require("./blue/snort");
const yara_1 = require("./blue/yara");
const burpsuite_1 = require("./red/burpsuite");
const nmap_1 = require("./red/nmap");
const sqlmap_1 = require("./red/sqlmap");
class ToolRegistry {
    constructor(eventBus) {
        this.tools = new Map();
        this.eventBus = eventBus || new event_bus_1.EventBus();
        this.logger = new logger_1.Logger('ToolRegistry');
        // Register Red/Blue team tools
        this.register(nmap_1.NmapTool);
        this.register(sqlmap_1.SqlmapTool);
        this.register(burpsuite_1.BurpSuiteTool);
        this.register(snort_1.SnortTool);
        this.register(osquery_1.OsqueryTool);
        this.register(yara_1.YaraTool);
    }
    register(tool) {
        this.tools.set(tool.name, tool);
        this.logger.info(`Registered tool: ${tool.name}`);
        this.eventBus.emit('tool.registered', { name: tool.name, description: tool.description });
    }
    unregister(name) {
        const removed = this.tools.delete(name);
        if (removed) {
            this.logger.info(`Unregistered tool: ${name}`);
            this.eventBus.emit('tool.unregistered', { name });
        }
        return removed;
    }
    get(name) {
        return this.tools.get(name);
    }
    getTool(name) {
        return this.get(name);
    }
    getAllTools() {
        return this.list();
    }
    has(name) {
        return this.tools.has(name);
    }
    list() {
        return Array.from(this.tools.values());
    }
    listNames() {
        return Array.from(this.tools.keys());
    }
    execute(name, input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const startTime = Date.now();
            try {
                const tool = this.tools.get(name);
                if (!tool) {
                    throw new Error(`Tool not found: ${name}`);
                }
                // Check for simulation/permissions in context
                if ((context === null || context === void 0 ? void 0 : context.simulation) || ((_a = context === null || context === void 0 ? void 0 : context.permissions) === null || _a === void 0 ? void 0 : _a.simulationOnly)) {
                    return {
                        success: true,
                        result: `[SIMULATED OUTPUT for ${name}]`,
                        executionTime: 0
                    };
                }
                if ((_b = context === null || context === void 0 ? void 0 : context.permissions) === null || _b === void 0 ? void 0 : _b.requireApproval) {
                    throw new Error(`Tool ${name} requires user approval.`);
                }
                if (((_c = context === null || context === void 0 ? void 0 : context.permissions) === null || _c === void 0 ? void 0 : _c.allow) === false) {
                    throw new Error(`Tool ${name} is not allowed.`);
                }
                this.logger.debug(`Executing tool: ${name}`);
                this.eventBus.emit('tool.execution.start', { name, input });
                const result = yield tool.execute(input, context);
                const executionTime = Date.now() - startTime;
                this.logger.debug(`Tool execution completed: ${name} (${executionTime}ms)`);
                this.eventBus.emit('tool.execution.success', { name, result, executionTime });
                return {
                    success: true,
                    result,
                    executionTime
                };
            }
            catch (error) {
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
        });
    }
    getToolsSchema() {
        return this.list().map(tool => {
            var _a;
            return ({
                name: tool.name,
                description: tool.description,
                parameters: (_a = tool.parameters) !== null && _a !== void 0 ? _a : {}
            });
        });
    }
    clear() {
        const toolNames = this.listNames();
        this.tools.clear();
        this.logger.info(`Cleared ${toolNames.length} tools`);
        this.eventBus.emit('tools.cleared', { count: toolNames.length });
    }
    loadBuiltinTools() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load basic built-in tools
            const builtinTools = [
                {
                    name: 'memory_search',
                    description: 'Search through agent memory',
                    execute: (input) => __awaiter(this, void 0, void 0, function* () {
                        return { result: 'Memory search not implemented yet' };
                    })
                },
                {
                    name: 'context_analysis',
                    description: 'Analyze current context',
                    execute: (input) => __awaiter(this, void 0, void 0, function* () {
                        return { result: 'Context analysis not implemented yet' };
                    })
                }
            ];
            for (const tool of builtinTools) {
                this.register(tool);
            }
            this.logger.info(`Loaded ${builtinTools.length} built-in tools`);
        });
    }
}
exports.ToolRegistry = ToolRegistry;
