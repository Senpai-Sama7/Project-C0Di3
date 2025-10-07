# Production Deployment Quick Start

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for containerized deployment)
- Kubernetes cluster (for K8s deployment)
- Git

## Quick Start Guide

### 1. Local Development Setup

```bash
# Clone repository
git clone https://github.com/Senpai-Sama7/Project-C0Di3.git
cd Project-C0Di3

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Generate secure keys
echo "MEMORY_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Build TypeScript
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

### 2. Docker Deployment

```bash
# Build Docker image
docker build -t core-agent:latest .

# Run with Docker Compose
docker-compose up -d

# Check health
curl http://localhost:3000/health

# View logs
docker-compose logs -f core-agent
```

### 3. Kubernetes Deployment

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Configure secrets (edit first!)
kubectl apply -f k8s/configmap.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml

# Expose service
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n core-agent
kubectl logs -n core-agent deployment/core-agent
```

### 4. Production Readiness Validation

```bash
# Run validation script
bash scripts/validate-production-readiness.sh

# Check deployment readiness
bash scripts/test-production.sh
```

## Infrastructure Overview

### CI/CD Pipeline
- Automated testing on push/PR
- Code quality checks (ESLint, Prettier)
- Security scanning (npm audit)
- Multi-node test matrix
- Build artifact generation

### Container Orchestration
- Production-ready Dockerfile
- Docker Compose for local development
- Full Kubernetes deployment manifests
- Health checks and graceful shutdowns

### Monitoring & Observability
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- Comprehensive logging
- Performance tracking

## Environment Variables

See `.env.example` for all configuration options.

**Required**:
- `MEMORY_ENCRYPTION_KEY` - Encryption key (min 32 chars)
- `JWT_SECRET` - JWT secret (min 32 chars)

**Optional**:
- `NODE_ENV` - Environment (development/production)
- `LLM_API_URL` - LLM service URL
- `LOG_ANALYZER_URL` - Log analyzer service URL
- `POSTGRES_HOST` - Database host
- `REDIS_HOST` - Redis cache host

## Development Commands

```bash
# Linting and formatting
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
npm run format        # Format code with Prettier
npm run format:check  # Check formatting

# Testing
npm test              # Run test suite
npm run test:watch    # Watch mode
npm run test:coverage # With coverage

# Building
npm run build         # Compile TypeScript
npm run typecheck     # Type checking only
```

## Documentation

- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Performance Tuning](docs/PERFORMANCE_TUNING.md) - Optimization strategies
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) - Code usage examples

## Security

- Non-root Docker containers
- Secret management via environment variables
- Security scanning in CI/CD
- Input validation and sanitization
- Rate limiting and circuit breakers

## Support

For issues and questions:
1. Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Search existing GitHub issues
3. Create a new issue with detailed information

## License

MIT License - See LICENSE file for details

---

*For complete documentation, see the main [README.md](../README.md)*
