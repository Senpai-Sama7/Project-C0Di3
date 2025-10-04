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
exports.BurpSuiteTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * BurpSuiteTool securely wraps the Burp Suite CLI for web vulnerability scanning.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
exports.BurpSuiteTool = {
    name: 'burpsuite',
    description: 'Web vulnerability scanner and proxy (Burp Suite CLI integration).',
    parameters: {
        target: { type: 'string', description: 'Target URL or host' },
        options: { type: 'string', description: 'Burp Suite CLI options', optional: true }
    },
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { target, options = '' } = input;
            if (!target || typeof target !== 'string' || !/^[\w.:-]+$/.test(target)) {
                throw new Error('Target is required and must be a valid host or URL.');
            }
            if (options && !/^[\w\s\-./]*$/.test(options)) {
                throw new Error('Options contain invalid characters.');
            }
            const optionArgs = options ? options.split(' ').filter(Boolean) : [];
            const args = [...optionArgs, '--target', target];
            const timeoutMs = Number.isFinite(context === null || context === void 0 ? void 0 : context.timeoutMs)
                ? Math.max(1000, Number(context.timeoutMs))
                : DEFAULT_TIMEOUT_MS;
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('burpsuite', args, { timeoutMs });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start burpsuite: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('burpsuite', timeoutMs);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `burpsuite exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
};
