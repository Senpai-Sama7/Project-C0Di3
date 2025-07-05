import { Tool } from '../tool-registry';
import { exec } from 'child_process';

export const SqlmapTool: Tool = {
  name: 'sqlmap',
  description: 'Automated SQL injection and database takeover tool.',
  parameters: {
    url: { type: 'string', description: 'Target URL' },
    options: { type: 'string', description: 'sqlmap command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { url, options = '' } = input;
    if (!url) throw new Error('URL is required');
    if (context?.simulation || context?.permissions?.simulationOnly) {
      return '[SIMULATED SQLMAP OUTPUT]';
    }
    if (context?.permissions && context.permissions.allow === false) {
      throw new Error('sqlmap is not allowed by permissions');
    }
    return new Promise((resolve, reject) => {
      exec(`sqlmap -u ${url} ${options}`, { timeout: 60000 }, (err, stdout, stderr) => {
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
