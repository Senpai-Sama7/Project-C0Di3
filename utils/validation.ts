/**
 * Input validation utilities for security and data integrity
 */

/**
 * Validation error class for input validation failures
 */
export class ValidationError extends Error {
  public field: string;
  public value: unknown;
  
  constructor(message: string, field: string, value: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Validate that a value is a non-empty string
 */
export function validateNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
  }
  
  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
  }
  
  return value.trim();
}

/**
 * Validate that a value is a valid email address
 */
export function validateEmail(value: unknown, fieldName: string = 'email'): string {
  const email = validateNonEmptyString(value, fieldName);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} is not a valid email address`, fieldName, value);
  }
  
  return email;
}

/**
 * Validate that a value is within a numeric range
 */
export function validateNumberInRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, value);
  }
  
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName,
      value
    );
  }
  
  return value;
}

/**
 * Validate that a string matches a regex pattern
 */
export function validatePattern(
  value: unknown,
  fieldName: string,
  pattern: RegExp,
  description?: string
): string {
  const str = validateNonEmptyString(value, fieldName);
  
  if (!pattern.test(str)) {
    const msg = description
      ? `${fieldName} ${description}`
      : `${fieldName} does not match required pattern`;
    throw new ValidationError(msg, fieldName, value);
  }
  
  return str;
}

/**
 * Sanitize string input to prevent injection attacks
 * Removes potentially dangerous characters and sequences
 */
export function sanitizeInput(input: string, options?: {
  allowHtml?: boolean;
  maxLength?: number;
  allowedChars?: RegExp;
}): string {
  let sanitized = input;
  
  // Enforce max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // If HTML is not allowed, escape HTML entities
  if (!options?.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  // Filter to allowed characters if specified
  if (options?.allowedChars) {
    const chars = sanitized.split('');
    sanitized = chars.filter(char => options.allowedChars!.test(char)).join('');
  }
  
  return sanitized;
}

/**
 * Validate IP address (IPv4 or IPv6)
 */
export function validateIPAddress(value: unknown, fieldName: string = 'ipAddress'): string {
  const ip = validateNonEmptyString(value, fieldName);
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    throw new ValidationError(`${fieldName} is not a valid IP address`, fieldName, value);
  }
  
  return ip;
}

/**
 * Validate hostname
 */
export function validateHostname(value: unknown, fieldName: string = 'hostname'): string {
  const hostname = validateNonEmptyString(value, fieldName);
  
  // Hostname regex: allows alphanumeric, hyphens, and dots
  const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  
  if (!hostnameRegex.test(hostname)) {
    throw new ValidationError(`${fieldName} is not a valid hostname`, fieldName, value);
  }
  
  return hostname;
}

/**
 * Validate array and each element
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  elementValidator: (element: unknown, index: number) => T,
  options?: {
    minLength?: number;
    maxLength?: number;
  }
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
  }
  
  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${options.minLength} elements`,
      fieldName,
      value
    );
  }
  
  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must have at most ${options.maxLength} elements`,
      fieldName,
      value
    );
  }
  
  return value.map((element, index) => {
    try {
      return elementValidator(element, index);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `${fieldName}[${index}]: ${error.message}`,
          `${fieldName}[${index}]`,
          element
        );
      }
      throw error;
    }
  });
}

/**
 * Validate object has required properties
 */
export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  fieldName: string,
  requiredProps: (keyof T)[]
): T {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName, value);
  }
  
  const obj = value as Record<string, unknown>;
  
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      throw new ValidationError(
        `${fieldName} is missing required property: ${String(prop)}`,
        fieldName,
        value
      );
    }
  }
  
  return obj as T;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  const str = validateNonEmptyString(value, fieldName);
  
  if (!allowedValues.includes(str as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      value
    );
  }
  
  return str as T;
}

/**
 * Safe JSON parse with validation
 */
export function safeJSONParse<T = unknown>(
  jsonString: string,
  fieldName: string = 'json'
): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new ValidationError(
      `${fieldName} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      fieldName,
      jsonString
    );
  }
}

/**
 * Validate and sanitize file path
 */
export function validateFilePath(value: unknown, fieldName: string = 'path'): string {
  const path = validateNonEmptyString(value, fieldName);
  
  // Prevent directory traversal
  if (path.includes('..') || path.includes('~')) {
    throw new ValidationError(
      `${fieldName} contains invalid path components`,
      fieldName,
      value
    );
  }
  
  // Prevent null bytes
  if (path.includes('\0')) {
    throw new ValidationError(
      `${fieldName} contains null bytes`,
      fieldName,
      value
    );
  }
  
  return path;
}

/**
 * Validate command arguments to prevent injection
 */
export function validateCommandArgs(
  args: unknown,
  fieldName: string = 'args'
): string[] {
  const argsArray = validateArray(args, fieldName, (arg) => {
    if (typeof arg !== 'string') {
      throw new ValidationError('Argument must be a string', 'arg', arg);
    }
    return arg;
  });
  
  // Check each argument for dangerous characters
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,  // Shell metacharacters
    /\n|\r/,              // Newlines
    /\0/                  // Null bytes
  ];
  
  for (const arg of argsArray) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        throw new ValidationError(
          `${fieldName} contains dangerous characters`,
          fieldName,
          args
        );
      }
    }
  }
  
  return argsArray;
}
