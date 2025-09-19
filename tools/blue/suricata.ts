import { Tool } from '../../types';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * SuricataTool securely wraps the Suricata CLI for network threat detection.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export class SuricataTool implements Tool {
  name = 'suricata';
  description = 'Suricata network threat detection engine for monitoring and alerting';

  async execute(input: any, context?: any): Promise<any> {
    const { interface: iface, rules, logFile } = input;
    if (!rules || typeof rules !== 'string' || !/^[\w./-]+$/.test(rules)) {
      throw new Error('Rules is required and must be a valid file path.');
    }
    if (!iface || typeof iface !== 'string' || !/^\w+$/.test(iface)) {
      throw new Error('Interface is required and must be a valid network interface name.');
    }
    if (!logFile || typeof logFile !== 'string' || !/^[\w./-]+$/.test(logFile)) {
      throw new Error('Log file is required and must be a valid file path.');
    }
    const args = ['-c', rules, '-i', iface, '-l', logFile];

    let result;
    try {
      result = await spawnWithTimeout('suricata', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start suricata: ${message}`);
    }

    if (result.timedOut) {
      throw new ProcessTimeoutError('suricata', DEFAULT_TIMEOUT_MS);
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `suricata exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
}
