import { Tool } from '../tool-registry';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * SqlmapTool securely wraps the sqlmap CLI for SQL injection testing.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const SqlmapTool: Tool = {
  name: 'sqlmap',
  description: 'Automated SQL injection and database takeover tool.',
  parameters: {
    url: { type: 'string', description: 'Target URL' },
    options: { type: 'string', description: 'sqlmap command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { url, options = '' } = input;
    if (!url || typeof url !== 'string' || !/^https?:\/\/[\w\-.]+(:\d+)?(\/.*)?$/.test(url)) {
      throw new Error('URL is required and must be a valid http(s) URL.');
    }
    // Only allow safe sqlmap options (letters, dashes, numbers, spaces, dots, slashes)
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.trim().split(/\s+/u).filter(Boolean) : [];
    const args = ['-u', url, ...optionArgs];
    const timeoutMs = Number.isFinite(context?.timeoutMs)
      ? Math.max(1000, Number(context.timeoutMs))
      : DEFAULT_TIMEOUT_MS;

    let result;
    try {
      result = await spawnWithTimeout('sqlmap', args, { timeoutMs });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start sqlmap: ${message}`);
    }

    if (result.timedOut) {
      throw new ProcessTimeoutError('sqlmap', timeoutMs);
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `sqlmap exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
};
