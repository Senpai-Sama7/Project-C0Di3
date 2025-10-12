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
exports.EpisodicMemory = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class EpisodicMemory {
    constructor(options) {
        this.events = [];
        this.encryptionKey = null;
        if (options === null || options === void 0 ? void 0 : options.encryptionKey) {
            this.encryptionKey = options.encryptionKey;
        }
    }
    add(item) {
        return __awaiter(this, void 0, void 0, function* () {
            this.events.push(item);
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.find(event => event.key === key) || null;
        });
    }
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events;
        });
    }
    find(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.filter(event => (event.content && typeof event.content === 'object' && !Array.isArray(event.content)
                ? Object.values(event.content)
                : []).some(value => typeof value === 'string' && value.includes(query)));
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events = [];
        });
    }
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.events = this.events.filter(event => event.key !== key);
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.events.length;
        });
    }
    update(key, newItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.events.findIndex(event => event.key === key);
            if (index !== -1) {
                this.events[index] = newItem;
            }
            else {
                throw new Error(`Item with key ${key} not found.`);
            }
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
                    this.events = data.events || [];
                    console.log(`EpisodicMemory loaded from ${filePath}: ${this.events.length} events`);
                }
                else {
                    console.log(`EpisodicMemory: No persistence file found at ${filePath}. Starting fresh.`);
                }
            }
            catch (error) {
                console.error(`EpisodicMemory: Failed to load from ${filePath}:`, error);
                this.events = [];
            }
        });
    }
    persist(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = { events: this.events, timestamp: Date.now() };
                let dataToPersist = JSON.stringify(data, null, 2);
                // Encrypt if encryption key is available
                if (this.encryptionKey) {
                    dataToPersist = this.encrypt(dataToPersist);
                }
                // Ensure directory exists
                yield fs.ensureDir(path.dirname(filePath));
                // Write to file
                yield fs.writeFile(filePath, dataToPersist, 'utf-8');
                console.log(`EpisodicMemory persisted to ${filePath}: ${this.events.length} events`);
            }
            catch (error) {
                console.error(`EpisodicMemory: Failed to persist to ${filePath}:`, error);
            }
        });
    }
    /**
     * Encrypt data using AES-256-GCM
     */
    encrypt(data) {
        if (!this.encryptionKey) {
            return data;
        }
        const key = crypto.scryptSync(this.encryptionKey, 'episodic-salt', 32);
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
        const key = crypto.scryptSync(this.encryptionKey, 'episodic-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.EpisodicMemory = EpisodicMemory;
