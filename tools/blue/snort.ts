import { Tool } from '../tool-registry';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * SnortTool securely wraps the snort CLI for network intrusion detection.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const SnortTool: Tool = {
  name: 'snort',
  description: 'Network intrusion detection and prevention system.',
  parameters: {
    config: { type: 'string', description: 'Path to Snort config file', optional: true },
    options: { type: 'string', description: 'Snort command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { config = '/etc/snort/snort.conf', options = '' } = input;
    if (!config || typeof config !== 'string' || !/^[\w./-]+$/.test(config)) {
      throw new Error('Configuration file is required and must be a valid file path.');
    }
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.trim().split(/\s+/u).filter(Boolean) : [];
    const args = ['-c', config, ...optionArgs];

    let result;
    try {
      result = await spawnWithTimeout('snort', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start snort: ${message}`);
    }

    if (result.timedOut) {
      throw new ProcessTimeoutError('snort', DEFAULT_TIMEOUT_MS);
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `snort exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
};
