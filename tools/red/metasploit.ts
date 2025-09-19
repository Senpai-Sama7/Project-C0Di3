import { Tool } from '../../types';
import { Logger } from '../../utils/logger';
import { ProcessTimeoutError, spawnWithTimeout } from '../process-utils';

const DEFAULT_TIMEOUT_MS = 120_000;

export class MetasploitTool implements Tool {
  name = 'metasploit';
  description = 'Metasploit framework for penetration testing and exploitation';
  private readonly logger = new Logger('MetasploitTool');

  async execute(input: any, context?: any): Promise<any> {
    const { target, exploit, payload, options } = input ?? {};
    // Input validation
    if (!exploit || !target || !payload) {
      this.logger.error('Missing required parameters', { exploit, target, payload });
      throw new Error('Missing required parameters: exploit, target, or payload.');
    }
    // Sanitize input to prevent command injection
    const safeExploit = String(exploit).replace(/[^\w/]/g, '');
    const safeTarget = String(target).replace(/[^\w.-]/g, '');
    const safePayload = String(payload).replace(/[^\w/]/g, '');
    // Optionally handle extra options
    let extraCmds = '';
    if (options && typeof options === 'object') {
      for (const [key, value] of Object.entries(options)) {
        extraCmds += `; set ${String(key).replace(/[^\w.-]/g, '')} ${String(value).replace(/[^\w.-]/g, '')}`;
      }
    }
    const commandScript = `use ${safeExploit}; set RHOST ${safeTarget}; set PAYLOAD ${safePayload}${extraCmds}; run; exit`;
    this.logger.info('Executing Metasploit command', { script: commandScript });
    let result;
    try {
      result = await spawnWithTimeout('msfconsole', ['-q', '-x', commandScript], { timeoutMs: DEFAULT_TIMEOUT_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to start Metasploit: ${message}`);
    }

    if (result.timedOut) {
      this.logger.error('Metasploit execution timed out', { timeoutMs: DEFAULT_TIMEOUT_MS });
      throw new ProcessTimeoutError('Metasploit', DEFAULT_TIMEOUT_MS);
    }

    if (result.exitCode !== 0) {
      this.logger.error('Metasploit execution error', { error: result.exitCode, stderr: result.stderr });
      throw new Error(result.stderr || `Metasploit exited with code ${result.exitCode}`);
    }

    const summary = result.stdout.split('\n').slice(0, 10).join('\n');
    return { summary, full: result.stdout, success: true };
  }
}
