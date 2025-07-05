import { Tool } from '../tool-registry';
import { exec } from 'child_process';

export const SnortTool: Tool = {
  name: 'snort',
  description: 'Network intrusion detection and prevention system.',
  parameters: {
    config: { type: 'string', description: 'Path to Snort config file', optional: true },
    options: { type: 'string', description: 'Snort command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { config = '/etc/snort/snort.conf', options = '' } = input;
    if (context?.simulation || context?.permissions?.simulationOnly) {
      return '[SIMULATED SNORT OUTPUT]';
    }
    if (context?.permissions && context.permissions.allow === false) {
      throw new Error('Snort is not allowed by permissions');
    }
    return new Promise((resolve, reject) => {
      exec(`snort -c ${config} ${options}`, { timeout: 60000 }, (err, stdout, stderr) => {
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
