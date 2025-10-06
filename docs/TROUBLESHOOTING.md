# Troubleshooting Guide - Project C0Di3

Common issues and their solutions for Project C0Di3.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Problems](#build-problems)
- [Test Failures](#test-failures)
- [Runtime Errors](#runtime-errors)
- [Deployment Issues](#deployment-issues)
- [Performance Problems](#performance-problems)
- [CI/CD Issues](#cicd-issues)
- [Getting Help](#getting-help)

---

## Installation Issues

### Issue: `npm install` fails with EACCES error

**Symptoms:**
```
npm ERR! Error: EACCES: permission denied
```

**Solutions:**
1. **Don't use sudo** with npm (security risk)
2. **Fix npm permissions:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```
3. **Use nvm (Node Version Manager):**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

---

### Issue: Module not found errors after installation

**Symptoms:**
```
Error: Cannot find module 'axios'
```

**Solutions:**
1. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **Verify node_modules exists:**
   ```bash
   ls node_modules/
   ```
3. **Check package.json for missing dependencies**

---

### Issue: TypeScript compilation fails during installation

**Symptoms:**
```
error TS2307: Cannot find module 'axios' or its corresponding type declarations.
```

**Solutions:**
1. **Install all dependencies including types:**
   ```bash
   npm install
   ```
2. **Verify TypeScript version:**
   ```bash
   npx tsc --version  # Should be 5.2.2+
   ```
3. **Check tsconfig.json is present**

---

## Build Problems

### Issue: Build fails with type errors

**Symptoms:**
```
error TS2322: Type 'string' is not assignable to type 'number'
```

**Solutions:**
1. **Check TypeScript strict mode settings in tsconfig.json**
2. **Fix type mismatches in your code**
3. **Use type assertions carefully:**
   ```typescript
   const value = input as number;  // Use sparingly
   ```

---

### Issue: Build is slow

**Solutions:**
1. **Use incremental compilation:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true
     }
   }
   ```
2. **Exclude unnecessary files:**
   ```json
   {
     "exclude": ["node_modules", "coverage", "dist"]
   }
   ```
3. **Use faster build tool:**
   ```bash
   npm install -D esbuild
   ```

---

### Issue: JavaScript files not being generated

**Symptoms:**
- TypeScript builds without errors
- No .js files in output directory

**Solutions:**
1. **Check tsconfig.json outDir:**
   ```json
   {
     "compilerOptions": {
       "outDir": "./dist"
     }
   }
   ```
2. **Ensure files are included:**
   ```json
   {
     "include": ["**/*.ts"]
   }
   ```
3. **Check for .gitignore blocking .js files**

---

## Test Failures

### Issue: Tests fail with "MEMORY_ENCRYPTION_KEY must be set"

**Symptoms:**
```
Error: MEMORY_ENCRYPTION_KEY must be set and at least 32 characters
```

**Solutions:**
1. **Set environment variable:**
   ```bash
   export MEMORY_ENCRYPTION_KEY="test-key-minimum-32-characters-long-secure"
   npm test
   ```
2. **Create .env.test file:**
   ```bash
   echo 'MEMORY_ENCRYPTION_KEY="test-key-minimum-32-characters-long-secure"' > .env.test
   ```
3. **Add to test script:**
   ```json
   {
     "scripts": {
       "test": "MEMORY_ENCRYPTION_KEY=\"test-key-32-chars-minimum\" jest"
     }
   }
   ```

---

### Issue: Jest can't find modules

**Symptoms:**
```
Cannot find module '../../utils/logger' from 'test/utils/logger.test.ts'
```

**Solutions:**
1. **Clear Jest cache:**
   ```bash
   npx jest --clearCache
   ```
2. **Check jest.config.js:**
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx']
   };
   ```
3. **Verify file paths are correct**

---

### Issue: Tests timeout

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solutions:**
1. **Increase timeout for specific test:**
   ```typescript
   it('slow test', async () => {
     await slowOperation();
   }, 30000); // 30 seconds
   ```
2. **Increase global timeout in jest.config.js:**
   ```javascript
   module.exports = {
     testTimeout: 10000
   };
   ```
3. **Check for unresolved promises**

---

### Issue: Memory leaks in tests

**Symptoms:**
```
A worker process has failed to exit gracefully
```

**Solutions:**
1. **Clean up in afterEach:**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     jest.clearAllTimers();
   });
   ```
2. **Use --detectOpenHandles:**
   ```bash
   npm test -- --detectOpenHandles
   ```
3. **Close connections:**
   ```typescript
   afterAll(async () => {
     await database.close();
     await server.close();
   });
   ```

---

## Runtime Errors

### Issue: "Port already in use" error

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. **Find and kill the process:**
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```
2. **Change port in .env:**
   ```bash
   PORT=3001
   ```
3. **Use dynamic port:**
   ```typescript
   const port = process.env.PORT || 0; // 0 = random available port
   ```

---

### Issue: "Cannot find module" at runtime

**Symptoms:**
```
Error: Cannot find module './compiled-file.js'
```

**Solutions:**
1. **Build before running:**
   ```bash
   npm run build
   npm start
   ```
2. **Check module paths in compiled JS**
3. **Verify files are compiled to correct location**

---

### Issue: Environment variables not loading

**Symptoms:**
- `process.env.VARIABLE` is undefined
- Configuration not working

**Solutions:**
1. **Load dotenv early:**
   ```typescript
   import 'dotenv/config';
   ```
2. **Check .env file exists:**
   ```bash
   ls -la .env
   ```
3. **Verify .env format:**
   ```bash
   KEY=value
   # No spaces around =
   # No quotes needed (usually)
   ```

---

## Deployment Issues

### Issue: Deployment script fails with permission denied

**Symptoms:**
```
bash: ./scripts/deploy-production.sh: Permission denied
```

**Solutions:**
1. **Make script executable:**
   ```bash
   chmod +x scripts/deploy-production.sh
   ```
2. **Run with bash explicitly:**
   ```bash
   bash scripts/deploy-production.sh
   ```

---

### Issue: Dependencies not installed on production server

**Solutions:**
1. **Use npm ci instead of npm install:**
   ```bash
   npm ci --production
   ```
2. **Check package-lock.json exists**
3. **Verify Node.js version on server:**
   ```bash
   node -v  # Should be 18+
   ```

---

### Issue: Environment variables missing in production

**Solutions:**
1. **Verify .env file on server:**
   ```bash
   cat .env
   ```
2. **Check environment variable in process:**
   ```bash
   printenv | grep ENCRYPTION_KEY
   ```
3. **Use secrets management:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - GitHub Secrets (for CI/CD)

---

## Performance Problems

### Issue: High memory usage

**Symptoms:**
- Application crashes with "Out of memory"
- Slow performance over time

**Solutions:**
1. **Increase Node.js memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```
2. **Check for memory leaks:**
   ```bash
   node --inspect bin/cli.js
   # Open chrome://inspect in Chrome
   ```
3. **Use memory profiling:**
   ```typescript
   console.log(process.memoryUsage());
   ```

---

### Issue: Slow API responses

**Solutions:**
1. **Add caching:**
   ```typescript
   import { MemoryCache } from './memory/memory-cache';
   const cache = new MemoryCache({ maxSize: 1000, ttl: 3600000 });
   ```
2. **Use connection pooling**
3. **Optimize database queries**
4. **Add performance monitoring:**
   ```typescript
   const start = Date.now();
   // ... operation
   console.log(`Duration: ${Date.now() - start}ms`);
   ```

---

### Issue: High CPU usage

**Solutions:**
1. **Profile CPU usage:**
   ```bash
   node --prof bin/cli.js
   node --prof-process isolate-*.log > processed.txt
   ```
2. **Optimize algorithms**
3. **Use worker threads for CPU-intensive tasks**
4. **Implement rate limiting**

---

## CI/CD Issues

### Issue: GitHub Actions workflow fails

**Symptoms:**
- Workflow fails in CI but passes locally
- Different behavior on different runners

**Solutions:**
1. **Check Node.js version:**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'
   ```
2. **Use npm ci instead of npm install:**
   ```yaml
   - run: npm ci
   ```
3. **Check for environment-specific code**

---

### Issue: Tests pass locally but fail in CI

**Solutions:**
1. **Replicate CI environment:**
   ```bash
   npm ci
   NODE_ENV=test npm test
   ```
2. **Check for timing issues**
3. **Use fixed timestamps in tests:**
   ```typescript
   jest.useFakeTimers();
   ```

---

### Issue: Deployment workflow times out

**Solutions:**
1. **Increase timeout:**
   ```yaml
   jobs:
     deploy:
       timeout-minutes: 30
   ```
2. **Optimize build process**
3. **Use caching:**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: node_modules
       key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
   ```

---

## Getting Help

### Before Asking for Help

1. **Search existing issues:**
   - Check GitHub Issues
   - Search documentation
   - Review closed issues

2. **Gather information:**
   - Node.js version: `node -v`
   - npm version: `npm -v`
   - Operating system
   - Error messages (full stack trace)
   - Steps to reproduce

3. **Create minimal reproduction:**
   - Isolate the problem
   - Remove unnecessary code
   - Create a small test case

### How to Ask for Help

1. **GitHub Issues:**
   - Use issue templates
   - Provide reproduction steps
   - Include error logs
   - Tag appropriately

2. **GitHub Discussions:**
   - For questions and general help
   - Share solutions that helped you
   - Be respectful and patient

3. **Documentation:**
   - Check README.md
   - Review docs/ directory
   - Read CONTRIBUTING.md

### Creating a Bug Report

Include:
- **Description:** Clear description of the issue
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Steps to reproduce:**
  1. Step 1
  2. Step 2
  3. etc.
- **Environment:**
  - OS: Ubuntu 22.04
  - Node: v20.0.0
  - npm: v9.0.0
- **Logs:** Relevant error messages
- **Code:** Minimal reproduction code

### Template for Bug Reports

```markdown
## Description
Brief description of the issue

## Steps to Reproduce
1. Step 1
2. Step 2
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: 
- Node.js: 
- npm: 
- Project version: 

## Error Logs
```
Paste error logs here
```

## Additional Context
Any other relevant information
```

---

## Quick Reference

### Common Commands

```bash
# Clean install
rm -rf node_modules package-lock.json && npm install

# Clear caches
npm cache clean --force
npx jest --clearCache

# Run with debug
DEBUG=* npm start

# Check for security issues
npm audit

# Update dependencies
npm update

# Check outdated packages
npm outdated
```

### Useful Tools

- **nvm:** Node.js version manager
- **npx:** Run npm packages without installing
- **npm-check:** Check for outdated dependencies
- **node-inspector:** Debug Node.js applications
- **pm2:** Process manager for Node.js

---

**Last Updated**: 2024  
**Version**: 1.0.0

For additional help, visit:
- [GitHub Issues](https://github.com/Senpai-Sama7/Project-C0Di3/issues)
- [Documentation](./README.md)
- [Contributing Guide](../CONTRIBUTING.md)
