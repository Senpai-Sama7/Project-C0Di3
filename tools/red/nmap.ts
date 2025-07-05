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
    if (context?.simulation || context?.permissions?.simulationOnly) {
      return '[SIMULATED NMAP OUTPUT]';
    }
    if (context?.permissions && context.permissions.allow === false) {
      throw new Error('Nmap is not allowed by permissions');
    }
    return new Promise((resolve, reject) => {
      exec(`nmap ${options} ${target}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        // Normalize output for LLM summarization
        resolve({
          summary: stdout.split('\n').slice(0, 10).join('\n'),
          full: stdout
        });
      });
    });
  }
};
