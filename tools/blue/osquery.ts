import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

/**
 * OsqueryTool securely wraps the osqueryi CLI for endpoint visibility.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const OsqueryTool: Tool = {
  name: 'osquery',
  description: 'Endpoint visibility and monitoring tool using SQL-based queries.',
  parameters: {
    query: { type: 'string', description: 'osquery SQL query' },
    options: { type: 'string', description: 'osqueryi command-line options', optional: true }
  },
  async execute(input: any): Promise<any> {
    const { query, options = '' } = input;
    if (!query || typeof query !== 'string' || /["'`;|&$><]/.test(query)) {
      throw new Error('Query is required and must not contain dangerous characters.');
    }
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = ['--json', query, ...optionArgs];
    return new Promise((resolve, reject) => {
      const proc = spawn('osqueryi', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start osqueryi: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `osqueryi exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
