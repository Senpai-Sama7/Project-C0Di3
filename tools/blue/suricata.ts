import { spawn } from 'child_process';
import { Tool } from '../../types';

/**
 * SuricataTool securely wraps the Suricata CLI for network threat detection.
 * All user input is strictly validated and passed as arguments to prevent command injection.
 */
export class SuricataTool implements Tool {
  name = 'suricata';
  description = 'Suricata network threat detection engine for monitoring and alerting';

  async execute(input: any, context?: any): Promise<any> {
    const { interface: iface, rules, logFile } = input;
    if (!rules || typeof rules !== 'string' || !/^[\w./-]+$/.test(rules)) {
      throw new Error('Rules is required and must be a valid file path.');
    }
    if (!iface || typeof iface !== 'string' || !/^\w+$/.test(iface)) {
      throw new Error('Interface is required and must be a valid network interface name.');
    }
    if (!logFile || typeof logFile !== 'string' || !/^[\w./-]+$/.test(logFile)) {
      throw new Error('Log file is required and must be a valid file path.');
    }
    const args = ['-c', rules, '-i', iface, '-l', logFile];
    return new Promise((resolve, reject) => {
      const proc = spawn('suricata', args, { timeout: 60000 });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('error', (err) => reject(new Error('Failed to start suricata: ' + err.message)));
      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `suricata exited with code ${code}`));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        resolve({ summary, full: stdout, success: true });
      });
    });
  }
}
