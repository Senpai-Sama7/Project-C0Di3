import { Tool } from '../tool-registry';
import { exec } from 'child_process';

export const BurpSuiteTool: Tool = {
  name: 'burpsuite',
  description: 'Web vulnerability scanner and proxy (Burp Suite CLI integration).',
  parameters: {
    target: { type: 'string', description: 'Target URL or host' },
    options: { type: 'string', description: 'Burp Suite CLI options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { target, options = '' } = input;
    if (!target) throw new Error('Target is required');

    return new Promise((resolve, reject) => {
      exec(`burpsuite ${options} --target ${target}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Burp Suite execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('Burp Suite execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
};
