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
    if (!config) throw new Error('Configuration file is required');

    return new Promise((resolve, reject) => {
      exec(`snort -c ${config} ${options}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Snort execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('Snort execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
};
