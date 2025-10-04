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
exports.SqlmapTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * SqlmapTool securely wraps the sqlmap CLI for SQL injection testing.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
exports.SqlmapTool = {
    name: 'sqlmap',
    description: 'Automated SQL injection and database takeover tool.',
    parameters: {
        url: { type: 'string', description: 'Target URL' },
        options: { type: 'string', description: 'sqlmap command-line options', optional: true }
    },
    execute(input, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { url, options = '' } = input;
            if (!url || typeof url !== 'string' || !/^https?:\/\/[\w\-.]+(:\d+)?(\/.*)?$/.test(url)) {
                throw new Error('URL is required and must be a valid http(s) URL.');
            }
            // Only allow safe sqlmap options (letters, dashes, numbers, spaces, dots, slashes)
            if (options && !/^[\w\s\-./]*$/.test(options)) {
                throw new Error('Options contain invalid characters.');
            }
            const optionArgs = options ? options.split(' ').filter(Boolean) : [];
            const args = ['-u', url, ...optionArgs];
            const timeoutMs = Number.isFinite(context === null || context === void 0 ? void 0 : context.timeoutMs)
                ? Math.max(1000, Number(context.timeoutMs))
                : DEFAULT_TIMEOUT_MS;
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('sqlmap', args, { timeoutMs });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start sqlmap: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('sqlmap', timeoutMs);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `sqlmap exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
};
