import { exec } from 'child_process';
import { Tool } from '../../types';

export class SuricataTool implements Tool {
  name = 'suricata';
  description = 'Suricata network threat detection engine for monitoring and alerting';

  async execute(input: any, context?: any): Promise<any> {
    const { action, interface: iface, rules, logFile, alertsOnly } = input;
    if (!rules || !iface || !logFile) throw new Error('Rules, interface, and log file are required');

    return new Promise((resolve, reject) => {
      const command = `suricata -c ${rules} -i ${iface} -l ${logFile}`;
      exec(command, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Suricata execution error:', stderr || err.message);
          return reject(new Error(stderr || err.message));
        }
        const summary = stdout.split('\n').slice(0, 10).join('\n');
        console.info('Suricata execution success:', summary);
        resolve({
          summary,
          full: stdout,
          success: true
        });
      });
    });
  }
}
