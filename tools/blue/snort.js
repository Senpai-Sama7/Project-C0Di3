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
exports.SnortTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * SnortTool securely wraps the snort CLI for network intrusion detection.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
exports.SnortTool = {
    name: 'snort',
    description: 'Network intrusion detection and prevention system.',
    parameters: {
        config: { type: 'string', description: 'Path to Snort config file', optional: true },
        options: { type: 'string', description: 'Snort command-line options', optional: true }
    },
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { config = '/etc/snort/snort.conf', options = '' } = input;
            if (!config || typeof config !== 'string' || !/^[\w./-]+$/.test(config)) {
                throw new Error('Configuration file is required and must be a valid file path.');
            }
            if (options && !/^[\w\s\-./]*$/.test(options)) {
                throw new Error('Options contain invalid characters.');
            }
            const optionArgs = options ? options.split(' ').filter(Boolean) : [];
            const args = ['-c', config, ...optionArgs];
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('snort', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start snort: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('snort', DEFAULT_TIMEOUT_MS);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `snort exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
};
