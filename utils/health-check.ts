/**
 * Comprehensive health check system for monitoring service status
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  responseTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface HealthCheckOptions {
  timeout?: number; // Timeout for health check in ms
  critical?: boolean; // If true, failure causes overall health to be unhealthy
}

export type HealthCheckFunction = () => Promise<{
  status: HealthStatus;
  message?: string;
  metadata?: Record<string, any>;
}>;

export class HealthCheck {
  private checks: Map<string, { fn: HealthCheckFunction; options: HealthCheckOptions }> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();

  /**
   * Register a health check
   */
  register(
    name: string,
    checkFn: HealthCheckFunction,
    options: HealthCheckOptions = {}
  ): void {
    this.checks.set(name, {
      fn: checkFn,
      options: {
        timeout: options.timeout || 5000,
        critical: options.critical ?? false
      }
    });
  }

  /**
   * Run a specific health check
   */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    
    try {
      // Run with timeout
      const result = await this.withTimeout(
        check.fn(),
        check.options.timeout || 5000
      );

      const checkResult: HealthCheckResult = {
        name,
        status: result.status,
        message: result.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        metadata: result.metadata
      };

      this.lastResults.set(name, checkResult);
      return checkResult;
    } catch (error) {
      const checkResult: HealthCheckResult = {
        name,
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.lastResults.set(name, checkResult);
      return checkResult;
    }
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<{
    status: HealthStatus;
    checks: HealthCheckResult[];
    timestamp: Date;
  }> {
    const results = await Promise.all(
      Array.from(this.checks.keys()).map(name => this.runCheck(name))
    );

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    
    for (const result of results) {
      const check = this.checks.get(result.name);
      
      if (result.status === HealthStatus.UNHEALTHY) {
        if (check?.options.critical) {
          overallStatus = HealthStatus.UNHEALTHY;
          break;
        } else if (overallStatus === HealthStatus.HEALTHY) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } else if (result.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date()
    };
  }

  /**
   * Get last results without running checks
   */
  getLastResults(): Map<string, HealthCheckResult> {
    return new Map(this.lastResults);
  }

  /**
   * Run with timeout wrapper
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

/**
 * Common health checks factory
 */
export class CommonHealthChecks {
  /**
   * Database connectivity check
   */
  static databaseCheck(
    queryFn: () => Promise<void>,
    name: string = 'database'
  ): { name: string; fn: HealthCheckFunction; options: HealthCheckOptions } {
    return {
      name,
      fn: async () => {
        try {
          await queryFn();
          return {
            status: HealthStatus.HEALTHY,
            message: 'Database connection successful'
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      },
      options: { critical: true, timeout: 5000 }
    };
  }

  /**
   * Memory usage check
   */
  static memoryCheck(
    thresholdPercent: number = 90
  ): { name: string; fn: HealthCheckFunction; options: HealthCheckOptions } {
    return {
      name: 'memory',
      fn: async () => {
        const usage = process.memoryUsage();
        const usedHeapPercent = (usage.heapUsed / usage.heapTotal) * 100;

        if (usedHeapPercent > thresholdPercent) {
          return {
            status: HealthStatus.DEGRADED,
            message: `High memory usage: ${usedHeapPercent.toFixed(2)}%`,
            metadata: {
              heapUsed: usage.heapUsed,
              heapTotal: usage.heapTotal,
              rss: usage.rss
            }
          };
        }

        return {
          status: HealthStatus.HEALTHY,
          message: `Memory usage normal: ${usedHeapPercent.toFixed(2)}%`,
          metadata: {
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            rss: usage.rss
          }
        };
      },
      options: { critical: false, timeout: 1000 }
    };
  }

  /**
   * HTTP endpoint check
   */
  static httpCheck(
    url: string,
    name: string = 'http_endpoint'
  ): { name: string; fn: HealthCheckFunction; options: HealthCheckOptions } {
    return {
      name,
      fn: async () => {
        try {
          const axios = require('axios');
          const response = await axios.get(url, { timeout: 5000 });
          
          if (response.status >= 200 && response.status < 300) {
            return {
              status: HealthStatus.HEALTHY,
              message: `HTTP endpoint ${url} responding`,
              metadata: { statusCode: response.status }
            };
          } else {
            return {
              status: HealthStatus.DEGRADED,
              message: `HTTP endpoint ${url} returned status ${response.status}`,
              metadata: { statusCode: response.status }
            };
          }
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `HTTP endpoint ${url} unreachable: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      },
      options: { critical: true, timeout: 10000 }
    };
  }

  /**
   * Disk space check
   */
  static diskSpaceCheck(
    path: string = '/',
    thresholdPercent: number = 90
  ): { name: string; fn: HealthCheckFunction; options: HealthCheckOptions } {
    return {
      name: 'disk_space',
      fn: async () => {
        try {
          const { execSync } = require('child_process');
          const output = execSync(`df -h ${path} | tail -1`).toString();
          const parts = output.split(/\s+/);
          const usedPercent = parseInt(parts[4]);

          if (usedPercent > thresholdPercent) {
            return {
              status: HealthStatus.DEGRADED,
              message: `High disk usage: ${usedPercent}%`,
              metadata: { usedPercent, path }
            };
          }

          return {
            status: HealthStatus.HEALTHY,
            message: `Disk usage normal: ${usedPercent}%`,
            metadata: { usedPercent, path }
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Failed to check disk space: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      },
      options: { critical: false, timeout: 2000 }
    };
  }
}

/**
 * Example usage:
 * 
 * const healthCheck = new HealthCheck();
 * 
 * // Register checks
 * healthCheck.register('database', async () => {
 *   await db.query('SELECT 1');
 *   return { status: HealthStatus.HEALTHY };
 * }, { critical: true });
 * 
 * healthCheck.register('llm', async () => {
 *   const response = await llmService.health();
 *   return {
 *     status: response.ok ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
 *     message: response.message
 *   };
 * });
 * 
 * // Run all checks
 * const result = await healthCheck.runAll();
 * console.log(`Overall status: ${result.status}`);
 */
