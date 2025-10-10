# Operational Runbook - Project C0Di3

## Table of Contents
1. [System Overview](#system-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring & Alerts](#monitoring--alerts)
4. [Incident Response](#incident-response)
5. [Backup & Recovery](#backup--recovery)
6. [Maintenance Tasks](#maintenance-tasks)
7. [Emergency Procedures](#emergency-procedures)

---

## System Overview

### Architecture Components
- **Core Agent**: Main application (Node.js/TypeScript)
- **PostgreSQL**: Primary database
- **Redis**: Cache layer
- **LLM Service**: Local AI model (llama.cpp)
- **Log Analyzer**: Security log analysis service

### Service Dependencies
```
Core Agent ← depends on → PostgreSQL
            ← depends on → Redis
            ← depends on → LLM Service (optional)
            ← depends on → Log Analyzer (optional)
```

### Ports
- `3000`: Main application
- `3001`: Health check service
- `5432`: PostgreSQL
- `6379`: Redis
- `8000`: LLM Service
- `5001`: Log Analyzer

---

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] Review change log and release notes
- [ ] Backup current database
- [ ] Verify environment configuration
- [ ] Check resource availability (CPU, memory, disk)
- [ ] Notify stakeholders of deployment window
- [ ] Prepare rollback plan

### Standard Deployment (Docker)

```bash
# 1. Pull latest changes
git pull origin main

# 2. Build new image
docker build -t core-agent:latest .

# 3. Stop current containers
docker-compose down

# 4. Start new containers
docker-compose up -d

# 5. Verify health
curl http://localhost:3000/health

# 6. Check logs
docker-compose logs -f core-agent
```

### Kubernetes Deployment

```bash
# 1. Update deployment
kubectl apply -f k8s/deployment.yaml

# 2. Monitor rollout
kubectl rollout status deployment/core-agent -n core-agent

# 3. Verify pods
kubectl get pods -n core-agent

# 4. Check logs
kubectl logs -n core-agent deployment/core-agent --tail=100
```

### Rollback Procedures

**Docker Rollback**:
```bash
# Tag current as backup
docker tag core-agent:latest core-agent:backup

# Revert to previous version
docker pull core-agent:previous-tag
docker-compose up -d
```

**Kubernetes Rollback**:
```bash
# Rollback to previous revision
kubectl rollout undo deployment/core-agent -n core-agent

# Rollback to specific revision
kubectl rollout undo deployment/core-agent --to-revision=2 -n core-agent

# Check rollout status
kubectl rollout status deployment/core-agent -n core-agent
```

---

## Monitoring & Alerts

### Health Checks

**Manual Health Check**:
```bash
# Application health
curl http://localhost:3000/health

# Component health
curl http://localhost:3000/health | jq '.checks'

# Readiness check
curl http://localhost:3000/ready
```

**Automated Monitoring**:
```bash
# Kubernetes health checks (configured in deployment.yaml)
- livenessProbe: /health (every 30s)
- readinessProbe: /health (every 10s)

# Docker health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3
```

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|--------|
| Response Time (P95) | > 1s | > 2s | Scale up |
| Error Rate | > 1% | > 5% | Investigate immediately |
| CPU Usage | > 70% | > 90% | Scale up or optimize |
| Memory Usage | > 80% | > 95% | Scale up or fix leaks |
| Database Connections | > 80% of max | > 95% of max | Increase pool size |
| Disk Usage | > 80% | > 90% | Clean up or expand |

### Log Locations

**Docker**:
```bash
docker-compose logs core-agent
docker logs <container-id>
```

**Kubernetes**:
```bash
kubectl logs -n core-agent deployment/core-agent
kubectl logs -n core-agent <pod-name> --previous
```

**File System**:
```
/app/logs/core-agent.log       # Application logs
/app/logs/error.log            # Error logs
/app/logs/access.log           # Access logs
/var/log/syslog                # System logs
```

---

## Incident Response

### Severity Levels

**P0 - Critical**: Service down, data loss, security breach
**P1 - High**: Severe performance degradation, partial outage
**P2 - Medium**: Non-critical feature broken, performance issues
**P3 - Low**: Minor issues, no user impact

### Incident Response Workflow

1. **Detection**: Alert triggered or issue reported
2. **Assessment**: Determine severity and impact
3. **Communication**: Notify team and stakeholders
4. **Investigation**: Gather logs, metrics, traces
5. **Mitigation**: Apply immediate fix or workaround
6. **Resolution**: Implement permanent fix
7. **Post-Mortem**: Document and share learnings

### Common Incidents

#### Application Not Starting

**Symptoms**: Container/pod crashes on startup

**Investigation**:
```bash
# Check logs
kubectl logs <pod-name> --previous

# Check environment
kubectl describe pod <pod-name>

# Verify configuration
kubectl get configmap core-agent-config -o yaml
```

**Common Causes**:
- Missing environment variables
- Invalid configuration
- Database connection failure
- Port conflicts

#### High Response Times

**Symptoms**: Slow API responses, timeouts

**Investigation**:
```bash
# Check resource usage
kubectl top pods -n core-agent

# Check database
# Connect to PostgreSQL and run:
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check Redis
redis-cli INFO stats
```

**Immediate Actions**:
- Scale up replicas
- Clear cache
- Restart services
- Check for slow queries

#### Memory Leaks

**Symptoms**: Gradual memory increase, OOM kills

**Investigation**:
```bash
# Monitor memory usage
watch -n 5 'ps aux | grep node'

# Get heap dump
kill -USR2 <pid>

# Analyze with Chrome DevTools
```

**Immediate Actions**:
- Restart affected pods
- Increase memory limits temporarily
- Enable memory profiling
- Review recent code changes

---

## Backup & Recovery

### Database Backups

**Automated Backup** (Daily):
```bash
#!/bin/bash
# /scripts/backup-db.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -h $POSTGRES_HOST \
        -U $POSTGRES_USER \
        -d $POSTGRES_DB \
        -F c \
        -f "$BACKUP_DIR/backup_$DATE.dump"

# Compress
gzip "$BACKUP_DIR/backup_$DATE.dump"

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.dump.gz" -mtime +30 -delete
```

**Manual Backup**:
```bash
# Create backup
docker exec postgres pg_dump -U coreagent core_agent > backup.sql

# Kubernetes
kubectl exec -n core-agent postgres-0 -- pg_dump -U coreagent core_agent > backup.sql
```

**Restore from Backup**:
```bash
# Docker
docker exec -i postgres psql -U coreagent core_agent < backup.sql

# Kubernetes
kubectl exec -i -n core-agent postgres-0 -- psql -U coreagent core_agent < backup.sql
```

### Application State Backups

**Configuration Backup**:
```bash
# Kubernetes
kubectl get configmap,secret -n core-agent -o yaml > config-backup.yaml

# Environment files
tar -czf env-backup.tar.gz .env docker-compose.yml k8s/
```

**Restore Configuration**:
```bash
kubectl apply -f config-backup.yaml
```

---

## Maintenance Tasks

### Daily Tasks
- [ ] Review error logs
- [ ] Check system health metrics
- [ ] Verify backup completion
- [ ] Monitor resource usage

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Update dependencies (if needed)
- [ ] Clean up old logs
- [ ] Test backup restoration
- [ ] Review security alerts

### Monthly Tasks
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning
- [ ] Disaster recovery drill
- [ ] Update documentation

### Scheduled Maintenance

**Log Rotation**:
```bash
# Configure logrotate
/etc/logrotate.d/core-agent
```

**Database Maintenance**:
```bash
# Vacuum and analyze
VACUUM ANALYZE;

# Reindex
REINDEX DATABASE core_agent;

# Update statistics
ANALYZE;
```

**Cache Cleanup**:
```bash
# Redis
redis-cli FLUSHDB

# Application cache
curl -X POST http://localhost:3000/admin/cache/clear
```

---

## Emergency Procedures

### Service Outage

1. **Immediate Actions**:
   ```bash
   # Check service status
   kubectl get pods -n core-agent
   
   # Check health
   curl http://localhost:3000/health
   
   # Review logs
   kubectl logs -n core-agent deployment/core-agent --tail=100
   ```

2. **Escalation**:
   - Notify on-call engineer
   - Create incident ticket
   - Communicate to stakeholders

3. **Recovery**:
   - Restart services
   - Scale up resources
   - Apply hotfix if needed

### Database Corruption

1. **Stop Application**:
   ```bash
   kubectl scale deployment/core-agent --replicas=0 -n core-agent
   ```

2. **Verify Corruption**:
   ```bash
   # PostgreSQL integrity check
   SELECT * FROM pg_catalog.pg_database;
   ```

3. **Restore from Backup**:
   ```bash
   # Restore latest backup
   psql -U coreagent core_agent < /backups/latest.sql
   ```

4. **Verify and Restart**:
   ```bash
   # Verify data integrity
   # Run data validation queries
   
   # Restart application
   kubectl scale deployment/core-agent --replicas=2 -n core-agent
   ```

### Security Breach

1. **Isolate System**:
   ```bash
   # Block external access
   kubectl scale ingress core-agent-ingress --replicas=0
   ```

2. **Investigate**:
   - Review access logs
   - Check for unauthorized changes
   - Identify breach vector

3. **Remediate**:
   - Rotate all secrets
   - Apply security patches
   - Update firewall rules

4. **Recovery**:
   - Restore from clean backup
   - Re-enable services gradually
   - Monitor closely

---

## Contact Information

### On-Call Rotation
- Primary: [Contact Info]
- Secondary: [Contact Info]
- Manager: [Contact Info]

### External Dependencies
- Infrastructure Team: [Contact]
- Database Team: [Contact]
- Security Team: [Contact]

### Escalation Path
1. On-Call Engineer
2. Team Lead
3. Engineering Manager
4. CTO

---

*Last Updated: 2024*
*Version: 1.0.0*
*Next Review: [Date]*
