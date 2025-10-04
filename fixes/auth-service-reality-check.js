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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const auth_service_1 = require("../services/auth-service");
const event_bus_1 = require("../events/event-bus");
function ensureDataDirs(baseDir) {
    fs.mkdirSync(path.join(baseDir, 'data', 'auth'), { recursive: true });
    fs.mkdirSync(path.join(baseDir, 'data', 'logs'), { recursive: true });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-reality-'));
        process.chdir(tmpDir);
        ensureDataDirs(tmpDir);
        const config = {
            jwtSecret: process.env.JWT_SECRET || 'test-secret',
            jwtExpiration: 60,
            maxFailedAttempts: 3,
            lockoutDuration: 5,
            sessionTimeout: 10,
            passwordMinLength: 8,
            requireMFA: false,
            auditLogRetention: 1
        };
        const eventBus = new event_bus_1.EventBus();
        const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdmin123!';
        process.env.ADMIN_PASSWORD = adminPassword;
        const auth = new auth_service_1.AuthService(eventBus, config);
        const success = yield auth.authenticate('admin', adminPassword);
        const fail = yield auth.authenticate('admin', 'wrong-password');
        const validToken = success.token ? yield auth.verifyToken(success.token) : null;
        let tamperedResult = null;
        if (success.token) {
            const tampered = success.token.replace(/.$/, (ch) => (ch === 'a' ? 'b' : 'a'));
            tamperedResult = yield auth.verifyToken(tampered);
        }
        const storedUserRecord = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data', 'auth', 'users.json'), 'utf8'))[0];
        const legacyUsersPath = path.join(tmpDir, 'data', 'auth', 'users.json');
        const legacyUsers = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'));
        const legacyAdmin = Object.assign({}, legacyUsers[0]);
        delete legacyAdmin.passwordHash;
        delete legacyAdmin.passwordSalt;
        legacyAdmin.password = 'password';
        fs.writeFileSync(legacyUsersPath, JSON.stringify([legacyAdmin], null, 2));
        const legacyAuth = new auth_service_1.AuthService(new event_bus_1.EventBus(), config);
        const migratedLogin = yield legacyAuth.authenticate('admin', 'password');
        const migratedRecord = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'))[0];
        return [
            {
                id: 'auth-admin-login',
                description: 'Admin authenticates with configured password',
                outcome: {
                    success: success.success,
                    hasSession: Boolean(success.session),
                    tokenLength: (_b = (_a = success.token) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
                    userRole: (_c = success.user) === null || _c === void 0 ? void 0 : _c.role
                }
            },
            {
                id: 'auth-reject-bad-password',
                description: 'Invalid password is rejected',
                outcome: {
                    success: fail.success,
                    error: fail.error
                }
            },
            {
                id: 'auth-signed-jwt',
                description: 'Valid token decodes, tampered token fails',
                outcome: {
                    validToken,
                    tamperedResult
                }
            },
            {
                id: 'auth-stored-hash',
                description: 'Stored user record contains hash and salt but no plaintext password',
                outcome: storedUserRecord
            },
            {
                id: 'auth-context',
                description: 'Temporary directory used for this verification run',
                outcome: {
                    tmpDir,
                    files: fs.readdirSync(path.join(tmpDir, 'data', 'auth'))
                }
            },
            {
                id: 'auth-legacy-migration',
                description: 'Legacy user records missing hashes are auto-migrated with warnings',
                outcome: {
                    migratedLogin: migratedLogin.success,
                    storedHash: Boolean(migratedRecord.passwordHash),
                    storedSalt: Boolean(migratedRecord.passwordSalt),
                    retainedPlaintext: Object.prototype.hasOwnProperty.call(migratedRecord, 'password')
                }
            }
        ];
    });
}
main()
    .then((results) => {
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
})
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
