# C0DI3 Deployment Guide

## Quick Start Deployment

### Prerequisites
- Node.js v18+ installed
- Git installed
- Basic Linux/Unix environment
- 4GB+ RAM available
- 10GB+ disk space

### Step 1: Clone and Setup
```bash
git clone <repository-url>
cd Project-C0DI3
npm install
```

### Step 2: Verify Installation
```bash
# Test core functionality
node test-mock-cag.js

# Test CLI
node bin/cli.js --help
```

### Step 3: Start Limited Production
```bash
# Run with mock LLM client (immediate deployment)
node bin/cli.js --health-check
```

## Production Deployment

### Option A: Limited Production (Mock LLM)
**Use Case**: Testing, development, proof of concept
**Time**: 5 minutes
**Risk**: Low

```bash
# 1. Set environment variables
export NODE_ENV=production
export MEMORY_VECTOR_STORE=inmemory
export LOG_LEVEL=info

# 2. Start the system
node bin/cli.js --health-check

# 3. Test core features
node bin/cli.js --cyber-query "What is SQL injection?"
node bin/cli.js --list-tools
```

### Option B: Full Production (Real LLM)
**Use Case**: Production cybersecurity operations
**Time**: 30-60 minutes
**Risk**: Medium

#### Step 1: Install LLM Dependencies
```bash
# Install build tools
sudo apt update
sudo apt install -y cmake build-essential

# Build llama.cpp
cd llama.cpp
mkdir build && cd build
cmake .. && make -j$(nproc)
cd ../..
```

#### Step 2: Start LLM Server
```bash
# Start llama.cpp server with Gemma model
cd llama.cpp
./build/bin/server -m ../models/gemma-3n-E4B-it-UD-Q4_K_XL.gguf --port 8000
```

#### Step 3: Configure Environment
```bash
# Set LLM server URL
export LLM_API_URL=http://localhost:8000
export NODE_ENV=production
export MEMORY_VECTOR_STORE=inmemory
```

#### Step 4: Start Production System
```bash
# Start the agent
node bin/cli.js --health-check
```

## Configuration Options

### Environment Variables
```bash
# Core Configuration
export NODE_ENV=production
export LOG_LEVEL=info
export MEMORY_VECTOR_STORE=inmemory

# LLM Configuration
export LLM_API_URL=http://localhost:8000
export MODEL_PATH=models/gemma-3n-E4B-it-UD-Q4_K_XL.gguf

# Memory Configuration
export MEMORY_PERSISTENCE_PATH=./data/memory
export MEMORY_CACHE_SIZE=10000
export MEMORY_CACHE_TTL=3600

# Logging Configuration
export LOG_AUDIT_DIR=./data/logs
export LOG_LEVEL=info

# Security Configuration
export AGENT_ENCRYPTION_KEY=your-32-byte-hex-key
```

### Configuration File
Create `.env` file in project root:
```env
NODE_ENV=production
LLM_API_URL=http://localhost:8000
MEMORY_VECTOR_STORE=inmemory
LOG_LEVEL=info
AGENT_ENCRYPTION_KEY=your-32-byte-hex-key
```

## Security Tools Installation

### Red Team Tools
```bash
# Nmap (network scanning)
sudo apt install nmap

# SQLMap (SQL injection testing)
sudo apt install sqlmap

# Metasploit (penetration testing)
curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
chmod +x msfinstall
./msfinstall
```

### Blue Team Tools
```bash
# Snort (IDS)
sudo apt install snort

# Suricata (IDS/IPS)
sudo apt install suricata

# Wazuh (SIEM)
# Follow official installation guide

# YARA (malware detection)
sudo apt install yara
```

## Monitoring and Maintenance

### Health Checks
```bash
# System health
node bin/cli.js --health-check

# Performance metrics
node bin/cli.js --performance-report

# Self-healing
node bin/cli.js --self-heal
```

### Log Monitoring
```bash
# View audit logs
node bin/cli.js --audit-log

# Analyze logs for anomalies
node bin/cli.js --analyze-logs

# Query specific logs
node bin/cli.js --query-logs '{"severity": "high", "time_range": "24h"}'
```

### Cache Management
```bash
# View CAG cache stats
node bin/cli.js cag:stats

# Clear cache if needed
node bin/cli.js cag:clear

# Export cache for backup
node bin/cli.js cag:export cache-backup.json
```

## Troubleshooting

### Common Issues

#### 1. LLM Server Connection Failed
```bash
# Check if server is running
curl http://localhost:8000/health

# Restart server
cd llama.cpp
./build/bin/server -m ../models/gemma-3n-E4B-it-UD-Q4_K_XL.gguf --port 8000
```

#### 2. TypeScript Compilation Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript configuration
npx tsc --noEmit
```

#### 3. Memory Issues
```bash
# Check system resources
free -h
df -h

# Restart with reduced cache
export MEMORY_CACHE_SIZE=1000
node bin/cli.js --health-check
```

#### 4. Tool Execution Failures
```bash
# Check tool permissions
ls -la /usr/bin/nmap
ls -la /usr/bin/sqlmap

# Test tool availability
which nmap
which sqlmap
```

### Performance Optimization

#### CAG Cache Tuning
```bash
# Increase cache size for better hit rates
export CAG_CACHE_SIZE=2000
export CAG_SIMILARITY_THRESHOLD=0.95

# Pre-warm cache with common queries
node bin/cli.js cag:prewarm
```

#### Memory Optimization
```bash
# Use in-memory store for speed
export MEMORY_VECTOR_STORE=inmemory

# Or use persistent store for reliability
export MEMORY_VECTOR_STORE=chromadb
```

## Production Checklist

### Pre-Deployment
- [x] Core system tested and verified
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Security tools installed (if needed)
- [x] LLM server running (for full production)
- [x] Monitoring configured
- [x] Backup procedures established

### Post-Deployment
- [ ] Health check passed
- [ ] Performance metrics acceptable
- [ ] Security tools accessible
- [ ] Knowledge base queries working
- [ ] CAG functionality operational
- [ ] Audit logging active
- [ ] User access configured

## Scaling Considerations

### Vertical Scaling
- Increase server RAM for larger models
- Use SSD storage for better I/O
- Optimize cache sizes based on usage

### Horizontal Scaling
- Deploy multiple instances behind load balancer
- Use shared database for memory persistence
- Implement session management

### Performance Monitoring
```bash
# Monitor system resources
htop
iotop

# Monitor application metrics
node bin/cli.js --performance-report

# Monitor cache performance
node bin/cli.js cag:stats
```

## Security Considerations

### Network Security
- Run LLM server on localhost only
- Use firewall rules to restrict access
- Implement proper authentication

### Data Security
- Encrypt sensitive data at rest
- Use secure environment variables
- Implement audit logging

### Tool Security
- Run security tools in isolated environments
- Implement proper permissions
- Monitor tool execution

## Support and Maintenance

### Regular Maintenance
- Weekly health checks
- Monthly performance reviews
- Quarterly security audits
- Annual system updates

### Backup Procedures
```bash
# Backup configuration
cp .env .env.backup

# Backup cache
node bin/cli.js cag:export cache-backup.json

# Backup logs
tar -czf logs-backup.tar.gz data/logs/
```

### Update Procedures
```bash
# Update dependencies
npm update

# Update LLM model
# Download new model file and restart server

# Update security tools
sudo apt update && sudo apt upgrade
```

---

*Deployment Guide Version: 1.0*
*Last Updated: July 6, 2025*
*System Version: C0DI3 v1.0*
