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
