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
exports.AuditService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class AuditService {
    constructor(logDir, eventBus, encryptionKey) {
        this.logFilePath = path_1.default.join(logDir, 'audit.log');
        this.eventBus = eventBus;
        this.encryptionKey = Buffer.from(encryptionKey, 'hex');
        fs_extra_1.default.ensureFileSync(this.logFilePath);
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.eventBus.on('tool.execution.start', (data) => {
            this.log({
                level: 'info',
                actor: { type: 'agent' },
                action: {
                    type: 'tool.execution.start',
                    details: {
                        tool: data.name,
                        input: data.input,
                    },
                },
                result: 'pending',
            });
        });
        this.eventBus.on('tool.execution.success', (data) => {
            this.log({
                level: 'info',
                actor: { type: 'agent' },
                action: {
                    type: 'tool.execution.success',
                    details: {
                        tool: data.name,
                        output: data.output,
                    },
                },
                result: 'success',
            });
        });
        this.eventBus.on('tool.execution.error', (data) => {
            this.log({
                level: 'error',
                actor: { type: 'agent' },
                action: {
                    type: 'tool.execution.error',
                    details: {
                        tool: data.name,
                        input: data.input,
                    },
                },
                result: 'failure',
                errorMessage: data.error.message,
            });
        });
    }
    encrypt(text) {
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]).toString('hex');
    }
    decrypt(encryptedText) {
        const data = Buffer.from(encryptedText, 'hex');
        const iv = data.slice(0, 16);
        const authTag = data.slice(16, 32);
        const encrypted = data.slice(32);
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    }
    log(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const logEntry = Object.assign({ timestamp: new Date().toISOString() }, entry);
            const logLine = JSON.stringify(logEntry);
            const encryptedLogLine = this.encrypt(logLine) + '\n';
            yield fs_extra_1.default.appendFile(this.logFilePath, encryptedLogLine);
        });
    }
    queryLogs(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            const logContent = yield fs_extra_1.default.readFile(this.logFilePath, 'utf-8');
            if (!logContent) {
                return [];
            }
            const lines = logContent.trim().split('\n');
            const allLogs = lines.map(line => JSON.parse(this.decrypt(line)));
            if (Object.keys(filter).length === 0) {
                return allLogs;
            }
            return allLogs.filter(log => {
                return Object.entries(filter).every(([key, value]) => {
                    return log[key] === value;
                });
            });
        });
    }
}
exports.AuditService = AuditService;
