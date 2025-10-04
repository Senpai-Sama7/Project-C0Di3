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
exports.SuricataTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * SuricataTool securely wraps the Suricata CLI for network threat detection.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
class SuricataTool {
    constructor() {
        this.name = 'suricata';
        this.description = 'Suricata network threat detection engine for monitoring and alerting';
    }
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { interface: iface, rules, logFile } = input;
            if (!rules || typeof rules !== 'string' || !/^[\w./-]+$/.test(rules)) {
                throw new Error('Rules is required and must be a valid file path.');
            }
            if (!iface || typeof iface !== 'string' || !/^\w+$/.test(iface)) {
                throw new Error('Interface is required and must be a valid network interface name.');
            }
            if (!logFile || typeof logFile !== 'string' || !/^[\w./-]+$/.test(logFile)) {
                throw new Error('Log file is required and must be a valid file path.');
            }
            const args = ['-c', rules, '-i', iface, '-l', logFile];
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('suricata', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start suricata: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('suricata', DEFAULT_TIMEOUT_MS);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `suricata exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
}
exports.SuricataTool = SuricataTool;
