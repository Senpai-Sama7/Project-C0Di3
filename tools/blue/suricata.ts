import { exec } from 'child_process';
import { Tool } from '../../types';

export class SuricataTool implements Tool {
  name = 'suricata';
  description = 'Suricata network threat detection engine for monitoring and alerting';

  async execute(input: any, context?: any): Promise<any> {
    const { action, interface: iface, rules, logFile, alertsOnly } = input;

    // Real implementation using Suricata commands
    return new Promise((resolve, reject) => {
      const command = `suricata -c ${rules} -i ${iface} -l ${logFile}`;
      exec(command, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        resolve({ summary: stdout.split('\n').slice(0, 10).join('\n'), full: stdout });
      });
    });
  }
}
