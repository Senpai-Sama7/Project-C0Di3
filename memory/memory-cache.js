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
exports.MemoryCache = void 0;
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class MemoryCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.hitCount = 0;
        this.missCount = 0;
        this.logger = new logger_1.Logger('MemoryCache');
        this.persistPath = options.persistPath || null;
        this.encryptionKey = options.encryptionKey || null;
        this.maxSize = options.maxSize || 10000;
        this.defaultTTL = (options.ttl || 3600) * 1000; // Convert to milliseconds
        if (this.persistPath && !this.encryptionKey) {
            this.logger.warn(`MemoryCache: Persistence path is set (${this.persistPath}), but no encryptionKey is provided. Cache data will be stored encrypted with a default key. For production, provide a secure encryption key.`);
        }
        if (this.persistPath) {
            this.logger.info(`MemoryCache: Persistence enabled at: ${this.persistPath}`);
        }
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const entry = this.cache.get(key);
            if (entry) {
                // Check if entry has expired
                if (entry.expiresAt && Date.now() > entry.expiresAt) {
                    this.cache.delete(key);
                    this.missCount++;
                    return null;
                }
                this.hitCount++;
                return entry.value;
            }
            this.missCount++;
            return null;
        });
    }
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            // Enforce cache size limit using LRU policy
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                // Remove oldest entry
                const firstKey = this.cache.keys().next().value;
                if (firstKey) {
                    this.cache.delete(firstKey);
                }
            }
            const expiresAt = ttl ? Date.now() + (ttl * 1000) : Date.now() + this.defaultTTL;
            this.cache.set(key, {
                value,
                expiresAt,
                createdAt: Date.now()
            });
        });
    }
    size() {
        return this.cache.size;
    }
    hitRate() {
        const total = this.hitCount + this.missCount;
        if (total === 0) {
            return 0;
        }
        return this.hitCount / total;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('MemoryCache.load() called.');
            if (!this.persistPath) {
                this.logger.info('MemoryCache.load: No persistence path configured. Nothing to load.');
                return;
            }
            try {
                if (yield fs.pathExists(this.persistPath)) {
                    this.logger.info(`Loading cache from ${this.persistPath}`);
                    let rawData = yield fs.readFile(this.persistPath, 'utf-8');
                    // Decrypt if encryption key is available
                    if (this.encryptionKey) {
                        rawData = this.decrypt(rawData);
                    }
                    const data = JSON.parse(rawData);
                    // Reconstruct cache from persisted data
                    this.cache = new Map(data.entries.map((entry) => [entry.key, {
                            value: entry.value,
                            expiresAt: entry.expiresAt,
                            createdAt: entry.createdAt
                        }]));
                    // Restore statistics
                    this.hitCount = data.hitCount || 0;
                    this.missCount = data.missCount || 0;
                    // Clean expired entries
                    const now = Date.now();
                    for (const [key, entry] of this.cache.entries()) {
                        if (entry.expiresAt && now > entry.expiresAt) {
                            this.cache.delete(key);
                        }
                    }
                    this.logger.info(`Cache loaded successfully: ${this.cache.size} entries`);
                }
                else {
                    this.logger.info('No persisted cache file found. Starting with empty cache.');
                }
            }
            catch (error) {
                this.logger.error('Failed to load cache:', error);
                this.cache = new Map();
            }
        });
    }
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('MemoryCache.persist() called.');
            if (!this.persistPath) {
                this.logger.info('MemoryCache.persist: No persistence path configured. Nothing to persist.');
                return;
            }
            try {
                // Prepare data for persistence
                const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
                    key,
                    value: entry.value,
                    expiresAt: entry.expiresAt,
                    createdAt: entry.createdAt
                }));
                const data = {
                    entries,
                    hitCount: this.hitCount,
                    missCount: this.missCount,
                    timestamp: Date.now()
                };
                let dataToPersist = JSON.stringify(data);
                // Encrypt if encryption key is available
                if (this.encryptionKey) {
                    dataToPersist = this.encrypt(dataToPersist);
                }
                // Ensure directory exists
                yield fs.ensureDir(path.dirname(this.persistPath));
                // Write to file
                yield fs.writeFile(this.persistPath, dataToPersist, 'utf-8');
                this.logger.info(`Cache persisted successfully: ${entries.length} entries`);
            }
            catch (error) {
                this.logger.error('Failed to persist cache:', error);
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
        try {
            // Derive a 32-byte key from the encryption key
            const key = crypto.scryptSync(this.encryptionKey, 'cache-salt', 32);
            // Generate a random IV
            const iv = crypto.randomBytes(16);
            // Create cipher
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            // Encrypt data
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Get auth tag
            const authTag = cipher.getAuthTag();
            // Combine IV, auth tag, and encrypted data
            return JSON.stringify({
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                data: encrypted
            });
        }
        catch (error) {
            this.logger.error('Encryption failed:', error);
            throw new Error('Failed to encrypt cache data');
        }
    }
    /**
     * Decrypt data using AES-256-GCM
     */
    decrypt(encryptedData) {
        if (!this.encryptionKey) {
            return encryptedData;
        }
        try {
            const { iv, authTag, data } = JSON.parse(encryptedData);
            // Derive the same key
            const key = crypto.scryptSync(this.encryptionKey, 'cache-salt', 32);
            // Create decipher
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
            // Set auth tag
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            // Decrypt data
            let decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            this.logger.error('Decryption failed:', error);
            throw new Error('Failed to decrypt cache data');
        }
    }
    /**
     * Clear expired entries from cache
     */
    clearExpired() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            let clearedCount = 0;
            for (const [key, entry] of this.cache.entries()) {
                if (entry.expiresAt && now > entry.expiresAt) {
                    this.cache.delete(key);
                    clearedCount++;
                }
            }
            if (clearedCount > 0) {
                this.logger.debug(`Cleared ${clearedCount} expired entries from cache`);
            }
            return clearedCount;
        });
    }
    /**
     * Clear all entries from cache
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cache.clear();
            this.hitCount = 0;
            this.missCount = 0;
            this.logger.info('Cache cleared');
        });
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: this.hitRate(),
            maxSize: this.maxSize
        };
    }
}
exports.MemoryCache = MemoryCache;
