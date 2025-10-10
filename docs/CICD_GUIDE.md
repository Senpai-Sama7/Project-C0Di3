# CI/CD Documentation - Project C0Di3

Comprehensive guide to the Continuous Integration and Continuous Deployment workflows for Project C0Di3.

## Table of Contents

- [Overview](#overview)
- [Workflows](#workflows)
- [Pipeline Architecture](#pipeline-architecture)
- [Configuration](#configuration)
- [Deployment Process](#deployment-process)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

Project C0Di3 uses **GitHub Actions** for CI/CD automation. The pipeline ensures code quality, security, and reliable deployments.

### Key Features

- ✅ Automated testing on every push/PR
- ✅ Multi-Node.js version testing (18, 20)
- ✅ Security scanning (CodeQL, npm audit)
- ✅ Code coverage reporting
- ✅ Deployment validation
- ✅ Performance benchmarking
- ✅ Python linting for Python components

---

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

**Triggers:**
- Push to master/main/develop
- Pull requests to master/main/develop
- Manual dispatch

**Jobs:**

#### Lint and Type Check
- Validates TypeScript compilation
- Checks for type errors
- Ensures code follows standards

#### Build
- Compiles TypeScript to JavaScript
- Uploads build artifacts
- Validates build output

#### Test
- Runs on Node.js 18 and 20
- Executes Jest test suite
- Generates coverage reports
- Uploads to Codecov

#### Security Scan
- Runs npm audit
- Checks for vulnerabilities
- Reports security issues

#### Python Lint
- Lints Python components
- Validates Python code quality

#### Deployment Validation
- Validates deployment scripts
- Checks required files
- Runs on master/main pushes only

#### Report Status
- Aggregates job results
- Fails if critical jobs fail

**Example Run:**
```bash
# Locally simulate CI
npm ci
npm run build
MEMORY_ENCRYPTION_KEY="test-key-minimum-32-characters-long" npm test -- --coverage
```

---

### 2. CodeQL Security Analysis (`codeql.yml`)

**Triggers:**
- Push to master/main/develop
- Pull requests
- Weekly schedule (Monday 00:00 UTC)
- Manual dispatch

**Languages Analyzed:**
- JavaScript/TypeScript
- Python

**Queries:**
- Security extended queries
- Security and quality queries

**Features:**
- Detects security vulnerabilities
- Identifies code quality issues
- Reports to GitHub Security tab

**Example Security Issues Detected:**
- SQL injection vulnerabilities
- XSS vulnerabilities
- Command injection
- Insecure randomness
- Hardcoded credentials

---

### 3. Performance Testing (`performance.yml`)

**Triggers:**
- Pull requests
- Manual dispatch

**Features:**
- Runs performance benchmarks
- Detects performance regressions
- Comments results on PRs

**Benchmark Tests:**
```typescript
// Example benchmark
import { performanceTracker } from '../utils/performance';

describe('Performance Benchmarks', () => {
  it('should complete operation within time limit', () => {
    const start = Date.now();
    
    performOperation();
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // 1 second max
  });
});
```

---

### 4. Existing Workflows

#### Codex Agent (`codex-agent.yml`)
- Neuro-symbolic optimization
- Verification and benchmarks
- Automated PR creation

#### Pylint (`pylint.yml`)
- Python code quality
- Runs on Python 3.8, 3.9, 3.10

#### Manual Workflow (`manual.yml`)
- Manually triggered workflows
- Testing purposes

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Push/PR                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   CI/CD Pipeline                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Lint       │  │    Build     │  │    Test      │      │
│  │              │  │              │  │              │      │
│  │ • TypeScript │  │ • Compile TS │  │ • Unit tests │      │
│  │ • Type check │  │ • Artifacts  │  │ • Integration│      │
│  └──────────────┘  └──────────────┘  │ • Coverage   │      │
│                                       └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Security    │  │   Python     │  │ Deployment   │      │
│  │              │  │              │  │              │      │
│  │ • npm audit  │  │ • Pylint     │  │ • Validate   │      │
│  │ • CodeQL     │  │ • Code qual. │  │ • Scripts    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Status Report & Notifications                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

Required in GitHub Actions secrets:

```bash
# For tests
MEMORY_ENCRYPTION_KEY: test-key-minimum-32-characters-long

# For Codecov (optional)
CODECOV_TOKEN: your-codecov-token

# For deployment (production)
PRODUCTION_SSH_KEY: deployment-ssh-key
PRODUCTION_HOST: production-server-address
```

### Setting Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add name and value
4. Click **Add secret**

### Workflow Permissions

Required permissions in workflows:

```yaml
permissions:
  contents: read          # Read repository
  pull-requests: write    # Comment on PRs
  checks: write          # Create check runs
  security-events: write # CodeQL results
```

---

## Deployment Process

### Pre-Deployment Validation

```bash
# 1. Validate deployment environment
bash scripts/validate-deployment.sh

# 2. Run full test suite
npm test -- --coverage

# 3. Build production version
npm run build

# 4. Check deployment scripts
bash -n scripts/deploy-production.sh
```

### Deployment Steps

1. **Automated Validation**
   - CI pipeline passes all checks
   - Tests pass on all Node versions
   - Security scans show no critical issues
   - Code coverage meets thresholds

2. **Manual Review**
   - Code review by maintainers
   - Deployment checklist verified
   - Documentation updated

3. **Deployment Execution**
   ```bash
   # Production deployment
   bash scripts/deploy-production.sh
   
   # Or using npm script
   npm run deploy
   ```

4. **Post-Deployment**
   - Health checks
   - Monitoring validation
   - Smoke tests

### Deployment Checklist

- [ ] All CI checks pass
- [ ] Code reviewed and approved
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Team notified

---

## Monitoring

### GitHub Actions Dashboard

View workflow runs:
1. Go to **Actions** tab
2. Select workflow
3. View run details

### Status Badges

Add to README.md:

```markdown
![CI/CD](https://github.com/Senpai-Sama7/Project-C0Di3/workflows/CI%2FCD%20Pipeline/badge.svg)
![CodeQL](https://github.com/Senpai-Sama7/Project-C0Di3/workflows/CodeQL/badge.svg)
```

### Artifacts

Download build artifacts:
1. Open workflow run
2. Scroll to **Artifacts** section
3. Download artifact ZIP

Available artifacts:
- `build-artifacts` - Compiled JavaScript
- `coverage-reports` - Test coverage data
- `security-audit` - npm audit results
- `benchmark-results` - Performance data

### Logs

View workflow logs:
1. Open workflow run
2. Click on job name
3. Expand step to see logs

Download logs:
1. Click **⋯** menu in workflow run
2. Select **Download log archive**

---

## Troubleshooting

### Common Issues

#### 1. Test Failures

**Issue**: Tests pass locally but fail in CI

**Solution**:
```bash
# Simulate CI environment
npm ci  # Instead of npm install
NODE_ENV=test npm test

# Check Node.js version
node -v  # Should be 18 or 20
```

#### 2. Build Failures

**Issue**: TypeScript compilation errors

**Solution**:
```bash
# Clear build cache
rm -rf node_modules package-lock.json
npm install

# Check for type errors
npx tsc --noEmit
```

#### 3. Permission Errors

**Issue**: Workflow lacks permissions

**Solution**:
```yaml
# Add to workflow
permissions:
  contents: write
  pull-requests: write
```

#### 4. Timeout Errors

**Issue**: Workflow times out

**Solution**:
```yaml
# Increase timeout in workflow
jobs:
  test:
    timeout-minutes: 30  # Default is 360
```

#### 5. Cache Issues

**Issue**: Outdated cache causes problems

**Solution**:
```yaml
# Add cache invalidation
- uses: actions/cache@v4
  with:
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
```

### Debugging Workflows

#### Enable Debug Logging

1. Go to **Settings** → **Secrets**
2. Add `ACTIONS_STEP_DEBUG = true`
3. Re-run workflow

#### Run Workflow Manually

1. Go to **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Fill in inputs
5. Click **Run workflow**

#### Test Workflow Locally

Use [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -j test
```

---

## Best Practices

### 1. Fast Feedback

- Run critical tests first
- Parallelize jobs when possible
- Cache dependencies

### 2. Clear Failures

- Use descriptive job names
- Add helpful error messages
- Upload artifacts on failure

### 3. Security

- Never commit secrets
- Use GitHub secrets
- Rotate credentials regularly
- Limit permissions

### 4. Maintainability

- Keep workflows DRY
- Use reusable workflows
- Document complex steps
- Version pin actions

### 5. Monitoring

- Set up notifications
- Track build times
- Monitor failure rates
- Review security alerts

---

## Advanced Topics

### Reusable Workflows

Create `.github/workflows/reusable-test.yml`:

```yaml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test
```

Use in other workflows:

```yaml
jobs:
  test-18:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '18'
```

### Matrix Strategies

Test multiple configurations:

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, macos-latest]
    
steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

### Conditional Execution

```yaml
jobs:
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to production"
```

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Jest Documentation](https://jestjs.io/)
- [Project Testing Guide](./TESTING_GUIDE.md)

---

**Last Updated**: 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
