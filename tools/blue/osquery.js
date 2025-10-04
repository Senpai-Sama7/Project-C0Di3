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
exports.OsqueryTool = void 0;
const process_utils_1 = require("../process-utils");
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * OsqueryTool securely wraps the osqueryi CLI for endpoint visibility.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
exports.OsqueryTool = {
    name: 'osquery',
    description: 'Endpoint visibility and monitoring tool using SQL-based queries.',
    parameters: {
        query: { type: 'string', description: 'osquery SQL query' },
        options: { type: 'string', description: 'osqueryi command-line options', optional: true }
    },
    execute(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const { query, options = '' } = input;
            if (!query || typeof query !== 'string' || /["'`;|&$><]/.test(query)) {
                throw new Error('Query is required and must not contain dangerous characters.');
            }
            if (options && !/^[\w\s\-./]*$/.test(options)) {
                throw new Error('Options contain invalid characters.');
            }
            const optionArgs = options ? options.split(' ').filter(Boolean) : [];
            const args = ['--json', query, ...optionArgs];
            let result;
            try {
                result = yield (0, process_utils_1.spawnWithTimeout)('osqueryi', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to start osqueryi: ${message}`);
            }
            if (result.timedOut) {
                throw new process_utils_1.ProcessTimeoutError('osqueryi', DEFAULT_TIMEOUT_MS);
            }
            if (result.exitCode !== 0) {
                throw new Error(result.stderr || `osqueryi exited with code ${result.exitCode}`);
            }
            const summary = result.stdout.split('\n').slice(0, 10).join('\n');
            return { summary, full: result.stdout, success: true };
        });
    }
};
