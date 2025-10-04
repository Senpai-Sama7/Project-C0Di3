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
exports.AuthMiddleware = void 0;
const logger_1 = require("../utils/logger");
class AuthMiddleware {
    constructor(authService, eventBus) {
        this.authService = authService;
        this.eventBus = eventBus;
        this.logger = new logger_1.Logger('AuthMiddleware');
    }
    /**
     * Authenticate request with JWT token
     */
    authenticateRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = this.extractToken(request);
            if (!token) {
                return { success: false, error: 'No authentication token provided' };
            }
            try {
                const result = yield this.authService.verifyToken(token);
                if (!result.valid || !result.session || !result.user) {
                    return { success: false, error: result.error || 'Invalid authentication token' };
                }
                const context = {
                    user: result.user,
                    session: result.session,
                    permissions: this.extractPermissions(result.user)
                };
                return { success: true, context };
            }
            catch (error) {
                this.logger.error('Authentication failed', error);
                return { success: false, error: 'Authentication failed' };
            }
        });
    }
    /**
     * Check if user has permission for specific action
     */
    checkPermission(context, resource, action, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.authService.checkPermission(context.user.id, resource, action, conditions);
        });
    }
    /**
     * Require specific permission or throw error
     */
    requirePermission(context, resource, action, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            const hasPermission = yield this.checkPermission(context, resource, action, conditions);
            if (!hasPermission) {
                throw new Error(`Access denied: ${action} on ${resource}`);
            }
        });
    }
    /**
     * Require specific role or throw error
     */
    requireRole(context, requiredRole) {
        if (context.user.role !== requiredRole && context.user.role !== 'admin') {
            throw new Error(`Access denied: role ${requiredRole} required`);
        }
    }
    /**
     * Extract token from request headers
     */
    extractToken(request) {
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
    extractPermissions(user) {
        const permissions = [];
        for (const permission of user.permissions) {
            const permissionString = `${permission.resource}:${permission.action}`;
            permissions.push(permissionString);
        }
        return permissions;
    }
    /**
     * Create authentication response
     */
    createAuthResponse(success, data, error, token) {
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
    logAuthEvent(context, action, resource, details) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.authService['logAuditEvent']({
                userId: context.user.id,
                username: context.user.username,
                action,
                resource,
                details: details !== null && details !== void 0 ? details : {},
                sessionId: context.session.id,
                success: true,
                duration: 0
            });
        });
    }
}
exports.AuthMiddleware = AuthMiddleware;
