/**
 * Comprehensive tests for validation utilities
 */

import {
  ValidationError,
  validateNonEmptyString,
  validateEmail,
  validateNumberInRange,
  validateIPAddress,
  validateHostname,
  validateFilePath,
  sanitizeInput,
  validateCommandArgs,
  validatePattern
} from '../../utils/validation';

describe('Validation Utilities', () => {
  describe('ValidationError', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', 'field', 'value');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('field');
      expect(error.value).toBe('value');
    });
  });

  describe('validateNonEmptyString', () => {
    it('should accept valid non-empty strings', () => {
      expect(validateNonEmptyString('test', 'field')).toBe('test');
      expect(validateNonEmptyString('  test  ', 'field')).toBe('test');
    });

    it('should reject non-string values', () => {
      expect(() => validateNonEmptyString(123, 'field')).toThrow(ValidationError);
      expect(() => validateNonEmptyString(null, 'field')).toThrow(ValidationError);
      expect(() => validateNonEmptyString(undefined, 'field')).toThrow(ValidationError);
    });

    it('should reject empty strings', () => {
      expect(() => validateNonEmptyString('', 'field')).toThrow(ValidationError);
      expect(() => validateNonEmptyString('   ', 'field')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com', 'email')).toBe('test@example.com');
      expect(validateEmail('user.name+tag@example.co.uk', 'email')).toBe('user.name+tag@example.co.uk');
    });

    it('should reject invalid email addresses', () => {
      expect(() => validateEmail('invalid', 'email')).toThrow(ValidationError);
      expect(() => validateEmail('invalid@', 'email')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com', 'email')).toThrow(ValidationError);
      expect(() => validateEmail('test@example', 'email')).toThrow(ValidationError);
    });
  });

  describe('validateNumberInRange', () => {
    it('should accept numbers within range', () => {
      expect(validateNumberInRange(5, 'field', 0, 10)).toBe(5);
      expect(validateNumberInRange(0, 'field', 0, 10)).toBe(0);
      expect(validateNumberInRange(10, 'field', 0, 10)).toBe(10);
    });

    it('should reject numbers outside range', () => {
      expect(() => validateNumberInRange(-1, 'field', 0, 10)).toThrow(ValidationError);
      expect(() => validateNumberInRange(11, 'field', 0, 10)).toThrow(ValidationError);
    });

    it('should reject non-numeric values', () => {
      expect(() => validateNumberInRange('5' as any, 'field', 0, 10)).toThrow(ValidationError);
      expect(() => validateNumberInRange(NaN, 'field', 0, 10)).toThrow(ValidationError);
    });
  });

  describe('validateIPAddress', () => {
    it('should accept valid IPv4 addresses', () => {
      expect(validateIPAddress('192.168.1.1', 'ip')).toBe('192.168.1.1');
      expect(validateIPAddress('10.0.0.1', 'ip')).toBe('10.0.0.1');
      expect(validateIPAddress('255.255.255.255', 'ip')).toBe('255.255.255.255');
    });

    it('should accept valid IPv6 addresses', () => {
      expect(validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334', 'ip')).toBeTruthy();
      expect(validateIPAddress('::1', 'ip')).toBe('::1');
      expect(validateIPAddress('fe80::1', 'ip')).toBe('fe80::1');
    });

    it('should reject invalid IP addresses', () => {
      expect(() => validateIPAddress('256.1.1.1', 'ip')).toThrow(ValidationError);
      expect(() => validateIPAddress('192.168.1', 'ip')).toThrow(ValidationError);
      expect(() => validateIPAddress('invalid', 'ip')).toThrow(ValidationError);
    });
  });

  describe('validateHostname', () => {
    it('should accept valid hostnames', () => {
      expect(validateHostname('example.com', 'hostname')).toBe('example.com');
      expect(validateHostname('sub.example.com', 'hostname')).toBe('sub.example.com');
      expect(validateHostname('my-server.local', 'hostname')).toBe('my-server.local');
    });

    it('should reject invalid hostnames', () => {
      expect(() => validateHostname('', 'hostname')).toThrow(ValidationError);
      expect(() => validateHostname('-example.com', 'hostname')).toThrow(ValidationError);
      expect(() => validateHostname('example-.com', 'hostname')).toThrow(ValidationError);
    });
  });

  describe('validateFilePath', () => {
    it('should accept valid file paths', () => {
      expect(validateFilePath('/etc/hosts', 'path')).toBe('/etc/hosts');
      expect(validateFilePath('./relative/path.txt', 'path')).toBe('./relative/path.txt');
    });

    it('should reject paths with dangerous patterns', () => {
      expect(() => validateFilePath('../../../etc/passwd', 'path')).toThrow(ValidationError);
      expect(() => validateFilePath('/path/with/../traversal', 'path')).toThrow(ValidationError);
    });

    it('should reject empty paths', () => {
      expect(() => validateFilePath('', 'path')).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const result = sanitizeInput('test<script>alert(1)</script>', {});
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should respect maxLength option', () => {
      const result = sanitizeInput('a'.repeat(100), { maxLength: 50 });
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('', {})).toBe('');
    });
  });

  describe('validateCommandArgs', () => {
    it('should accept safe command arguments', () => {
      const args = ['--flag', 'value', '-x'];
      expect(validateCommandArgs(args)).toEqual(args);
    });

    it('should reject arguments with dangerous patterns', () => {
      expect(() => validateCommandArgs(['arg; rm -rf /'])).toThrow(ValidationError);
      expect(() => validateCommandArgs(['arg && malicious'])).toThrow(ValidationError);
      expect(() => validateCommandArgs(['arg | pipe'])).toThrow(ValidationError);
    });

    it('should handle empty array', () => {
      expect(validateCommandArgs([])).toEqual([]);
    });
  });

  describe('validatePattern', () => {
    it('should validate strings against regex patterns', () => {
      const pattern = /^[a-z]+$/;
      expect(validatePattern('abc', 'field', pattern)).toBe('abc');
    });

    it('should reject strings not matching pattern', () => {
      const pattern = /^[a-z]+$/;
      expect(() => validatePattern('ABC123', 'field', pattern)).toThrow(ValidationError);
    });

    it('should handle pattern with description', () => {
      const pattern = /^[a-z]+$/;
      expect(validatePattern('abc', 'field', pattern, 'must be lowercase')).toBe('abc');
    });
  });
});
