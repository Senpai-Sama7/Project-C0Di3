import { AuthService, User, Session } from '../services/auth-service';
import { EventBus } from '../events/event-bus';
import { Logger } from '../utils/logger';

export interface AuthContext {
  user: User;
  session: Session;
  permissions: string[];
}

export interface AuthRequest {
  headers: Record<string, string>;
  body?: any;
  query?: any;
  ip?: string;
  userAgent?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: any;
  error?: string;
  token?: string;
}

export class AuthMiddleware {
  private readonly authService: AuthService;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  constructor(authService: AuthService, eventBus: EventBus) {
    this.authService = authService;
    this.eventBus = eventBus;
    this.logger = new Logger('AuthMiddleware');
  }

  /**
   * Authenticate request with JWT token
   */
  async authenticateRequest(request: AuthRequest): Promise<{ success: boolean; context?: AuthContext; error?: string }> {
    const token = this.extractToken(request);

    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }

    try {
      const result = await this.authService.verifyToken(token);

      if (!result.valid || !result.session || !result.user) {
        return { success: false, error: result.error || 'Invalid authentication token' };
      }

      const context: AuthContext = {
        user: result.user,
        session: result.session,
        permissions: this.extractPermissions(result.user)
      };

      return { success: true, context };

    } catch (error) {
      this.logger.error('Authentication failed', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Check if user has permission for specific action
   */
  async checkPermission(context: AuthContext, resource: string, action: string, conditions?: Record<string, any>): Promise<boolean> {
    return await this.authService.checkPermission(context.user.id, resource, action, conditions);
  }

  /**
   * Require specific permission or throw error
   */
  async requirePermission(context: AuthContext, resource: string, action: string, conditions?: Record<string, any>): Promise<void> {
    const hasPermission = await this.checkPermission(context, resource, action, conditions);

    if (!hasPermission) {
      throw new Error(`Access denied: ${action} on ${resource}`);
    }
  }

  /**
   * Require specific role or throw error
   */
  requireRole(context: AuthContext, requiredRole: string): void {
    if (context.user.role !== requiredRole && context.user.role !== 'admin') {
      throw new Error(`Access denied: role ${requiredRole} required`);
    }
  }

  /**
   * Extract token from request headers
   */
  private extractToken(request: AuthRequest): string | null {
    const authHeader = request.headers.authorization || request.headers.Authorization;

    if (!authHeader) {
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Extract permissions from user
   */
  private extractPermissions(user: User): string[] {
    const permissions: string[] = [];

    for (const permission of user.permissions) {
      const permissionString = `${permission.resource}:${permission.action}`;
      permissions.push(permissionString);
    }

    return permissions;
  }

  /**
   * Create authentication response
   */
  createAuthResponse(success: boolean, data?: any, error?: string, token?: string): AuthResponse {
    return {
      success,
      data,
      error,
      token
    };
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(context: AuthContext, action: string, resource: string, details?: Record<string, any>): Promise<void> {
    await this.authService['logAuditEvent']({
      userId: context.user.id,
      username: context.user.username,
      action,
      resource,
      details,
      sessionId: context.session.id,
      success: true,
      duration: 0
    });
  }
}
