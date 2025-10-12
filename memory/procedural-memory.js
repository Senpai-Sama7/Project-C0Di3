"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.ProceduralMemory = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class ProceduralMemory {
    constructor(options) {
        this.procedures = new Map();
        this.encryptionKey = null;
        if (options === null || options === void 0 ? void 0 : options.encryptionKey) {
            this.encryptionKey = options.encryptionKey;
        }
    }
    add(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof item.content !== 'function') {
                throw new Error('Procedural memory can only store functions.');
            }
            this.procedures.set(item.key, item.content);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const procedure = this.procedures.get(key);
            return procedure ? { key, content: procedure } : null;
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.procedures.entries()).map(([key, content]) => ({ key, content }));
        });
    }
    find(query) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find procedures by key/name
            const results = [];
            for (const [key, content] of this.procedures.entries()) {
                if (key.includes(query)) {
                    results.push({ key, content });
                }
            }
            return results;
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.procedures.clear();
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.procedures.delete(key);
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.procedures.size;
        });
    }
    update(key, newProcedure) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.procedures.has(key)) {
                throw new Error(`Procedure with key ${key} not found.`);
            }
            this.procedures.set(key, newProcedure);
        });
    }
    load(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (yield fs.pathExists(filePath)) {
                    let rawData = yield fs.readFile(filePath, 'utf-8');
                    // Decrypt if encryption key is available
                    if (this.encryptionKey) {
                        rawData = this.decrypt(rawData);
                    }
                    const data = JSON.parse(rawData);
                    // Reconstruct procedures from stored function definitions
                    if (data.procedures) {
                        for (const [key, procDef] of Object.entries(data.procedures)) {
                            try {
                                // Reconstruct function from stored code and parameters
                                // Using Function constructor with proper parameter handling
                                const func = new Function(...procDef.params, procDef.body);
                                this.procedures.set(key, func);
                            }
                            catch (error) {
                                console.error(`Failed to reconstruct procedure ${key}:`, error);
                            }
                        }
                    }
                    console.log(`ProceduralMemory loaded from ${filePath}: ${this.procedures.size} procedures`);
                }
                else {
                    console.log(`ProceduralMemory: No persistence file found at ${filePath}. Starting fresh.`);
                }
            }
            catch (error) {
                console.error(`ProceduralMemory: Failed to load from ${filePath}:`, error);
                this.procedures = new Map();
            }
        });
    }
    persist(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const serializableProcedures = {};
                // Serialize each function
                for (const [key, func] of this.procedures.entries()) {
                    try {
                        const funcStr = func.toString();
                        // Parse function to extract parameters and body
                        // Handle both arrow functions and regular functions
                        const parsed = this.parseFunctionDefinition(funcStr);
                        serializableProcedures[key] = {
                            params: parsed.params,
                            body: parsed.body,
                            originalCode: funcStr,
                            metadata: {
                                name: func.name || key,
                                length: func.length,
                                timestamp: Date.now()
                            }
                        };
                    }
                    catch (error) {
                        console.error(`Failed to serialize procedure ${key}:`, error);
                    }
                }
                const data = {
                    procedures: serializableProcedures,
                    timestamp: Date.now(),
                    count: Object.keys(serializableProcedures).length
                };
                let dataToPersist = JSON.stringify(data, null, 2);
                // Encrypt if encryption key is available
                if (this.encryptionKey) {
                    dataToPersist = this.encrypt(dataToPersist);
                }
                // Ensure directory exists
                yield fs.ensureDir(path.dirname(filePath));
                // Write to file
                yield fs.writeFile(filePath, dataToPersist, 'utf-8');
                console.log(`ProceduralMemory persisted to ${filePath}: ${Object.keys(serializableProcedures).length} procedures`);
            }
            catch (error) {
                console.error(`ProceduralMemory: Failed to persist to ${filePath}:`, error);
            }
        });
    }
    /**
     * Parse function definition to extract parameters and body
     */
    parseFunctionDefinition(funcStr) {
        // Remove leading/trailing whitespace
        funcStr = funcStr.trim();
        // Handle arrow functions
        if (funcStr.includes('=>')) {
            const arrowIndex = funcStr.indexOf('=>');
            let paramsPart = funcStr.substring(0, arrowIndex).trim();
            let bodyPart = funcStr.substring(arrowIndex + 2).trim();
            // Extract parameters
            paramsPart = paramsPart.replace(/^\(|\)$/g, '').trim();
            const params = paramsPart ? paramsPart.split(',').map(p => p.trim()) : [];
            // Handle implicit return (no braces)
            if (!bodyPart.startsWith('{')) {
                bodyPart = `return ${bodyPart}`;
            }
            else {
                // Remove outer braces
                bodyPart = bodyPart.replace(/^\{|\}$/g, '').trim();
            }
            return { params, body: bodyPart };
        }
        // Handle regular functions
        const funcMatch = funcStr.match(/function\s*\w*\s*\((.*?)\)\s*\{([\s\S]*)\}/);
        if (funcMatch) {
            const params = funcMatch[1] ? funcMatch[1].split(',').map(p => p.trim()) : [];
            const body = funcMatch[2].trim();
            return { params, body };
        }
        // Fallback: treat entire function as body with no params
        return { params: [], body: funcStr };
    }
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data) {
        if (!this.encryptionKey) {
            return data;
        }
        const key = crypto.scryptSync(this.encryptionKey, 'procedural-salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            data: encrypted
        });
    }
    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encryptedData) {
        if (!this.encryptionKey) {
            return encryptedData;
        }
        const { iv, authTag, data } = JSON.parse(encryptedData);
        const key = crypto.scryptSync(this.encryptionKey, 'procedural-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.ProceduralMemory = ProceduralMemory;
