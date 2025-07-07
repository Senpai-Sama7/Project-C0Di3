import axios from 'axios';
import { Tool } from '../../types';

export class WazuhTool implements Tool {
  name = 'wazuh';
  description = 'Wazuh security information and event management (SIEM) platform';

  async execute(input: any, context?: any): Promise<any> {
    const { action, agent, rule, logType, timeRange } = input;
    if (!action || !agent || !rule) throw new Error('Action, agent, and rule are required');

    const apiUrl = process.env.WAZUH_API_URL ?? 'http://localhost:55000';
    const endpoint = `${apiUrl}/${action}`;
    const payload = { agent, rule, logType, timeRange };

    try {
      const response = await axios.post(endpoint, payload);
      console.info('Wazuh API execution success:', response.data);
      return {
        summary: JSON.stringify(response.data, null, 2).slice(0, 500),
        full: response.data,
        success: true
      };
    } catch (error: any) {
      console.error('Wazuh API execution error:', error.message);
      throw new Error(`Wazuh API error: ${error.message}`);
    }
  }
}
