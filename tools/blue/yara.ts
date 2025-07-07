import { spawn } from 'child_process';
import { Tool } from '../tool-registry';

/**
 * YaraTool securely wraps the yara CLI for malware identification.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export const YaraTool: Tool = {
  name: 'yara',
  description: 'Malware identification and classification tool using YARA rules.',
  parameters: {
    rule: { type: 'string', description: 'Path to YARA rule file' },
    target: { type: 'string', description: 'Target file or directory' },
    options: { type: 'string', description: 'YARA command-line options', optional: true }
  },
  async execute(input: any): Promise<any> {
    const { rule, target, options = '' } = input;
    if (!rule || typeof rule !== 'string' || !/^[\w./-]+$/.test(rule)) {
      throw new Error('Rule is required and must be a valid file path.');
    }
    if (!target || typeof target !== 'string' || !/^[\w./-]+$/.test(target)) {
      throw new Error('Target is required and must be a valid file or directory.');
    }
    if (options && !/^[\w\s\-./]*$/.test(options)) {
      throw new Error('Options contain invalid characters.');
    }
    const optionArgs = options ? options.split(' ').filter(Boolean) : [];
    const args = [...optionArgs, rule, target];
    return new Promise((resolve, reject) => {
      const proc = spawn('yara', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      proc.on('error', (err: Error) => reject(new Error('Failed to start yara: ' + err.message)));
      proc.on('close', (code: number) => {
        if (code !== 0) {
          return reject(new Error(stderr || `yara exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
};
