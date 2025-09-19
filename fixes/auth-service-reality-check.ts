import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AuthService, AuthConfig } from '../services/auth-service';
import { EventBus } from '../events/event-bus';

interface CheckResult {
  id: string;
  description: string;
  outcome: any;
}

function ensureDataDirs(baseDir: string) {
  fs.mkdirSync(path.join(baseDir, 'data', 'auth'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, 'data', 'logs'), { recursive: true });
}

async function main(): Promise<CheckResult[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-reality-'));
  process.chdir(tmpDir);
  ensureDataDirs(tmpDir);

  const config: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET || 'test-secret',
    jwtExpiration: 60,
    maxFailedAttempts: 3,
    lockoutDuration: 5,
    sessionTimeout: 10,
    passwordMinLength: 8,
    requireMFA: false,
    auditLogRetention: 1
  };

  const eventBus = new EventBus();
  const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdmin123!';
  process.env.ADMIN_PASSWORD = adminPassword;

  const auth = new AuthService(eventBus, config);

  const success = await auth.authenticate('admin', adminPassword);
  const fail = await auth.authenticate('admin', 'wrong-password');
  const validToken = success.token ? await auth.verifyToken(success.token) : null;

  let tamperedResult: Awaited<ReturnType<AuthService['verifyToken']>> | null = null;
  if (success.token) {
    const tampered = success.token.replace(/.$/, (ch) => (ch === 'a' ? 'b' : 'a'));
    tamperedResult = await auth.verifyToken(tampered);
  }

  const storedUserRecord = JSON.parse(
    fs.readFileSync(path.join(tmpDir, 'data', 'auth', 'users.json'), 'utf8')
  )[0];

  const legacyUsersPath = path.join(tmpDir, 'data', 'auth', 'users.json');
  const legacyUsers = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'));
  const legacyAdmin = { ...legacyUsers[0] };
  delete legacyAdmin.passwordHash;
  delete legacyAdmin.passwordSalt;
  legacyAdmin.password = 'password';
  fs.writeFileSync(legacyUsersPath, JSON.stringify([legacyAdmin], null, 2));

  const legacyAuth = new AuthService(new EventBus(), config);
  const migratedLogin = await legacyAuth.authenticate('admin', 'password');

  const migratedRecord = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'))[0];

  return [
    {
      id: 'auth-admin-login',
      description: 'Admin authenticates with configured password',
      outcome: {
        success: success.success,
        hasSession: Boolean(success.session),
        tokenLength: success.token?.length ?? 0,
        userRole: success.user?.role
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
