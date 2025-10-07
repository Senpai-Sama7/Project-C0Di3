# Troubleshooting Guide - Project C0Di3

## Table of Contents
1. [Common Issues](#common-issues)
2. [Build Problems](#build-problems)
3. [Test Failures](#test-failures)
4. [Runtime Errors](#runtime-errors)
5. [Performance Issues](#performance-issues)
6. [Deployment Problems](#deployment-problems)
7. [Security Concerns](#security-concerns)
8. [Debugging Tips](#debugging-tips)

---

## Common Issues

### Node Modules Not Found

**Symptom**: `Cannot find module` errors

**Solution**:
```bash
# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build
```

### TypeScript Compilation Errors

**Symptom**: `tsc` fails with type errors

**Solution**:
```bash
# Check TypeScript configuration
npm run typecheck

# Fix common issues
npm run lint:fix

# Clean build
rm -rf *.js **/*.js
npm run build
```

### Environment Variables Not Set

**Symptom**: Application fails to start with missing configuration

**Solution**:
```bash
# Copy environment template
cp .env.example .env

# Generate secure keys
echo "MEMORY_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Edit .env with your values
nano .env
```

---

## Build Problems

### Build Fails with Memory Error

**Symptom**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Missing Dependencies

**Symptom**: Build fails with module not found

**Solution**:
```bash
# Verify all dependencies are installed
npm ci

# Check for peer dependency issues
npm ls

# Update outdated packages (with caution)
npm outdated
npm update
```

---

## Test Failures

### Jest Configuration Issues

**Symptom**: Tests fail to run or incorrect test environment

**Solution**:
```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/path/to/test.test.ts
```

### Test Timeout Errors

**Symptom**: Tests fail with timeout exceeded

**Solution**:
```bash
# Increase test timeout in jest.config.js
# Or use --testTimeout flag
npm test -- --testTimeout=10000
```

### Mock/Stub Issues

**Symptom**: Tests fail due to module mocking problems

**Solution**:
```typescript
// Ensure proper mock setup
jest.mock('../../utils/module', () => ({
  function: jest.fn()
}));

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## Runtime Errors

### Application Crashes on Startup

**Symptom**: Process exits immediately or with error

**Diagnosis**:
```bash
# Check logs
tail -f logs/core-agent.log

# Run with debug mode
NODE_ENV=development npm start

# Check for port conflicts
lsof -i :3000
```

**Common Causes**:
1. Missing environment variables
2. Port already in use
3. Database connection failure
4. Insufficient permissions

### Memory Leaks

**Symptom**: Memory usage continuously increases

**Diagnosis**:
```bash
# Monitor memory usage
node --inspect bin/cli.js

# Use Chrome DevTools for heap snapshots
# Navigate to chrome://inspect
```

**Solutions**:
- Clear caches periodically
- Implement proper cleanup in event handlers
- Use weak references where appropriate
- Review long-lived objects

### Unhandled Promise Rejections

**Symptom**: `UnhandledPromiseRejectionWarning`

**Solution**:
```typescript
// Always handle promise rejections
async function operation() {
  try {
    await riskyOperation();
  } catch (error) {
    logger.error('Operation failed', error);
    // Handle or rethrow
  }
}

// Global handler (last resort)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
```

---

## Performance Issues

### Slow Response Times

**Diagnosis**:
```bash
# Enable performance monitoring
export ENABLE_METRICS=true
npm start

# Check metrics endpoint
curl http://localhost:9090/metrics
```

**Common Causes**:
1. Unoptimized database queries
2. Missing cache implementation
3. Synchronous operations blocking event loop
4. Large payload processing

**Solutions**:
```typescript
// Use memoization for expensive operations
import { memoize } from './utils/performance';
const cached = memoize(expensiveFunction, { ttl: 3600000 });

// Implement batching
import { BatchProcessor } from './utils/performance';
const processor = new BatchProcessor(batchOperation);

// Use connection pooling
import { ConnectionPool } from './utils/connection-pool';
const pool = new ConnectionPool({ min: 2, max: 10 });
```

### High CPU Usage

**Diagnosis**:
```bash
# Profile CPU usage
node --prof bin/cli.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

**Solutions**:
- Optimize algorithms (reduce O(n²) operations)
- Use worker threads for CPU-intensive tasks
- Implement rate limiting
- Add concurrency controls

### Database Performance

**Symptoms**: Slow queries, connection timeouts

**Solutions**:
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_memory_timestamp ON memories(timestamp);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM table WHERE condition;

-- Enable query logging
SET log_statement = 'all';
```

---

## Deployment Problems

### Docker Build Failures

**Symptom**: Docker image build fails

**Solution**:
```bash
# Build with verbose output
docker build --progress=plain -t core-agent:latest .

# Check .dockerignore
cat .dockerignore

# Clean Docker cache
docker system prune -af
docker build --no-cache -t core-agent:latest .
```

### Kubernetes Pod CrashLoopBackOff

**Symptom**: Pods repeatedly crash

**Diagnosis**:
```bash
# Check pod logs
kubectl logs -n core-agent deployment/core-agent --tail=100

# Describe pod for events
kubectl describe pod -n core-agent <pod-name>

# Check resource limits
kubectl top pods -n core-agent
```

**Common Causes**:
1. Missing secrets/configmaps
2. Insufficient resources
3. Health check failures
4. Application configuration errors

### Health Check Failures

**Symptom**: Load balancer marks service unhealthy

**Diagnosis**:
```bash
# Test health endpoint
curl -v http://localhost:3000/health

# Check response time
time curl http://localhost:3000/health

# Review health check configuration
cat k8s/deployment.yaml | grep -A 10 livenessProbe
```

---

## Security Concerns

### Exposed Secrets

**Prevention**:
```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore

# Scan for leaked secrets
npm install -g git-secrets
git secrets --scan

# Use environment variables
export SENSITIVE_VALUE="..."
```

### Dependency Vulnerabilities

**Detection**:
```bash
# Run npm audit
npm audit

# Check for high/critical vulnerabilities
npm audit --audit-level=high

# Fix automatically (with caution)
npm audit fix
```

### Rate Limit Bypass

**Symptom**: Excessive requests getting through

**Solution**:
```typescript
// Implement rate limiting
import { TokenBucket } from './utils/rate-limiter';

const rateLimiter = new TokenBucket({
  capacity: 100,
  tokensPerInterval: 10,
  interval: 'second'
});

// Apply to routes
await rateLimiter.execute(async () => {
  // Protected operation
});
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug
npm start

# Use debug package
DEBUG=* npm start
DEBUG=core:* npm start
```

### Remote Debugging

```bash
# Start with inspect flag
node --inspect=0.0.0.0:9229 bin/cli.js

# Connect with Chrome DevTools
# Navigate to chrome://inspect
```

### TypeScript Source Maps

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSourceMap": false
  }
}
```

### Performance Profiling

```bash
# Generate CPU profile
node --prof bin/cli.js

# Generate heap snapshot
node --inspect bin/cli.js
# In Chrome DevTools: Memory > Take heap snapshot
```

### Database Query Debugging

```typescript
// Enable query logging
import { Pool } from 'pg';
const pool = new Pool({
  // ... config
  log: (msg) => console.log('[SQL]', msg)
});
```

---

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Review error logs carefully
3. Search existing issues on GitHub
4. Verify your environment configuration
5. Try reproducing in a clean environment

### Information to Provide

When reporting issues, include:

- Operating system and version
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Relevant error messages and stack traces
- Steps to reproduce the issue
- Configuration (sanitized, no secrets)
- Recent changes or deployments

### Useful Commands

```bash
# System information
uname -a
node --version
npm --version

# Environment check
env | grep -i core

# Network diagnostics
netstat -tulpn | grep :3000
ss -tulpn | grep :3000

# Process information
ps aux | grep node
top -p $(pgrep node)
```

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Performance Tuning](./PERFORMANCE_TUNING.md)

---

*Last Updated: 2024*
*Version: 1.0.0*
