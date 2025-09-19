import { spawn } from 'child_process';

export interface SpawnWithTimeoutOptions {
  timeoutMs: number;
  killSignal?: NodeJS.Signals;
  killGracePeriodMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
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
    const isWindows = process.platform === 'win32';
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: !isWindows
    });
    const childPid = child.pid ?? 0;

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let forceKillHandle: NodeJS.Timeout | undefined;
    let timeoutHandle: NodeJS.Timeout | undefined;

    const terminateChild = (signal: NodeJS.Signals) => {
      try {
        if (!isWindows && childPid > 0) {
          process.kill(-childPid, signal);
        } else {
          child.kill(signal);
        }
      } catch (error) {
        stderr += `\nProcess termination error: ${error instanceof Error ? error.message : String(error)}`;
      }
    };

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
        terminateChild(options.killSignal ?? 'SIGTERM');
        forceKillHandle = setTimeout(() => {
          if (!child.killed) {
            terminateChild('SIGKILL');
          }
        }, options.killGracePeriodMs ?? 5000);
      }, options.timeoutMs);
    }
  });
}
