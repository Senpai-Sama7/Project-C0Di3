import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

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
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = [...optionArgs, '--target', target];
    return new Promise((resolve, reject) => {
      const proc = spawn('burpsuite', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start burpsuite: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `burpsuite exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
