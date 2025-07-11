import { spawn } from 'child_process';
import { Tool } from '../../types';
import { Logger } from '../../utils/logger';

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
    const command = `msfconsole -q -x "use ${safeExploit}; set RHOST ${safeTarget}; set PAYLOAD ${safePayload}${extraCmds}; run; exit"`;
    this.logger.info('Executing Metasploit command', { command });
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', command], { timeout: 120000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start Metasploit: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error('Metasploit execution error', { error: code, stderr });
          return reject(new Error(stderr || `Metasploit exited with code ${code}`));
        }
        // Normalize output
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
}
