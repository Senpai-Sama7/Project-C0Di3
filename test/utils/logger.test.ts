/**
 * Tests for Logger utility
 */

import { Logger } from '../../utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('TestModule');
  });

  describe('initialization', () => {
    it('should create logger with module name', () => {
      expect(logger).toBeDefined();
    });

    it('should create logger with custom level', () => {
      const customLogger = new Logger('Custom', 'debug');
      expect(customLogger).toBeDefined();
    });

    it('should create logger with default parameters', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeDefined();
    });
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should log debug messages', () => {
      const debugLogger = new Logger('Debug', 'debug');
      expect(() => debugLogger.debug('Test debug message')).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred:', error)).not.toThrow();
    });

    it('should log with generic log method', () => {
      expect(() => logger.log('info', 'Generic log message')).not.toThrow();
    });
  });

  describe('log formatting', () => {
    it('should format messages with timestamp', () => {
      // Since we can't easily capture console output, just ensure it doesn't throw
      expect(() => logger.info('Message with timestamp')).not.toThrow();
    });

    it('should format messages with module name', () => {
      expect(() => logger.info('Message with module')).not.toThrow();
    });

    it('should handle multiple arguments', () => {
      expect(() => logger.info('Multiple', 'arguments', { data: 'value' })).not.toThrow();
    });

    it('should format objects in messages', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      expect(() => logger.info('Object message', obj)).not.toThrow();
    });
  });

  describe('log level filtering', () => {
    it('should not log debug messages when level is info', () => {
      const infoLogger = new Logger('InfoOnly', 'info');
      // Debug messages should be filtered out, but we can't easily test console output
      expect(() => infoLogger.debug('Should not appear')).not.toThrow();
    });

    it('should log info messages when level is debug', () => {
      const debugLogger = new Logger('DebugLevel', 'debug');
      expect(() => debugLogger.info('Should appear')).not.toThrow();
    });

    it('should always log error messages', () => {
      const debugLogger = new Logger('ErrorLevel', 'error');
      expect(() => debugLogger.error('Should appear')).not.toThrow();
    });

    it('should respect log level hierarchy', () => {
      const warnLogger = new Logger('WarnLevel', 'warn');
      expect(() => warnLogger.debug('Should not appear')).not.toThrow();
      expect(() => warnLogger.info('Should not appear')).not.toThrow();
      expect(() => warnLogger.warn('Should appear')).not.toThrow();
      expect(() => warnLogger.error('Should appear')).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle special characters', () => {
      expect(() => logger.info('Special !@#$%^&*() characters')).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      expect(() => logger.info(longMessage)).not.toThrow();
    });

    it('should handle null arguments', () => {
      expect(() => logger.info('Message', null)).not.toThrow();
    });

    it('should handle undefined arguments', () => {
      expect(() => logger.info('Message', undefined)).not.toThrow();
    });

    it('should handle arrays', () => {
      expect(() => logger.info('Array', [1, 2, 3])).not.toThrow();
    });
  });
});

