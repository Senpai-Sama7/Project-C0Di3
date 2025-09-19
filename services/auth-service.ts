import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  requiresPasswordReset?: boolean;
}

interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
  success: boolean;
  errorMessage?: string;
  duration: number;
  metadata: Record<string, any>;
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  permissions: Permission[];
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  SECURITY_ANALYST = 'security_analyst',
  RED_TEAM = 'red_team',
  BLUE_TEAM = 'blue_team',
  READ_ONLY = 'read_only',
  GUEST = 'guest'
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: number; // in seconds
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  sessionTimeout: number; // in minutes
  passwordMinLength: number;
  requireMFA: boolean;
  auditLogRetention: number; // in days
}

interface TokenPayload {
  sessionId: string;
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly config: AuthConfig;

  private users: Map<string, StoredUser> = new Map();
  private sessions: Map<string, Session> = new Map();
  private auditLogs: AuditLog[] = [];

  private readonly legacyCredentialWarnings = new Set<string>();

  private readonly auditLogFile: string;
  private readonly usersFile: string;
  private readonly sessionsFile: string;

  constructor(eventBus: EventBus, config: AuthConfig) {
    this.eventBus = eventBus;
    this.logger = new Logger('AuthService');
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
  async authenticate(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; token?: string; session?: Session; user?: User; error?: string }> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    try {
      // Check if user exists
      const user = this.findUserByUsername(username);
      if (!user) {
        await this.logAuditEvent({
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
        await this.logAuditEvent({
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

      if (!user.isActive) {
        await this.logAuditEvent({
          userId: user.id,
          username: user.username,
          action: 'LOGIN_ATTEMPT',
          resource: 'auth',
          details: { reason: 'account_disabled' },
          ipAddress,
          userAgent,
          sessionId,
          success: false,
          errorMessage: 'Account disabled',
          duration: Date.now() - startTime
        });
        return { success: false, error: 'Account is disabled. Contact an administrator to reset your password.' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user);
      if (!isValidPassword) {
        // Increment failed attempts
        user.failedLoginAttempts++;

        // Lock account if max attempts exceeded
        if (user.failedLoginAttempts >= this.config.maxFailedAttempts) {
          user.lockedUntil = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000);
          this.logger.warn(`Account locked for user: ${username}`);
        }

        this.saveUsers();

        await this.logAuditEvent({
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

      if (user.requiresPasswordReset) {
        await this.logAuditEvent({
          userId: user.id,
          username: user.username,
          action: 'LOGIN_ATTEMPT',
          resource: 'auth',
          details: { reason: 'password_reset_required' },
          ipAddress,
          userAgent,
          sessionId,
          success: false,
          errorMessage: 'Password reset required',
          duration: Date.now() - startTime
        });
        return { success: false, error: 'Password reset required. Contact an administrator to reset your password.' };
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lastLogin = new Date();
      user.lockedUntil = undefined;
      this.saveUsers();

      // Create session
      const session = this.createSession(user, ipAddress, userAgent);
      const token = this.generateJWT(session);

      await this.logAuditEvent({
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

    } catch (error: unknown) {
      this.logger.error('Authentication error', error);
      const message = error instanceof Error ? error.message : String(error);
      await this.logAuditEvent({
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
  }

  /**
   * Verify JWT token and return session
   */
  async verifyToken(token: string): Promise<{ valid: boolean; session?: Session; user?: User; error?: string }> {
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

    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }

      if (error instanceof JsonWebTokenError) {
        return { valid: false, error: 'Invalid token signature' };
      }

      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Check if user has permission for specific action
   */
  async checkPermission(userId: string, resource: string, action: string, conditions?: Record<string, any>): Promise<boolean> {
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
    await this.logAuditEvent({
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
  }

  /**
   * Logout user and invalidate session
   */
  async logout(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const decoded = this.verifyJWT(token);
      const session = this.sessions.get(decoded.sessionId);

      if (session) {
        session.isActive = false;
        this.saveSessions();

        await this.logAuditEvent({
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

    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'failedLoginAttempts'> & { password: string }): Promise<User> {
    if (userData.password.length < this.config.passwordMinLength) {
      throw new Error(`Password must be at least ${this.config.passwordMinLength} characters long`);
    }

    const { password, ...rest } = userData;
    const userId = this.generateUserId();
    const { hash, salt } = this.hashPassword(password);
    const user: StoredUser = {
      ...rest,
      id: userId,
      createdAt: new Date(),
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      isActive: true,
      requiresPasswordReset: false,
      passwordHash: hash,
      passwordSalt: salt
    };

    this.users.set(userId, user);
    this.saveUsers();

    await this.logAuditEvent({
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
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User> & { password?: string }): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    const { password, ...userUpdates } = updates;
    const updatedUser: StoredUser = { ...user, ...userUpdates };

    if (password) {
      if (password.length < this.config.passwordMinLength) {
        throw new Error(`Password must be at least ${this.config.passwordMinLength} characters long`);
      }

      const { hash, salt } = this.hashPassword(password);
      updatedUser.passwordHash = hash;
      updatedUser.passwordSalt = salt;
      updatedUser.requiresPasswordReset = false;
      updatedUser.isActive = true;
    }

    this.users.set(userId, updatedUser);
    this.saveUsers();

    await this.logAuditEvent({
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
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
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

    await this.logAuditEvent({
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
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
  }): Promise<AuditLog[]> {
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
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.success !== undefined) {
        logs = logs.filter(log => log.success === filters.success);
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * Force logout all sessions for a user
   */
  async forceLogoutUser(userId: string): Promise<number> {
    let logoutCount = 0;

    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        logoutCount++;
      }
    }

    if (logoutCount > 0) {
      this.saveSessions();

      await this.logAuditEvent({
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
  }

  // Private helper methods

  private ensureDirectories(): void {
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

  private loadUsers(): void {
    let migrationPerformed = false;

    try {
      if (fs.existsSync(this.usersFile)) {
        const data = fs.readFileSync(this.usersFile, 'utf8');
        const usersData = JSON.parse(data);

        for (const userData of usersData) {
          let user: StoredUser = {
            ...userData,
            createdAt: new Date(userData.createdAt),
            lastLogin: new Date(userData.lastLogin),
            lockedUntil: userData.lockedUntil ? new Date(userData.lockedUntil) : undefined,
            failedLoginAttempts: userData.failedLoginAttempts ?? 0,
            requiresPasswordReset: userData.requiresPasswordReset ?? false,
            isActive: userData.isActive ?? true
          };

          if (!user.passwordHash || !user.passwordSalt) {
            const migrated = this.migrateLegacyUserCredentials(user, userData);
            if (migrated) {
              user = migrated.user;
              migrationPerformed = migrationPerformed || migrated.persist;
            } else {
              throw new Error(`User ${user.username} is missing password credentials. Please reset their password.`);
            }
          }
          this.users.set(user.id, user);
        }
      } else {
        // Create default admin user
        this.createDefaultUsers();
      }
    } catch (error) {
      this.logger.error('Failed to load users', error);
      throw error;
    }

    if (migrationPerformed) {
      this.logger.warn('Legacy user credentials migrated. Prompt users to rotate passwords immediately.');
      this.saveUsers();
    }
  }

  private migrateLegacyUserCredentials(
    user: StoredUser,
    rawUser: Record<string, any>
  ): { user: StoredUser; persist: boolean } | null {
    const resolution = this.resolveLegacyPassword(rawUser);

    if (!resolution) {
      return null;
    }

    const { password, source } = resolution;
    const { password: _legacyPassword, ...rest } = user as Record<string, any>;
    const { hash, salt } = this.hashPassword(password);
    const migratedUser: StoredUser = {
      ...(rest as StoredUser),
      passwordHash: hash,
      passwordSalt: salt,
      failedLoginAttempts: 0,
      requiresPasswordReset: true,
      isActive: false
    };

    const warningKey = user.username || user.id;
    if (warningKey && !this.legacyCredentialWarnings.has(warningKey)) {
      this.legacyCredentialWarnings.add(warningKey);
      this.logger.warn(
        `Migrated legacy credentials for user ${user.username}. Source=${source}. Login disabled until password reset is completed.`
      );
    }

    return { user: migratedUser, persist: true };
  }

  private resolveLegacyPassword(rawUser: Record<string, any>): { password: string; source: string } | null {
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

    if (process.env.NODE_ENV !== 'production') {
      const generated = crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
      const identifier = username || (typeof rawUser.id === 'string' ? rawUser.id : 'unknown');
      const envHint = username ? `LEGACY_PASSWORD_${username.toUpperCase()}` : 'LEGACY_PASSWORD_<USERNAME>';
      this.logger.warn(
        `Generated temporary development password for legacy user ${identifier}. Configure ${envHint} and rotate immediately.`
      );
      return { password: generated, source: 'generated-development-password' };
    }

    return null;
  }

  private createDefaultUsers(): void {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable must be set to initialize default admin user');
    }

    if (adminPassword.length < this.config.passwordMinLength) {
      throw new Error(`ADMIN_PASSWORD must be at least ${this.config.passwordMinLength} characters long`);
    }

    const { hash, salt } = this.hashPassword(adminPassword);

    const adminUser: StoredUser = {
      id: 'admin',
      username: 'admin',
      role: UserRole.ADMIN,
      permissions: [
        { resource: '*', action: '*' }
      ],
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      requiresPasswordReset: false,
      failedLoginAttempts: 0,
      passwordHash: hash,
      passwordSalt: salt
    };

    this.users.set('admin', adminUser);
    this.saveUsers();
  }

  private saveUsers(): void {
    try {
      const usersData = Array.from(this.users.values());
      fs.writeFileSync(this.usersFile, JSON.stringify(usersData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save users', error);
    }
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionsFile)) {
        const data = fs.readFileSync(this.sessionsFile, 'utf8');
        const sessionsData = JSON.parse(data);

        for (const sessionData of sessionsData) {
          const session: Session = {
            ...sessionData,
            createdAt: new Date(sessionData.createdAt),
            lastActivity: new Date(sessionData.lastActivity)
          };
          this.sessions.set(session.id, session);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load sessions', error);
    }
  }

  private saveSessions(): void {
    try {
      const sessionsData = Array.from(this.sessions.values());
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessionsData, null, 2));
    } catch (error) {
      this.logger.error('Failed to save sessions', error);
    }
  }

  private findUserByUsername(username: string): StoredUser | undefined {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  private findSessionByUserId(userId: string): Session | undefined {
    return Array.from(this.sessions.values()).find(session =>
      session.userId === userId && session.isActive
    );
  }

  private async verifyPassword(password: string, user: StoredUser): Promise<boolean> {
    if (!user.passwordHash || !user.passwordSalt) {
      this.logger.error(`User ${user.username} is missing password credentials`);
      return false;
    }

    try {
      const { hash } = this.hashPassword(password, user.passwordSalt);
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    } catch (error) {
      this.logger.error(`Failed to verify password for user ${user.username}`, error);
      return false;
    }
  }

  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.pbkdf2Sync(password, actualSalt, 310000, 32, 'sha256');

    return { hash: derivedKey.toString('hex'), salt: actualSalt };
  }

  private toPublicUser(user: StoredUser): User {
    const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user;
    return {
      ...publicUser,
      createdAt: new Date(publicUser.createdAt),
      lastLogin: new Date(publicUser.lastLogin),
      lockedUntil: publicUser.lockedUntil ? new Date(publicUser.lockedUntil) : undefined
    };
  }

  private cloneSession(session: Session): Session {
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity)
    };
  }

  private createSession(user: StoredUser, ipAddress?: string, userAgent?: string): Session {
    const session: Session = {
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

  private generateJWT(session: Session): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sessionId: session.id,
      userId: session.userId,
      username: session.username
    };

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiration
    });
  }

  private verifyJWT(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.jwtSecret);

    if (typeof decoded === 'string') {
      throw new JsonWebTokenError('Invalid token payload');
    }

    const payload = decoded as TokenPayload;

    if (!payload.sessionId || !payload.userId || !payload.username) {
      throw new JsonWebTokenError('Token payload missing required claims');
    }

    return payload;
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateUserId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private evaluateConditions(permissionConditions: Record<string, any>, requestConditions: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(permissionConditions)) {
      if (requestConditions[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private async logAuditEvent(
    auditData: Omit<AuditLog, 'id' | 'timestamp' | 'metadata'> & { metadata?: Record<string, any> }
  ): Promise<void> {
    const { metadata, ...rest } = auditData;
    const auditLog: AuditLog = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: new Date(),
      metadata: metadata ?? {},
      ...rest
    };

    this.auditLogs.push(auditLog);

    // Keep only recent logs in memory
    const cutoffDate = new Date(Date.now() - this.config.auditLogRetention * 24 * 60 * 60 * 1000);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);

    // Write to file
    try {
      const logEntry = JSON.stringify(auditLog) + '\n';
      fs.appendFileSync(this.auditLogFile, logEntry);
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }

    // Emit event
    this.eventBus.emit('audit.log.created', auditLog);
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupOldAuditLogs();
    }, 300000); // Every 5 minutes
  }

  private cleanupExpiredSessions(): void {
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

  private cleanupOldAuditLogs(): void {
    const cutoffDate = new Date(Date.now() - this.config.auditLogRetention * 24 * 60 * 60 * 1000);
    const originalCount = this.auditLogs.length;

    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);

    const cleanedCount = originalCount - this.auditLogs.length;
    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old audit logs`);
    }
  }
}
