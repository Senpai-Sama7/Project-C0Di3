import { exec } from 'child_process';
import { Tool } from '../tool-registry';

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
    if (!rule || !target) throw new Error('Rule and target are required');

    return new Promise((resolve, reject) => {
      exec(`yara ${options} ${rule} ${target}`, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Yara execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('Yara execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
};
