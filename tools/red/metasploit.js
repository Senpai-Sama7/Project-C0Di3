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
exports.MetasploitTool = void 0;
const logger_1 = require("../../utils/logger");
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 120000;
class MetasploitTool {
    constructor() {
        this.name = 'metasploit';
        this.description = 'Metasploit framework for penetration testing and exploitation';
        this.logger = new logger_1.Logger('MetasploitTool');
    }
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { target, exploit, payload, options } = input !== null && input !== void 0 ? input : {};
            // Input validation
            if (!exploit || !target || !payload) {
                this.logger.error('Missing required parameters', { exploit, target, payload });
                throw new Error('Missing required parameters: exploit, target, or payload.');
            }
            // Sanitize input to prevent command injection
            const safeExploit = String(exploit).replace(/[^\w/]/g, '');
            const safeTarget = String(target).replace(/[^\w.-]/g, '');
            const safePayload = String(payload).replace(/[^\w/]/g, '');
            // Optionally handle extra options
            let extraCmds = '';
            if (options && typeof options === 'object') {
                for (const [key, value] of Object.entries(options)) {
                    extraCmds += `; set ${String(key).replace(/[^\w.-]/g, '')} ${String(value).replace(/[^\w.-]/g, '')}`;
                }
            }
            const command = `msfconsole -q -x "use ${safeExploit}; set RHOST ${safeTarget}; set PAYLOAD ${safePayload}${extraCmds}; run; exit"`;
            this.logger.info('Executing Metasploit command', { command });
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('bash', ['-c', command], { timeoutMs: DEFAULT_TIMEOUT_MS });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start Metasploit: ${message}`);
            }
            if (result.timedOut) {
                this.logger.error('Metasploit execution timed out', { timeoutMs: DEFAULT_TIMEOUT_MS });
                throw new process_utils_1.ProcessTimeoutError('Metasploit', DEFAULT_TIMEOUT_MS);
            }
            if (result.exitCode !== 0) {
                this.logger.error('Metasploit execution error', { error: result.exitCode, stderr: result.stderr });
                throw new Error(result.stderr || `Metasploit exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
}
exports.MetasploitTool = MetasploitTool;
