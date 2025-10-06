---
layout: default
title: Operations Guide - Project C0Di3
---

# Operations Guide - Project C0Di3

**Version:** 1.0.0  
**Last Updated:** 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring](#monitoring)
4. [Maintenance](#maintenance)
5. [Incident Response](#incident-response)
6. [Performance Optimization](#performance-optimization)
7. [Security Operations](#security-operations)
8. [Backup and Recovery](#backup-and-recovery)

---

## Overview

This guide provides operational procedures for running and maintaining Project C0Di3 in production.

---

## Daily Operations

### Morning Checks (09:00)

```bash
# 1. Check system status
pm2 status codie-agent

# 2. Review overnight logs
pm2 logs codie-agent --lines 100 --err

# 3. Check system resources
free -h
df -h

# 4. Verify health endpoint
curl http://localhost:3000/health

# 5. Check error rates
grep "ERROR" /var/log/codie/agent.log | tail -n 20
```

### Evening Checks (18:00)

```bash
# 1. Review daily metrics
pm2 monit

# 2. Check for updates
git fetch origin
git status

# 3. Verify backups completed
ls -lh /backups/codie-$(date +%Y%m%d)*

# 4. Review performance metrics
npm run metrics:daily
```

---

## Monitoring

### Key Metrics to Monitor

#### System Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | >80% for 5 min | Investigate processes |
| Memory Usage | >85% | Restart service |
| Disk Usage | >90% | Clean up logs |
| Network Errors | >100/hour | Check connectivity |

#### Application Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response Time | >2 seconds | Optimize queries |
| Error Rate | >5% | Review errors |
| Request Rate | >1000/min | Scale resources |
| LLM Latency | >10 seconds | Check LLM server |

### Monitoring Commands

```bash
# System resources
htop

# Application status
pm2 status
pm2 monit

# Network connections
netstat -plant | grep 3000

# Disk I/O
iostat -x 1

# Memory details
free -m
cat /proc/meminfo
```

### Log Monitoring

```bash
# Real-time logs
tail -f /var/log/codie/agent.log

# Error logs
grep -i error /var/log/codie/agent.log | tail -n 50

# Warning logs
grep -i warn /var/log/codie/agent.log | tail -n 50

# Access logs
grep "API" /var/log/codie/agent.log | tail -n 100
```

---

## Maintenance

### Weekly Maintenance (Sunday 02:00)

```bash
#!/bin/bash
# weekly-maintenance.sh

# 1. Rotate logs
logrotate /etc/logrotate.d/codie

# 2. Clean old logs
find /var/log/codie -name "*.log.*" -mtime +30 -delete

# 3. Optimize database
psql -d codie -c "VACUUM ANALYZE;"

# 4. Clear old cache
rm -rf /var/lib/codie/cache/*

# 5. Update dependencies (test environment first)
npm outdated

# 6. Verify backups
ls -lh /backups/codie-* | tail -n 7

# 7. Generate weekly report
npm run report:weekly > /reports/week-$(date +%Y%W).txt
```

### Monthly Maintenance

```bash
#!/bin/bash
# monthly-maintenance.sh

# 1. Full system backup
./scripts/full-backup.sh

# 2. Security updates
apt update
apt list --upgradable

# 3. Certificate renewal (if applicable)
certbot renew

# 4. Performance audit
npm run audit:performance

# 5. Security audit
npm audit
npm run audit:security

# 6. Generate monthly report
npm run report:monthly > /reports/month-$(date +%Y%m).txt
```

### Quarterly Maintenance

- Review and update documentation
- Conduct security penetration testing
- Review and optimize database indexes
- Evaluate and upgrade dependencies
- Review and update monitoring thresholds
- Conduct disaster recovery drill

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 - Critical | System down | Immediate |
| P1 - High | Major functionality broken | 1 hour |
| P2 - Medium | Minor functionality affected | 4 hours |
| P3 - Low | Cosmetic issues | 1 business day |

### Incident Response Procedures

#### P0: System Down

```bash
# 1. Check service status
pm2 status codie-agent
systemctl status codie-agent

# 2. Check recent logs
pm2 logs codie-agent --lines 100 --err

# 3. Check system resources
free -h
df -h
top

# 4. Attempt restart
pm2 restart codie-agent
# OR
systemctl restart codie-agent

# 5. If restart fails, check configuration
npm run config:validate

# 6. Check database connectivity
psql -d codie -c "SELECT 1;"

# 7. Check LLM server
curl http://localhost:11434/api/generate

# 8. If all else fails, rollback
git checkout <last-stable-commit>
npm install
npm run build
pm2 restart codie-agent
```

#### P1: High Priority

```bash
# 1. Identify affected functionality
npm run diagnose

# 2. Review error logs
grep -A 10 -B 5 "ERROR" /var/log/codie/agent.log | tail -n 50

# 3. Check related services
# - Database
# - LLM server
# - External APIs

# 4. Apply hotfix if available
git cherry-pick <fix-commit>
npm run build
pm2 restart codie-agent

# 5. Monitor for resolution
tail -f /var/log/codie/agent.log
```

### Escalation Path

1. **On-Call Engineer** → 2. **Senior Engineer** → 3. **Engineering Lead** → 4. **CTO**

---

## Performance Optimization

### Database Performance

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze table statistics
ANALYZE memories;
ANALYZE interactions;

-- Rebuild indexes
REINDEX TABLE memories;

-- Update statistics
VACUUM ANALYZE;
```

### Application Performance

```bash
# Profile Node.js application
NODE_OPTIONS="--prof" npm start
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect bin/cli.js
# Then connect with Chrome DevTools

# Identify memory leaks
node --trace-gc bin/cli.js

# Monitor event loop lag
npm run monitor:eventloop
```

### Cache Optimization

```javascript
// Adjust cache settings in .env
MEMORY_CACHE_SIZE=20000      // Increase for more caching
MEMORY_CACHE_TTL=7200        // Increase for longer retention

// Clear cache if needed
redis-cli FLUSHDB  // If using Redis
# OR
rm -rf /var/lib/codie/cache/*
```

### Rate Limiting Tuning

```bash
# Adjust rate limits in .env
RATE_LIMIT_LLM=200        // Requests per minute
RATE_LIMIT_TOOLS=100      // Requests per minute
RATE_LIMIT_MEMORY=2000    // Requests per minute
```

---

## Security Operations

### Security Monitoring

```bash
# Check for failed authentication attempts
grep "Authentication failed" /var/log/codie/agent.log

# Monitor suspicious activities
grep -i "injection\|exploit\|malicious" /var/log/codie/agent.log

# Check for rate limit violations
grep "Rate limit exceeded" /var/log/codie/agent.log
```

### Security Hardening

```bash
# Update dependencies
npm audit fix

# Check for known vulnerabilities
npm audit

# Run security scan
npm run security:scan

# Review file permissions
ls -la /var/lib/codie
chmod 600 .env
```

### Access Control

```bash
# Review active sessions
# (Implementation specific)

# Rotate JWT secrets (monthly)
# 1. Generate new secret
openssl rand -base64 64

# 2. Update .env
# JWT_SECRET=new-secret

# 3. Restart service
pm2 restart codie-agent
```

---

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# 1. Backup database
echo "Backing up database..."
pg_dump codie | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# 2. Backup memory files
echo "Backing up memory files..."
tar -czf $BACKUP_DIR/memory-$DATE.tar.gz /var/lib/codie/memory

# 3. Backup configuration
echo "Backing up configuration..."
cp .env $BACKUP_DIR/env-$DATE.bak

# 4. Remove old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.bak" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Recovery Procedures

#### Database Recovery

```bash
# 1. Stop service
pm2 stop codie-agent

# 2. Restore database
gunzip < /backups/db-20240101_020000.sql.gz | psql codie

# 3. Verify restoration
psql -d codie -c "SELECT COUNT(*) FROM memories;"

# 4. Start service
pm2 start codie-agent
```

#### Memory Files Recovery

```bash
# 1. Stop service
pm2 stop codie-agent

# 2. Restore memory files
tar -xzf /backups/memory-20240101_020000.tar.gz -C /

# 3. Verify files
ls -lh /var/lib/codie/memory

# 4. Start service
pm2 start codie-agent
```

#### Complete System Recovery

```bash
# 1. Restore code
git checkout <last-stable-tag>
npm install
npm run build

# 2. Restore configuration
cp /backups/env-20240101_020000.bak .env

# 3. Restore database
gunzip < /backups/db-20240101_020000.sql.gz | psql codie

# 4. Restore memory files
tar -xzf /backups/memory-20240101_020000.tar.gz -C /

# 5. Start service
pm2 start codie-agent

# 6. Verify health
curl http://localhost:3000/health
```

---

## Runbook: Common Tasks

### Task: Restart Service

```bash
pm2 restart codie-agent
# OR
systemctl restart codie-agent

# Verify
pm2 status codie-agent
curl http://localhost:3000/health
```

### Task: Update Application

```bash
# 1. Backup current version
./scripts/backup.sh

# 2. Pull updates
git pull origin main

# 3. Install dependencies
npm install

# 4. Run tests
npm test

# 5. Build
npm run build

# 6. Restart
pm2 restart codie-agent

# 7. Verify
curl http://localhost:3000/health
pm2 logs codie-agent --lines 50
```

### Task: Clear Cache

```bash
# Stop service
pm2 stop codie-agent

# Clear cache
rm -rf /var/lib/codie/cache/*

# Restart
pm2 start codie-agent
```

### Task: Rotate Logs

```bash
# Manual rotation
logrotate -f /etc/logrotate.d/codie

# Verify
ls -lh /var/log/codie/
```

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | +1-XXX-XXX-XXXX | 24/7 |
| Senior Engineer | +1-XXX-XXX-XXXX | Business hours |
| Engineering Lead | +1-XXX-XXX-XXXX | Business hours |
| System Admin | +1-XXX-XXX-XXXX | 24/7 |

---

## Support Resources

- **Documentation**: `/docs/` directory
- **Runbooks**: `/docs/runbooks/`
- **Monitoring**: Grafana dashboard
- **Logs**: `/var/log/codie/`
- **Backups**: `/backups/`

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Project C0Di3 Operations Team
