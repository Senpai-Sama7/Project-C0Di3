import { spawn } from 'child_process';

export interface SpawnWithTimeoutOptions {
  timeoutMs: number;
  killSignal?: NodeJS.Signals;
  killGracePeriodMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  killChildren?: boolean;
}

export interface SpawnWithTimeoutResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
}

export class ProcessTimeoutError extends Error {
  constructor(command: string, timeoutMs: number) {
    super(`${command} timed out after ${timeoutMs}ms`);
    this.name = 'ProcessTimeoutError';
  }
}

export async function spawnWithTimeout(
  command: string,
  args: readonly string[],
  options: SpawnWithTimeoutOptions
): Promise<SpawnWithTimeoutResult> {
  return new Promise((resolve, reject) => {
    const killChildren = options.killChildren ?? true;
    const shouldDetach = killChildren && process.platform !== 'win32';
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: shouldDetach
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let forceKillHandle: NodeJS.Timeout | undefined;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const clearTimers = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (forceKillHandle) {
        clearTimeout(forceKillHandle);
      }
    };

    const finish = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve({ stdout, stderr, exitCode, signal, timedOut });
    };

    const sendSignal = (signal: NodeJS.Signals) => {
      if (!child.pid) {
        return;
      }

      try {
        if (killChildren && process.platform !== 'win32') {
          process.kill(-child.pid, signal);
        } else {
          child.kill(signal);
        }
      } catch (error) {
        // Swallow ESRCH errors when process already exited
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          throw error;
        }
      }
    };

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', error => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      reject(error);
    });

    child.on('close', (code, signal) => {
      finish(code, signal);
    });

    if (Number.isFinite(options.timeoutMs) && options.timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        if (settled) {
          return;
        }
        timedOut = true;
        try {
          sendSignal(options.killSignal ?? 'SIGTERM');
        } catch (error) {
          settled = true;
          clearTimers();
          reject(error);
          return;
        }
        forceKillHandle = setTimeout(() => {
          if (!child.killed) {
            try {
              sendSignal('SIGKILL');
            } catch (error) {
              if (!settled) {
                settled = true;
                clearTimers();
                reject(error);
              }
            }
          }
        }, options.killGracePeriodMs ?? 5000);
      }, options.timeoutMs);
    }
  });
}
