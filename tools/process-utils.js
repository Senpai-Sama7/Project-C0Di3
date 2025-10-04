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
exports.ProcessTimeoutError = void 0;
exports.spawnWithTimeout = spawnWithTimeout;
const child_process_1 = require("child_process");
class ProcessTimeoutError extends Error {
    constructor(command, timeoutMs) {
        super(`${command} timed out after ${timeoutMs}ms`);
        this.name = 'ProcessTimeoutError';
    }
}
exports.ProcessTimeoutError = ProcessTimeoutError;
function spawnWithTimeout(command, args, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var _a, _b;
            const child = (0, child_process_1.spawn)(command, args, {
                cwd: options.cwd,
                env: options.env,
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let settled = false;
            let timedOut = false;
            let forceKillHandle;
            let timeoutHandle;
            const clearTimers = () => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                if (forceKillHandle) {
                    clearTimeout(forceKillHandle);
                }
            };
            const finish = (exitCode, signal) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimers();
                resolve({ stdout, stderr, exitCode, signal, timedOut });
            };
            (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', chunk => {
                stdout += chunk.toString();
            });
            (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', chunk => {
                stderr += chunk.toString();
            });
            child.on('error', error => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimers();
                reject(error);
            });
            child.on('close', (code, signal) => {
                finish(code, signal);
            });
            if (Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    var _a, _b;
                    if (settled) {
                        return;
                    }
                    timedOut = true;
                    child.kill((_a = options.killSignal) !== null && _a !== void 0 ? _a : 'SIGTERM');
                    forceKillHandle = setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, (_b = options.killGracePeriodMs) !== null && _b !== void 0 ? _b : 5000);
                }, options.timeoutMs);
            }
        });
    });
}
