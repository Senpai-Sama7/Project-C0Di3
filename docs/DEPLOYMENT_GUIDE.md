# Deployment Guide - Project C0Di3

**Version:** 1.0.0  
**Last Updated:** 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Deployment Steps](#deployment-steps)
6. [Verification](#verification)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Security Checklist](#security-checklist)
10. [Rollback Procedures](#rollback-procedures)

---

## Overview

This guide provides step-by-step instructions for deploying Project C0Di3 to production environments.

### Deployment Architecture

```
┌─────────────────────────────────────────────┐
│            Load Balancer (Optional)          │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼────┐            ┌─────▼───┐
│ Node 1 │            │ Node 2  │
│ (Core) │            │ (Core)  │
└───┬────┘            └─────┬───┘
    │                       │
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │                       │
┌───▼────────┐    ┌─────────▼──┐
│  Database  │    │  LLM Server │
│ (Optional) │    │  (Gemma)    │
└────────────┘    └─────────────┘
```

---

## Prerequisites

### System Requirements

**Minimum:**
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 20GB SSD
- **OS:** Ubuntu 20.04 LTS or later

**Recommended:**
- **CPU:** 8 cores
- **RAM:** 16GB
- **Storage:** 50GB SSD
- **OS:** Ubuntu 22.04 LTS

### Software Requirements

- **Node.js:** >= 18.0.0
- **npm:** >= 9.0.0
- **Git:** >= 2.0.0
- **Python:** >= 3.8 (for security tools)

### LLM Requirements

- **Gemma 3n:4B** model (local deployment)
- **llama.cpp** server running
- Minimum 6GB RAM for LLM

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/Senpai-Sama7/Project-C0Di3.git
cd Project-C0Di3
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install --production

# Build TypeScript
npm run build
```

### 3. Install Security Tools (Optional)

```bash
# Install Python dependencies for security tools
pip3 install -r requirements/requirements.txt

# Build llama.cpp (if not already installed)
bash scripts/build-llama-production.sh
```

---

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Required Configuration
MEMORY_ENCRYPTION_KEY=your-secure-32-character-minimum-encryption-key-here

# LLM Configuration
LLM_API_URL=http://localhost:11434
LLM_MODEL=gemma3n:4b
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2048

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=/var/log/codie/agent.log

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Rate Limiting
RATE_LIMIT_LLM=100
RATE_LIMIT_TOOLS=50
RATE_LIMIT_MEMORY=1000

# Memory Configuration
MEMORY_VECTOR_STORE=postgres  # or 'chromadb', 'in-memory'
MEMORY_PERSISTENCE_PATH=/var/lib/codie/memory
MEMORY_CACHE_SIZE=10000
MEMORY_CACHE_TTL=3600

# Database Configuration (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/codie
DATABASE_POOL_SIZE=10

# Security
ENABLE_AUTH=true
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRY=24h

# Tool Configuration
TOOLS_SANDBOX=true
TOOLS_TIMEOUT=300000  # 5 minutes
```

### 2. Generate Encryption Key

```bash
# Generate a secure encryption key (32+ characters)
openssl rand -base64 32
```

Set this as `MEMORY_ENCRYPTION_KEY` in your `.env` file.

### 3. Database Setup (if using PostgreSQL)

```bash
# Create database
createdb codie

# Run migrations (if applicable)
npm run db:migrate
```

---

## Deployment Steps

### Development Deployment

```bash
# Run in development mode
npm run dev
```

### Production Deployment

#### Option 1: Direct Node.js

```bash
# Build project
npm run build

# Start production server
npm start
```

#### Option 2: PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start bin/cli.js --name codie-agent

# Enable startup script
pm2 startup
pm2 save

# View logs
pm2 logs codie-agent

# Monitor
pm2 monit
```

#### Option 3: Docker Deployment

```bash
# Build Docker image
docker build -t codie-agent:latest .

# Run container
docker run -d \
  --name codie-agent \
  -p 3000:3000 \
  --env-file .env \
  -v /var/lib/codie:/var/lib/codie \
  codie-agent:latest

# View logs
docker logs -f codie-agent
```

#### Option 4: Systemd Service

Create `/etc/systemd/system/codie-agent.service`:

```ini
[Unit]
Description=Project C0Di3 AI Agent
After=network.target

[Service]
Type=simple
User=codie
WorkingDirectory=/opt/codie/Project-C0Di3
Environment=NODE_ENV=production
EnvironmentFile=/opt/codie/Project-C0Di3/.env
ExecStart=/usr/bin/node /opt/codie/Project-C0Di3/bin/cli.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable codie-agent
sudo systemctl start codie-agent
sudo systemctl status codie-agent
```

---

## Verification

### 1. Health Check

```bash
# Check if service is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","uptime":123,"memory":{"used":100,"total":1000}}
```

### 2. API Test

```bash
# Test reasoning endpoint
curl -X POST http://localhost:3000/api/reason \
  -H "Content-Type: application/json" \
  -d '{"input":"Test security analysis"}'
```

### 3. Memory System Test

```bash
# Verify memory encryption
npm run test:memory

# Expected: All tests pass
```

### 4. Tool Integration Test

```bash
# Test tool registry
npm run test:tools

# Expected: All tools available
```

---

## Monitoring

### 1. Application Logs

```bash
# View logs (PM2)
pm2 logs codie-agent

# View logs (systemd)
journalctl -u codie-agent -f

# View logs (Docker)
docker logs -f codie-agent
```

### 2. Performance Metrics

```bash
# Monitor process (PM2)
pm2 monit

# Monitor system resources
top -p $(pgrep -f codie-agent)
```

### 3. Health Monitoring

Set up monitoring endpoints:

```javascript
// Health check endpoint
GET /health

// Metrics endpoint
GET /metrics

// Status endpoint
GET /status
```

### 4. Alerting

Configure alerts for:
- High memory usage (>80%)
- High CPU usage (>80%)
- Error rate increase
- Response time degradation
- Service downtime

---

## Troubleshooting

### Common Issues

#### Issue: Service Won't Start

**Symptoms:** Service fails to start or crashes immediately

**Solutions:**
1. Check environment variables are set correctly
2. Verify `MEMORY_ENCRYPTION_KEY` is at least 32 characters
3. Check database connectivity
4. Review logs for specific errors

```bash
# Check logs
journalctl -u codie-agent -n 50
```

#### Issue: Memory Encryption Error

**Error:** "MEMORY_ENCRYPTION_KEY must be set and at least 32 characters"

**Solution:**
```bash
# Generate new key
openssl rand -base64 32

# Update .env file
echo "MEMORY_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
```

#### Issue: LLM Connection Error

**Symptoms:** Cannot connect to LLM server

**Solutions:**
1. Verify LLM server is running
2. Check `LLM_API_URL` is correct
3. Test connectivity:

```bash
curl http://localhost:11434/api/generate
```

#### Issue: High Memory Usage

**Symptoms:** Application using excessive memory

**Solutions:**
1. Reduce `MEMORY_CACHE_SIZE`
2. Lower `MEMORY_CACHE_TTL`
3. Implement memory cleanup:

```bash
# Restart service
pm2 restart codie-agent
```

#### Issue: Tool Execution Failures

**Symptoms:** Security tools not executing

**Solutions:**
1. Verify tools are installed
2. Check tool permissions
3. Enable sandbox mode:

```bash
# In .env
TOOLS_SANDBOX=true
```

### Debug Mode

Enable debug logging:

```bash
# Set log level
LOG_LEVEL=debug

# Restart service
pm2 restart codie-agent

# View debug logs
pm2 logs codie-agent --lines 100
```

---

## Security Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Encryption key generated (32+ characters)
- [ ] Database credentials secured
- [ ] JWT secret generated
- [ ] API authentication enabled
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Tool sandbox enabled
- [ ] Security tools tested

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Logs being written correctly
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Security audit completed
- [ ] Penetration testing completed

### Continuous Security

- [ ] Regular dependency updates
- [ ] Security patch monitoring
- [ ] Log review (weekly)
- [ ] Performance review (weekly)
- [ ] Security audit (monthly)
- [ ] Backup verification (monthly)

---

## Rollback Procedures

### Quick Rollback

```bash
# PM2
pm2 stop codie-agent
git checkout <previous-commit>
npm install
npm run build
pm2 start codie-agent

# Systemd
sudo systemctl stop codie-agent
git checkout <previous-commit>
npm install
npm run build
sudo systemctl start codie-agent
```

### Docker Rollback

```bash
# Stop current container
docker stop codie-agent

# Remove container
docker rm codie-agent

# Pull previous image
docker pull codie-agent:previous-tag

# Start previous version
docker run -d \
  --name codie-agent \
  -p 3000:3000 \
  --env-file .env \
  codie-agent:previous-tag
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d codie < backup.sql

# Or run migration rollback
npm run db:rollback
```

---

## Performance Tuning

### Node.js Optimization

```bash
# Increase max memory
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Enable garbage collection logs
NODE_OPTIONS="--trace-gc" npm start
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_memory_timestamp ON memories(timestamp);
CREATE INDEX idx_memory_context ON memories(context);

-- Analyze tables
ANALYZE memories;
```

### Caching Strategy

```javascript
// Adjust cache settings
MEMORY_CACHE_SIZE=20000
MEMORY_CACHE_TTL=7200
```

---

## Backup and Recovery

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump codie > /backups/codie-$DATE.sql
tar -czf /backups/memory-$DATE.tar.gz /var/lib/codie/memory
```

### Recovery Procedure

```bash
# Restore database
pg_restore -d codie < /backups/codie-20240101.sql

# Restore memory files
tar -xzf /backups/memory-20240101.tar.gz -C /var/lib/codie/
```

---

## Support

For deployment issues:
- **Documentation**: Review `docs/` directory
- **Issues**: GitHub Issues
- **Security**: security@project-codie.org

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Project C0Di3 Team
