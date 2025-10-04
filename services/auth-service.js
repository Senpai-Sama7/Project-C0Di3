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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.UserRole = void 0;
const logger_1 = require("../utils/logger");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["SECURITY_ANALYST"] = "security_analyst";
    UserRole["RED_TEAM"] = "red_team";
    UserRole["BLUE_TEAM"] = "blue_team";
    UserRole["READ_ONLY"] = "read_only";
    UserRole["GUEST"] = "guest";
})(UserRole || (exports.UserRole = UserRole = {}));
class AuthService {
    constructor(eventBus, config) {
        this.users = new Map();
        this.sessions = new Map();
        this.auditLogs = [];
        this.legacyCredentialWarnings = new Set();
        this.eventBus = eventBus;
        this.logger = new logger_1.Logger('AuthService');
        this.config = config;
        // Initialize file paths
        this.auditLogFile = path.join(process.cwd(), 'data', 'logs', 'audit.log');
        this.usersFile = path.join(process.cwd(), 'data', 'auth', 'users.json');
        this.sessionsFile = path.join(process.cwd(), 'data', 'auth', 'sessions.json');
        // Ensure directories exist
        this.ensureDirectories();
        // Load existing data
        this.loadUsers();
        this.loadSessions();
        // Start periodic cleanup
        this.startPeriodicCleanup();
        this.logger.info('AuthService initialized');
    }
    /**
     * Authenticate user with username/password
     */
    authenticate(username, password, ipAddress, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            const sessionId = this.generateSessionId();
            try {
                // Check if user exists
                const user = this.findUserByUsername(username);
                if (!user) {
                    yield this.logAuditEvent({
                        userId: 'unknown',
                        username,
                        action: 'LOGIN_ATTEMPT',
                        resource: 'auth',
                        details: { reason: 'user_not_found' },
                        ipAddress,
                        userAgent,
                        sessionId,
                        success: false,
                        errorMessage: 'User not found',
                        duration: Date.now() - startTime
                    });
                    return { success: false, error: 'Invalid credentials' };
                }
                // Check if account is locked
                if (user.lockedUntil && user.lockedUntil > new Date()) {
                    yield this.logAuditEvent({
                        userId: user.id,
                        username: user.username,
                        action: 'LOGIN_ATTEMPT',
                        resource: 'auth',
                        details: { reason: 'account_locked' },
                        ipAddress,
                        userAgent,
                        sessionId,
                        success: false,
                        errorMessage: 'Account locked',
                        duration: Date.now() - startTime
                    });
                    return { success: false, error: 'Account is locked' };
                }
                // Verify password
                const isValidPassword = yield this.verifyPassword(password, user);
                if (!isValidPassword) {
                    // Increment failed attempts
                    user.failedLoginAttempts++;
                    // Lock account if max attempts exceeded
                    if (user.failedLoginAttempts >= this.config.maxFailedAttempts) {
                        user.lockedUntil = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000);
                        this.logger.warn(`Account locked for user: ${username}`);
                    }
                    this.saveUsers();
                    yield this.logAuditEvent({
                        userId: user.id,
                        username: user.username,
                        action: 'LOGIN_ATTEMPT',
                        resource: 'auth',
                        details: { reason: 'invalid_password', failedAttempts: user.failedLoginAttempts },
                        ipAddress,
                        userAgent,
                        sessionId,
                        success: false,
                        errorMessage: 'Invalid password',
                        duration: Date.now() - startTime
                    });
                    return { success: false, error: 'Invalid credentials' };
                }
                // Reset failed attempts on successful login
                user.failedLoginAttempts = 0;
                user.lastLogin = new Date();
                user.lockedUntil = undefined;
                this.saveUsers();
                // Create session
                const session = this.createSession(user, ipAddress, userAgent);
                const token = this.generateJWT(session);
                yield this.logAuditEvent({
                    userId: user.id,
                    username: user.username,
                    action: 'LOGIN_SUCCESS',
                    resource: 'auth',
                    details: { sessionId: session.id },
                    ipAddress,
                    userAgent,
                    sessionId: session.id,
                    success: true,
                    duration: Date.now() - startTime
                });
                return {
                    success: true,
                    token,
                    session: this.cloneSession(session),
                    user: this.toPublicUser(user)
                };
            }
            catch (error) {
                this.logger.error('Authentication error', error);
                const message = error instanceof Error ? error.message : String(error);
                yield this.logAuditEvent({
                    userId: 'unknown',
                    username,
                    action: 'LOGIN_ERROR',
                    resource: 'auth',
                    details: { error: message },
                    ipAddress,
                    userAgent,
                    sessionId,
                    success: false,
                    errorMessage: message,
                    duration: Date.now() - startTime
                });
                return { success: false, error: 'Authentication failed' };
            }
        });
    }
    /**
     * Verify JWT token and return session
     */
    verifyToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = this.verifyJWT(token);
                const session = this.sessions.get(decoded.sessionId);
                if (!session || !session.isActive) {
                    return { valid: false, error: 'Invalid or expired session' };
                }
                // Check session timeout
                const sessionAge = Date.now() - session.lastActivity.getTime();
                if (sessionAge > this.config.sessionTimeout * 60 * 1000) {
                    session.isActive = false;
                    this.saveSessions();
                    return { valid: false, error: 'Session expired' };
                }
                // Update last activity
                session.lastActivity = new Date();
                this.saveSessions();
                const user = this.users.get(session.userId);
                return {
                    valid: true,
                    session: this.cloneSession(session),
                    user: user ? this.toPublicUser(user) : undefined
                };
            }
            catch (error) {
                if (error instanceof jsonwebtoken_1.TokenExpiredError) {
                    return { valid: false, error: 'Token expired' };
                }
                if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
                    return { valid: false, error: 'Invalid token signature' };
                }
                return { valid: false, error: 'Invalid token' };
            }
        });
    }
    /**
     * Check if user has permission for specific action
     */
    checkPermission(userId, resource, action, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.users.get(userId);
            if (!user || !user.isActive) {
                return false;
            }
            const session = this.findSessionByUserId(userId);
            if (!session || !session.isActive) {
                return false;
            }
            // Check user permissions
            const hasPermission = user.permissions.some(permission => {
                if (permission.resource !== resource || permission.action !== action) {
                    return false;
                }
                // Check conditions if specified
                if (permission.conditions && conditions) {
                    return this.evaluateConditions(permission.conditions, conditions);
                }
                return true;
            });
            // Log permission check
            yield this.logAuditEvent({
                userId,
                username: user.username,
                action: 'PERMISSION_CHECK',
                resource,
                details: { action, conditions, granted: hasPermission },
                sessionId: session.id,
                success: hasPermission,
                duration: 0
            });
            return hasPermission;
        });
    }
    /**
     * Logout user and invalidate session
     */
    logout(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = this.verifyJWT(token);
                const session = this.sessions.get(decoded.sessionId);
                if (session) {
                    session.isActive = false;
                    this.saveSessions();
                    yield this.logAuditEvent({
                        userId: session.userId,
                        username: session.username,
                        action: 'LOGOUT',
                        resource: 'auth',
                        details: { sessionId: session.id },
                        sessionId: session.id,
                        success: true,
                        duration: 0
                    });
                }
                return { success: true };
            }
            catch (error) {
                return { success: false, error: 'Invalid token' };
            }
        });
    }
    /**
     * Create new user
     */
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (userData.password.length < this.config.passwordMinLength) {
                throw new Error(`Password must be at least ${this.config.passwordMinLength} characters long`);
            }
            const { password } = userData, rest = __rest(userData, ["password"]);
            const userId = this.generateUserId();
            const { hash, salt } = this.hashPassword(password);
            const user = Object.assign(Object.assign({}, rest), { id: userId, createdAt: new Date(), lastLogin: new Date(), failedLoginAttempts: 0, isActive: true, passwordHash: hash, passwordSalt: salt });
            this.users.set(userId, user);
            this.saveUsers();
            yield this.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'USER_CREATED',
                resource: 'auth',
                details: { newUserId: userId, username: user.username, role: user.role },
                sessionId: 'system',
                success: true,
                duration: 0
            });
            return this.toPublicUser(user);
        });
    }
    /**
     * Update user
     */
    updateUser(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.users.get(userId);
            if (!user) {
                return null;
            }
            const { password } = updates, userUpdates = __rest(updates, ["password"]);
            const updatedUser = Object.assign(Object.assign({}, user), userUpdates);
            if (password) {
                if (password.length < this.config.passwordMinLength) {
                    throw new Error(`Password must be at least ${this.config.passwordMinLength} characters long`);
                }
                const { hash, salt } = this.hashPassword(password);
                updatedUser.passwordHash = hash;
                updatedUser.passwordSalt = salt;
            }
            this.users.set(userId, updatedUser);
            this.saveUsers();
            yield this.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'USER_UPDATED',
                resource: 'auth',
                details: { userId, updates },
                sessionId: 'system',
                success: true,
                duration: 0
            });
            return this.toPublicUser(updatedUser);
        });
    }
    /**
     * Delete user
     */
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.users.get(userId);
            if (!user) {
                return false;
            }
            // Invalidate all sessions for this user
            for (const session of this.sessions.values()) {
                if (session.userId === userId) {
                    session.isActive = false;
                }
            }
            this.users.delete(userId);
            this.saveUsers();
            this.saveSessions();
            yield this.logAuditEvent({
                userId: 'system',
                username: 'system',
                action: 'USER_DELETED',
                resource: 'auth',
                details: { deletedUserId: userId, username: user.username },
                sessionId: 'system',
                success: true,
                duration: 0
            });
            return true;
        });
    }
    /**
     * Get audit logs with filtering
     */
    getAuditLogs(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            let logs = [...this.auditLogs];
            if (filters) {
                if (filters.userId) {
                    logs = logs.filter(log => log.userId === filters.userId);
                }
                if (filters.action) {
                    logs = logs.filter(log => log.action === filters.action);
                }
                if (filters.resource) {
                    logs = logs.filter(log => log.resource === filters.resource);
                }
                if (filters.startDate) {
                    logs = logs.filter(log => log.timestamp >= filters.startDate);
                }
                if (filters.endDate) {
                    logs = logs.filter(log => log.timestamp <= filters.endDate);
                }
                if (filters.success !== undefined) {
                    logs = logs.filter(log => log.success === filters.success);
                }
            }
            // Sort by timestamp (newest first)
            logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            // Apply limit
            if (filters === null || filters === void 0 ? void 0 : filters.limit) {
                logs = logs.slice(0, filters.limit);
            }
            return logs;
        });
    }
    /**
     * Get active sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(session => session.isActive);
    }
    /**
     * Force logout all sessions for a user
     */
    forceLogoutUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let logoutCount = 0;
            for (const session of this.sessions.values()) {
                if (session.userId === userId && session.isActive) {
                    session.isActive = false;
                    logoutCount++;
                }
            }
            if (logoutCount > 0) {
                this.saveSessions();
                yield this.logAuditEvent({
                    userId: 'system',
                    username: 'system',
                    action: 'FORCE_LOGOUT',
                    resource: 'auth',
                    details: { targetUserId: userId, sessionsLoggedOut: logoutCount },
                    sessionId: 'system',
                    success: true,
                    duration: 0
                });
            }
            return logoutCount;
        });
    }
    // Private helper methods
    ensureDirectories() {
        const dirs = [
            path.dirname(this.auditLogFile),
            path.dirname(this.usersFile),
            path.dirname(this.sessionsFile)
        ];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    loadUsers() {
        var _a;
        let migrationPerformed = false;
        try {
            if (fs.existsSync(this.usersFile)) {
                const data = fs.readFileSync(this.usersFile, 'utf8');
                const usersData = JSON.parse(data);
                for (const userData of usersData) {
                    let user = Object.assign(Object.assign({}, userData), { createdAt: new Date(userData.createdAt), lastLogin: new Date(userData.lastLogin), lockedUntil: userData.lockedUntil ? new Date(userData.lockedUntil) : undefined, failedLoginAttempts: (_a = userData.failedLoginAttempts) !== null && _a !== void 0 ? _a : 0 });
                    if (!user.passwordHash || !user.passwordSalt) {
                        const migrated = this.migrateLegacyUserCredentials(user, userData);
                        if (migrated) {
                            user = migrated.user;
                            migrationPerformed = migrationPerformed || migrated.persist;
                        }
                        else {
                            throw new Error(`User ${user.username} is missing password credentials. Please reset their password.`);
                        }
                    }
                    this.users.set(user.id, user);
                }
            }
            else {
                // Create default admin user
                this.createDefaultUsers();
            }
        }
        catch (error) {
            this.logger.error('Failed to load users', error);
            throw error;
        }
        if (migrationPerformed) {
            this.logger.warn('Legacy user credentials migrated. Prompt users to rotate passwords immediately.');
            this.saveUsers();
        }
    }
    migrateLegacyUserCredentials(user, rawUser) {
        const resolution = this.resolveLegacyPassword(rawUser);
        if (!resolution) {
            return null;
        }
        const { password, source } = resolution;
        const _a = user, { password: _legacyPassword } = _a, rest = __rest(_a, ["password"]);
        const { hash, salt } = this.hashPassword(password);
        const migratedUser = Object.assign(Object.assign({}, rest), { passwordHash: hash, passwordSalt: salt, failedLoginAttempts: 0 });
        const warningKey = user.username || user.id;
        if (warningKey && !this.legacyCredentialWarnings.has(warningKey)) {
            this.legacyCredentialWarnings.add(warningKey);
            this.logger.warn(`Migrated legacy credentials for user ${user.username}. Source=${source}. Force a password reset immediately.`);
        }
        return { user: migratedUser, persist: true };
    }
    resolveLegacyPassword(rawUser) {
        const username = typeof rawUser.username === 'string' ? rawUser.username : undefined;
        if (username) {
            const envKey = `LEGACY_PASSWORD_${username.toUpperCase()}`;
            const envPassword = process.env[envKey];
            if (envPassword && envPassword.length >= this.config.passwordMinLength) {
                return { password: envPassword, source: `env:${envKey}` };
            }
        }
        if (typeof rawUser.password === 'string' && rawUser.password.length >= this.config.passwordMinLength) {
            return { password: rawUser.password, source: 'stored-plaintext' };
        }
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (username === 'admin' && adminPassword && adminPassword.length >= this.config.passwordMinLength) {
            return { password: adminPassword, source: 'env:ADMIN_PASSWORD' };
        }
        return null;
    }
    createDefaultUsers() {
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            throw new Error('ADMIN_PASSWORD environment variable must be set to initialize default admin user');
        }
        if (adminPassword.length < this.config.passwordMinLength) {
            throw new Error(`ADMIN_PASSWORD must be at least ${this.config.passwordMinLength} characters long`);
        }
        const { hash, salt } = this.hashPassword(adminPassword);
        const adminUser = {
            id: 'admin',
            username: 'admin',
            role: UserRole.ADMIN,
            permissions: [
                { resource: '*', action: '*' }
            ],
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
            failedLoginAttempts: 0,
            passwordHash: hash,
            passwordSalt: salt
        };
        this.users.set('admin', adminUser);
        this.saveUsers();
    }
    saveUsers() {
        try {
            const usersData = Array.from(this.users.values());
            fs.writeFileSync(this.usersFile, JSON.stringify(usersData, null, 2));
        }
        catch (error) {
            this.logger.error('Failed to save users', error);
        }
    }
    loadSessions() {
        try {
            if (fs.existsSync(this.sessionsFile)) {
                const data = fs.readFileSync(this.sessionsFile, 'utf8');
                const sessionsData = JSON.parse(data);
                for (const sessionData of sessionsData) {
                    const session = Object.assign(Object.assign({}, sessionData), { createdAt: new Date(sessionData.createdAt), lastActivity: new Date(sessionData.lastActivity) });
                    this.sessions.set(session.id, session);
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to load sessions', error);
        }
    }
    saveSessions() {
        try {
            const sessionsData = Array.from(this.sessions.values());
            fs.writeFileSync(this.sessionsFile, JSON.stringify(sessionsData, null, 2));
        }
        catch (error) {
            this.logger.error('Failed to save sessions', error);
        }
    }
    findUserByUsername(username) {
        return Array.from(this.users.values()).find(user => user.username === username);
    }
    findSessionByUserId(userId) {
        return Array.from(this.sessions.values()).find(session => session.userId === userId && session.isActive);
    }
    verifyPassword(password, user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.passwordHash || !user.passwordSalt) {
                this.logger.error(`User ${user.username} is missing password credentials`);
                return false;
            }
            try {
                const { hash } = this.hashPassword(password, user.passwordSalt);
                return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
            }
            catch (error) {
                this.logger.error(`Failed to verify password for user ${user.username}`, error);
                return false;
            }
        });
    }
    hashPassword(password, salt) {
        const actualSalt = salt !== null && salt !== void 0 ? salt : crypto.randomBytes(16).toString('hex');
        const derivedKey = crypto.pbkdf2Sync(password, actualSalt, 310000, 32, 'sha256');
        return { hash: derivedKey.toString('hex'), salt: actualSalt };
    }
    toPublicUser(user) {
        const { passwordHash: _hash, passwordSalt: _salt } = user, publicUser = __rest(user, ["passwordHash", "passwordSalt"]);
        return Object.assign(Object.assign({}, publicUser), { createdAt: new Date(publicUser.createdAt), lastLogin: new Date(publicUser.lastLogin), lockedUntil: publicUser.lockedUntil ? new Date(publicUser.lockedUntil) : undefined });
    }
    cloneSession(session) {
        return Object.assign(Object.assign({}, session), { createdAt: new Date(session.createdAt), lastActivity: new Date(session.lastActivity) });
    }
    createSession(user, ipAddress, userAgent) {
        const session = {
            id: this.generateSessionId(),
            userId: user.id,
            username: user.username,
            createdAt: new Date(),
            lastActivity: new Date(),
            ipAddress,
            userAgent,
            permissions: user.permissions,
            isActive: true
        };
        this.sessions.set(session.id, session);
        this.saveSessions();
        return session;
    }
    generateJWT(session) {
        const payload = {
            sessionId: session.id,
            userId: session.userId,
            username: session.username
        };
        return jsonwebtoken_1.default.sign(payload, this.config.jwtSecret, {
            expiresIn: this.config.jwtExpiration
        });
    }
    verifyJWT(token) {
        const decoded = jsonwebtoken_1.default.verify(token, this.config.jwtSecret);
        if (typeof decoded === 'string') {
            throw new jsonwebtoken_1.JsonWebTokenError('Invalid token payload');
        }
        const payload = decoded;
        if (!payload.sessionId || !payload.userId || !payload.username) {
            throw new jsonwebtoken_1.JsonWebTokenError('Token payload missing required claims');
        }
        return payload;
    }
    generateSessionId() {
        return crypto.randomBytes(16).toString('hex');
    }
    generateUserId() {
        return crypto.randomBytes(8).toString('hex');
    }
    evaluateConditions(permissionConditions, requestConditions) {
        for (const [key, value] of Object.entries(permissionConditions)) {
            if (requestConditions[key] !== value) {
                return false;
            }
        }
        return true;
    }
    logAuditEvent(auditData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { metadata } = auditData, rest = __rest(auditData, ["metadata"]);
            const auditLog = Object.assign({ id: crypto.randomBytes(8).toString('hex'), timestamp: new Date(), metadata: metadata !== null && metadata !== void 0 ? metadata : {} }, rest);
            this.auditLogs.push(auditLog);
            // Keep only recent logs in memory
            const cutoffDate = new Date(Date.now() - this.config.auditLogRetention * 24 * 60 * 60 * 1000);
            this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
            // Write to file
            try {
                const logEntry = JSON.stringify(auditLog) + '\n';
                fs.appendFileSync(this.auditLogFile, logEntry);
            }
            catch (error) {
                this.logger.error('Failed to write audit log', error);
            }
            // Emit event
            this.eventBus.emit('audit.log.created', auditLog);
        });
    }
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupExpiredSessions();
            this.cleanupOldAuditLogs();
        }, 300000); // Every 5 minutes
    }
    cleanupExpiredSessions() {
        const cutoffTime = Date.now() - this.config.sessionTimeout * 60 * 1000;
        let cleanedCount = 0;
        for (const session of this.sessions.values()) {
            if (session.lastActivity.getTime() < cutoffTime) {
                session.isActive = false;
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.saveSessions();
            this.logger.info(`Cleaned up ${cleanedCount} expired sessions`);
        }
    }
    cleanupOldAuditLogs() {
        const cutoffDate = new Date(Date.now() - this.config.auditLogRetention * 24 * 60 * 60 * 1000);
        const originalCount = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
        const cleanedCount = originalCount - this.auditLogs.length;
        if (cleanedCount > 0) {
            this.logger.info(`Cleaned up ${cleanedCount} old audit logs`);
        }
    }
}
exports.AuthService = AuthService;
