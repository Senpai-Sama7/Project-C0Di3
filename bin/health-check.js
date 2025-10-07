#!/usr/bin/env node

/**
 * Health Check Endpoint
 * Provides comprehensive health status for monitoring and load balancing
 */

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = process.env.HEALTH_CHECK_PORT || 3001;

/**
 * Health check components
 */
const healthChecks = {
  /**
   * Check system resources
   */
  async system() {
    try {
      const { stdout: memInfo } = await execAsync('free -m || vm_stat 2>/dev/null || echo "unknown"');
      const { stdout: diskInfo } = await execAsync('df -h / || echo "unknown"');
      
      return {
        status: 'healthy',
        memory: memInfo.includes('unknown') ? 'unknown' : 'available',
        disk: diskInfo.includes('unknown') ? 'unknown' : 'available'
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message
      };
    }
  },

  /**
   * Check Node.js process
   */
  async process() {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.floor(memory.rss / 1024 / 1024),
        heapTotal: Math.floor(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.floor(memory.heapUsed / 1024 / 1024)
      }
    };
  },

  /**
   * Check database connectivity (if applicable)
   */
  async database() {
    // Placeholder for database check
    // In production, implement actual database ping
    return {
      status: 'healthy',
      message: 'Database check not implemented'
    };
  },

  /**
   * Check external dependencies
   */
  async dependencies() {
    const checks = [];
    
    // Check LLM service if URL is configured
    if (process.env.LLM_API_URL) {
      checks.push(
        fetch(`${process.env.LLM_API_URL}/health`)
          .then(() => ({ service: 'llm', status: 'healthy' }))
          .catch(() => ({ service: 'llm', status: 'unhealthy' }))
      );
    }
    
    const results = await Promise.all(checks);
    const allHealthy = results.every(r => r.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: results
    };
  }
};

/**
 * Perform all health checks
 */
async function performHealthChecks() {
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    const checkPromises = Object.entries(healthChecks).map(async ([name, checkFn]) => {
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        return [name, result];
      } catch (error) {
        return [name, { status: 'unhealthy', error: error.message }];
      }
    });

    const checkResults = await Promise.all(checkPromises);
    
    for (const [name, result] of checkResults) {
      results.checks[name] = result;
      if (result.status !== 'healthy') {
        results.status = 'degraded';
      }
    }
  } catch (error) {
    results.status = 'unhealthy';
    results.error = error.message;
  }

  return results;
}

/**
 * HTTP server for health checks
 */
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    try {
      const health = await performHealthChecks();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2));
    }
  } else if (req.url === '/ready') {
    // Readiness probe - simpler check
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Readiness endpoint: http://localhost:${PORT}/ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Health check server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Health check server closed');
    process.exit(0);
  });
});
