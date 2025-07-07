import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

/**
 * NmapTool securely wraps the nmap CLI for network scanning.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const NmapTool: Tool = {
  name: 'nmap',
  description: 'Network scanner for host discovery and vulnerability detection.',
  parameters: {
    target: { type: 'string', description: 'Target IP or hostname' },
    options: { type: 'string', description: 'Nmap command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { target, options = '' } = input;
    if (!target || typeof target !== 'string' || !/^[\w.:-]+$/.test(target)) {
      throw new Error('Target is required and must be a valid IP or hostname.');
    }
    // Only allow safe nmap options (letters, dashes, numbers, spaces, dots, slashes)
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    // Split options into array, filter out empty strings
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = [...optionArgs, target];
    return new Promise((resolve, reject) => {
      const proc = spawn('nmap', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start nmap: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `nmap exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
