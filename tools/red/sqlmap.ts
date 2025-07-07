import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

/**
 * SqlmapTool securely wraps the sqlmap CLI for SQL injection testing.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const SqlmapTool: Tool = {
  name: 'sqlmap',
  description: 'Automated SQL injection and database takeover tool.',
  parameters: {
    url: { type: 'string', description: 'Target URL' },
    options: { type: 'string', description: 'sqlmap command-line options', optional: true }
  },
  async execute(input: any, context?: any): Promise<any> {
    const { url, options = '' } = input;
    if (!url || typeof url !== 'string' || !/^https?:\/\/[\w\-.]+(:\d+)?(\/.*)?$/.test(url)) {
      throw new Error('URL is required and must be a valid http(s) URL.');
    }
    // Only allow safe sqlmap options (letters, dashes, numbers, spaces, dots, slashes)
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = ['-u', url, ...optionArgs];
    return new Promise((resolve, reject) => {
      const proc = spawn('sqlmap', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start sqlmap: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `sqlmap exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
