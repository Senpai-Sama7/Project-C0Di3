import { Tool } from '../tool-registry';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * BurpSuiteTool securely wraps the Burp Suite CLI for web vulnerability scanning.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const BurpSuiteTool: Tool = {
  name: 'burpsuite',
  description: 'Web vulnerability scanner and proxy (Burp Suite CLI integration).',
  parameters: {
    target: { type: 'string', description: 'Target URL or host' },
    options: { type: 'string', description: 'Burp Suite CLI options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { target, options = '' } = input;
    if (!target || typeof target !== 'string' || !/^[\w.:-]+$/.test(target)) {
      throw new Error('Target is required and must be a valid host or URL.');
    }
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.trim().split(/\s+/u).filter(Boolean) : [];
    const args = [...optionArgs, '--target', target];
    const timeoutMs = Number.isFinite(context?.timeoutMs)
      ? Math.max(1000, Number(context.timeoutMs))
      : DEFAULT_TIMEOUT_MS;

    let result;
    try {
      result = await spawnWithTimeout('burpsuite', args, { timeoutMs });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start burpsuite: ${message}`);
    }

    if (result.timedOut) {
      throw new ProcessTimeoutError('burpsuite', timeoutMs);
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `burpsuite exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
};
