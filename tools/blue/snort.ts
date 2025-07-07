import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

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
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = ['-c', config, ...optionArgs];
    return new Promise((resolve, reject) => {
      const proc = spawn('snort', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start snort: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `snort exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
