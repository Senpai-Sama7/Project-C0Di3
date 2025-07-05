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
    if (context?.simulation || context?.permissions?.simulationOnly) {
      return '[SIMULATED BURP SUITE OUTPUT]';
    }
    if (context?.permissions && context.permissions.allow === false) {
      throw new Error('Burp Suite is not allowed by permissions');
    }
    return new Promise((resolve, reject) => {
      exec(`burpsuite ${options} --target ${target}`, { timeout: 60000 }, (err, stdout, stderr) => {
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
