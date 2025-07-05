import { exec } from 'child_process';
import { Tool } from '../tool-registry';

export const OsqueryTool: Tool = {
  name: 'osquery',
  description: 'Endpoint visibility and monitoring tool using SQL-based queries.',
  parameters: {
    query: { type: 'string', description: 'osquery SQL query' },
    options: { type: 'string', description: 'osqueryi command-line options', optional: true }
  },
  async execute(input: any): Promise<any> {
    const { query, options = '' } = input;
    if (!query) throw new Error('Query is required');

    return new Promise((resolve, reject) => {
      exec(`osqueryi --json "${query}" ${options}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        resolve({ summary: stdout.split('\n').slice(0, 10).join('\n'), full: stdout });
      });
    });
  }
};
