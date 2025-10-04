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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WazuhTool = void 0;
const axios_1 = __importDefault(require("axios"));
class WazuhTool {
    constructor() {
        this.name = 'wazuh';
        this.description = 'Wazuh security information and event management (SIEM) platform';
    }
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { action, agent, rule, logType, timeRange } = input;
            if (!action || !agent || !rule)
                throw new Error('Action, agent, and rule are required');
            const apiUrl = (_a = process.env.WAZUH_API_URL) !== null && _a !== void 0 ? _a : 'http://localhost:55000';
            const endpoint = `${apiUrl}/${action}`;
            const payload = { agent, rule, logType, timeRange };
            try {
                const response = yield axios_1.default.post(endpoint, payload);
                console.info('Wazuh API execution success:', response.data);
                return {
                    summary: JSON.stringify(response.data, null, 2).slice(0, 500),
                    full: response.data,
                    success: true
                };
            }
            catch (error) {
                console.error('Wazuh API execution error:', error.message);
                throw new Error(`Wazuh API error: ${error.message}`);
            }
        });
    }
}
exports.WazuhTool = WazuhTool;
