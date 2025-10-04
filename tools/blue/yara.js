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
exports.YaraTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * YaraTool securely wraps the yara CLI for malware identification.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
exports.YaraTool = {
    name: 'yara',
    description: 'Malware identification and classification tool using YARA rules.',
    parameters: {
        rule: { type: 'string', description: 'Path to YARA rule file' },
        target: { type: 'string', description: 'Target file or directory' },
        options: { type: 'string', description: 'YARA command-line options', optional: true }
    },
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const { rule, target, options = '' } = input;
            if (!rule || typeof rule !== 'string' || !/^[\w./-]+$/.test(rule)) {
                throw new Error('Rule is required and must be a valid file path.');
            }
            if (!target || typeof target !== 'string' || !/^[\w./-]+$/.test(target)) {
                throw new Error('Target is required and must be a valid file or directory.');
            }
            if (options && !/^[\w\s\-./]*$/.test(options)) {
                throw new Error('Options contain invalid characters.');
            }
            const optionArgs = options ? options.split(' ').filter(Boolean) : [];
            const args = [...optionArgs, rule, target];
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('yara', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start yara: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('yara', DEFAULT_TIMEOUT_MS);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `yara exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
};
