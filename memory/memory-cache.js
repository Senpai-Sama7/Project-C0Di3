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
exports.MemoryCache = void 0;
const logger_1 = require("../utils/logger"); // For logging
class MemoryCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.hitCount = 0;
        this.missCount = 0;
        this.logger = new logger_1.Logger('MemoryCache');
        this.persistPath = options.persistPath || null;
        this.encryptionKey = options.encryptionKey || null;
        if (this.persistPath && !this.encryptionKey) {
            this.logger.warn(`MemoryCache: Persistence path is set (${this.persistPath}), but no encryptionKey is provided. If implemented, cache data would be stored in plaintext. This is NOT secure for sensitive data.`);
        }
        if (this.persistPath) {
            this.logger.info(`MemoryCache: Persistence path configured to: ${this.persistPath}. Load/persist methods are currently stubs.`);
        }
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const value = this.cache.get(key);
            if (value) {
                this.hitCount++;
                return value;
            }
            this.missCount++;
            return null;
        });
    }
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cache.set(key, value);
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
            if (this.persistPath) {
                this.logger.info(`Persistence path is configured: ${this.persistPath}. Actual loading logic is not implemented.`);
                // TODO: Implement actual file reading from this.persistPath
                // TODO: If reading file, implement decryption using this.encryptionKey if it's set.
                // Example:
                // if (fs.existsSync(this.persistPath)) {
                //   let rawData = await fs.readFile(this.persistPath, 'utf-8');
                //   if (this.encryptionKey) { rawData = this.decrypt(rawData); } // Assuming decrypt method
                //   this.cache = new Map(JSON.parse(rawData));
                //   this.logger.info('Cache data would be loaded and decrypted here.');
                // } else {
                //   this.logger.info('No persisted cache file found.');
                // }
                if (!this.encryptionKey) {
                    this.logger.warn('MemoryCache.load: If data were loaded, it would be in plaintext as no encryptionKey is set.');
                }
            }
            else {
                this.logger.info('MemoryCache.load: No persistence path configured. Nothing to load.');
            }
        });
    }
    persist() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('MemoryCache.persist() called.');
            if (this.persistPath) {
                this.logger.info(`Persistence path is configured: ${this.persistPath}. Actual persisting logic is not implemented.`);
                // TODO: Implement actual file writing to this.persistPath
                // TODO: Implement encryption using this.encryptionKey if it's set before writing.
                // Example:
                // let dataToPersist = JSON.stringify(Array.from(this.cache.entries()));
                // if (this.encryptionKey) { dataToPersist = this.encrypt(dataToPersist); } // Assuming encrypt method
                // await fs.ensureDir(path.dirname(this.persistPath));
                // await fs.writeFile(this.persistPath, dataToPersist, 'utf-8');
                // this.logger.info('Cache data would be encrypted and persisted here.');
                if (!this.encryptionKey) {
                    this.logger.warn('MemoryCache.persist: If data were persisted, it would be in plaintext as no encryptionKey is set.');
                }
            }
            else {
                this.logger.info('MemoryCache.persist: No persistence path configured. Nothing to persist.');
            }
        });
    }
}
exports.MemoryCache = MemoryCache;
