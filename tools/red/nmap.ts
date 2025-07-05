import { Tool } from '../tool-registry';
import { exec } from 'child_process';

export const NmapTool: Tool = {
  name: 'nmap',
  description: 'Network scanner for host discovery and vulnerability detection.',
  parameters: {
    target: { type: 'string', description: 'Target IP or hostname' },
    options: { type: 'string', description: 'Nmap command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { target, options = '' } = input;
    if (!target) throw new Error('Target is required');

    return new Promise((resolve, reject) => {
      exec(`nmap ${options} ${target}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Nmap execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('Nmap execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
};
