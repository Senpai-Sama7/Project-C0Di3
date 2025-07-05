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

    return new Promise((resolve, reject) => {
      exec(`sqlmap -u ${url} ${options}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('SQLMap execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('SQLMap execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
};
