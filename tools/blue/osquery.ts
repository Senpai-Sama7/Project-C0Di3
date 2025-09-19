import { Tool } from '../tool-registry';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * OsqueryTool securely wraps the osqueryi CLI for endpoint visibility.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const OsqueryTool: Tool = {
  name: 'osquery',
  description: 'Endpoint visibility and monitoring tool using SQL-based queries.',
  parameters: {
    query: { type: 'string', description: 'osquery SQL query' },
    options: { type: 'string', description: 'osqueryi command-line options', optional: true }
  },
  async execute(input: any): Promise<any> {
    const { query, options = '' } = input;
    if (!query || typeof query !== 'string' || /["'`;|&$><]/.test(query)) {
      throw new Error('Query is required and must not contain dangerous characters.');
    }
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = ['--json', query, ...optionArgs];

    let result;
    try {
      result = await spawnWithTimeout('osqueryi', args, { timeoutMs: DEFAULT_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start osqueryi: ${message}`);
    }

    if (result.timedOut) {
      throw new ProcessTimeoutError('osqueryi', DEFAULT_TIMEOUT_MS);
    }

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `osqueryi exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
};
