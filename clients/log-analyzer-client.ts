import axios from 'axios';
import { Logger } from '../utils/logger';

export class LogAnalyzerClient {
  private readonly baseUrl: string;
  private readonly logger: Logger;

  constructor(baseUrl: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.logger = logger;
  }

  public async analyze(logs: any[]): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/analyze`, logs);
      return response.data;
    } catch (error) {
      this.logger.error('Error analyzing logs:', error);
      throw error;
    }
  }
}
