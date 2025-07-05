#!/bin/bash

# Enhanced System Setup Script for Core Agent
# This script sets up all backend features, services, and dependencies

set -e

echo "🚀 Setting up Core Agent Enhanced Backend Features..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check system requirements
check_requirements() {
    print_step "Checking system requirements..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.8+ and try again."
        exit 1
    fi

    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is not installed. Please install pip3 and try again."
        exit 1
    fi

    print_status "System requirements check passed!"
}

# Install Node.js dependencies
install_node_dependencies() {
    print_step "Installing Node.js dependencies..."

    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    npm install
    print_status "Node.js dependencies installed successfully!"
}

# Setup Python log analyzer service
setup_log_analyzer() {
    print_step "Setting up log analyzer microservice..."

    cd services/log-analyzer

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt

    # Test the service
    print_status "Testing log analyzer service..."
    python3 -c "from anomaly_detector import AnomalyDetector; print('✅ Log analyzer service ready')"

    deactivate
    cd ../..

    print_status "Log analyzer microservice setup complete!"
}

# Create data directories
setup_data_directories() {
    print_step "Creating data directories..."

    mkdir -p data/logs
    mkdir -p data/memory
    mkdir -p data/learning
    mkdir -p data/cache
    mkdir -p data/backups

    print_status "Data directories created!"
}

# Setup configuration files
setup_configuration() {
    print_step "Setting up configuration files..."

    # Create default configuration if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating default .env file..."
        cat > .env << EOF
# Core Agent Configuration
LLM_API_URL=http://localhost:8000
LOG_LEVEL=info
SIMULATION_MODE=false
USER_MODE=beginner

# Log Analyzer Service
LOG_ANALYZER_URL=http://localhost:5001

# Memory Configuration
MEMORY_VECTOR_STORE=chromadb
MEMORY_PERSISTENCE_PATH=./data/memory
MEMORY_CACHING_ENABLED=true

# Performance Monitoring
PERFORMANCE_METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=300000

# Security Settings
AUDIT_LOG_DIR=./data/logs
ENCRYPTION_ENABLED=true
EOF
        print_status "Default .env file created. Please review and customize as needed."
    else
        print_status ".env file already exists."
    fi
}

# Setup systemd services (Linux only)
setup_systemd_services() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_step "Setting up systemd services..."

        # Create log analyzer service
        cat > /tmp/core-agent-log-analyzer.service << EOF
[Unit]
Description=Core Agent Log Analyzer Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/services/log-analyzer
Environment=PATH=$(pwd)/services/log-analyzer/venv/bin
ExecStart=$(pwd)/services/log-analyzer/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        print_status "Systemd service files created in /tmp/"
        print_warning "To install services, run: sudo cp /tmp/core-agent-*.service /etc/systemd/system/ && sudo systemctl enable core-agent-log-analyzer"
    else
        print_warning "Systemd service setup skipped (not on Linux)"
    fi
}

# Create shell scripts for easy management
create_management_scripts() {
    print_step "Creating management scripts..."

    # Start script
    cat > start-services.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Core Agent services..."

# Start log analyzer service
cd services/log-analyzer
source venv/bin/activate
python app.py &
LOG_ANALYZER_PID=$!
echo "📊 Log analyzer started (PID: $LOG_ANALYZER_PID)"
cd ../..

# Start main agent
echo "🤖 Core Agent ready!"
echo "Use 'node bin/cli.js --help' for available commands"
echo "Use 'kill $LOG_ANALYZER_PID' to stop log analyzer service"
EOF

    chmod +x start-services.sh

    # Stop script
    cat > stop-services.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Core Agent services..."

# Stop log analyzer service
pkill -f "python app.py"
echo "📊 Log analyzer stopped"

echo "✅ All services stopped"
EOF

    chmod +x stop-services.sh

    # Health check script
    cat > health-check.sh << 'EOF'
#!/bin/bash
echo "🏥 Running Core Agent health check..."

# Check if log analyzer is running
if pgrep -f "python app.py" > /dev/null; then
    echo "✅ Log analyzer service: Running"
else
    echo "❌ Log analyzer service: Not running"
fi

# Run agent health check
node bin/cli.js --health-check
EOF

    chmod +x health-check.sh

    print_status "Management scripts created!"
}

# Build documentation
build_documentation() {
    print_step "Building documentation..."

    mkdir -p docs

    # Generate API documentation
    cat > docs/README.md << 'EOF'
# Core Agent Documentation

## Overview
Core Agent is an advanced autonomous cybersecurity agent with comprehensive reasoning, learning, and monitoring capabilities.

## Features

### 🔍 Log Analysis & SIEM
- Real-time anomaly detection using machine learning
- Persistent audit logging with queryable interface
- Automated threat detection and alerting

### 🎓 Interactive Learn Mode
- Step-by-step training missions
- Real-time feedback and hints
- Progress tracking and achievements
- Simulated environment for safe learning

### 🏥 Health Monitoring & Self-Healing
- Continuous system health monitoring
- Automated self-healing procedures
- Performance metrics and reporting
- Proactive issue detection

### 🛠️ Advanced Tool Integration
- Red team tools (nmap, burpsuite, sqlmap)
- Blue team tools (snort, osquery, yara)
- Simulation mode for safe operation
- Fine-grained permission system

## Quick Start

1. **Setup**: Run `./scripts/setup.sh` to install all dependencies
2. **Start**: Run `./start-services.sh` to start all services
3. **Use**: Run `node bin/cli.js --help` for available commands

## Command Line Interface

### Basic Usage
```bash
# Interactive prompt
node bin/cli.js

# Direct prompt
node bin/cli.js --prompt "Scan network for vulnerabilities"

# Set mode
node bin/cli.js --mode beginner --simulation true
```

### Log Analysis
```bash
# Analyze logs for anomalies
node bin/cli.js --analyze-logs

# Query audit logs
node bin/cli.js --query-logs '{"level": "error"}'

# View recent log entries
node bin/cli.js --audit-log
```

### Learn Mode
```bash
# Enter interactive learning mode
node bin/cli.js --learn-mode

# List available missions
node bin/cli.js --list-missions

# Start a specific mission
node bin/cli.js --start-mission reconnaissance-basics

# Check progress
node bin/cli.js --mission-progress

# Explain a concept
node bin/cli.js --explain "SQL injection"
```

### Health & Monitoring
```bash
# System health check
node bin/cli.js --health-check

# Performance report
node bin/cli.js --performance-report

# Self-healing diagnostic
./health-check.sh
```

### Tool Execution
```bash
# List available tools
node bin/cli.js --list-tools

# Run a specific tool
node bin/cli.js --tool nmap --args '{"target": "127.0.0.1", "ports": "80,443"}'
```

## Configuration

The agent can be configured through the `.env` file:

```env
# Core Settings
LLM_API_URL=http://localhost:8000
LOG_LEVEL=info
USER_MODE=beginner|intermediate|advanced|pro
SIMULATION_MODE=true|false

# Services
LOG_ANALYZER_URL=http://localhost:5001

# Memory & Performance
MEMORY_VECTOR_STORE=chromadb|inmemory|postgres
PERFORMANCE_METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=300000
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Interface │    │  Web Interface  │    │   API Gateway   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │     GemmaAgent Core       │
                   └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐    ┌───────────▼───────────┐    ┌───────▼───────┐
│  Reasoning    │    │    Memory System      │    │  Tool Registry │
│  Engine       │    │                       │    │               │
│               │    │  • Episodic Memory    │    │  • Red Team   │
│ • Zero-Shot   │    │  • Semantic Memory    │    │  • Blue Team  │
│ • Darwin-Gödel│    │  • Vector Store       │    │  • OSINT      │
│ • Absolute-0  │    │  • Concept Graph      │    │               │
└───────────────┘    └───────────────────────┘    └───────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐    ┌───────────▼───────────┐    ┌───────▼───────┐
│  Learn Mode   │    │   Log Analysis &      │    │ Health Monitor│
│  Service      │    │   SIEM Service        │    │ & Self-Heal   │
│               │    │                       │    │               │
│ • Missions    │    │  • Anomaly Detection  │    │ • Health Check│
│ • Feedback    │    │  • Pattern Analysis   │    │ • Auto-Repair │
│ • Progress    │    │  • Alert Generation   │    │ • Performance │
└───────────────┘    └───────────────────────┘    └───────────────┘
```

## Security Considerations

- All tool executions are logged for audit
- Simulation mode prevents actual system changes
- Fine-grained permission system
- Encrypted data storage options
- Secure API communication

## Troubleshooting

### Common Issues

1. **Service won't start**: Check if ports 5001 and 8000 are available
2. **Python dependencies fail**: Ensure Python 3.8+ and pip are installed
3. **Permission denied**: Check file permissions and user access
4. **Memory issues**: Adjust memory limits in configuration

### Logs

- Application logs: `data/logs/`
- Audit logs: `data/logs/audit.log`
- Service logs: Check systemd journal for services

### Support

For issues and feature requests, please check the project repository.
EOF

    print_status "Documentation built in docs/ directory!"
}

# Main setup function
main() {
    echo -e "${BLUE}Core Agent Enhanced Backend Setup${NC}"
    echo "========================================"

    check_requirements
    install_node_dependencies
    setup_data_directories
    setup_configuration
    setup_log_analyzer
    setup_systemd_services
    create_management_scripts
    build_documentation

    echo ""
    echo -e "${GREEN}🎉 Setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and customize .env file"
    echo "2. Run './start-services.sh' to start all services"
    echo "3. Run 'node bin/cli.js --help' to see available commands"
    echo "4. Try 'node bin/cli.js --learn-mode' for interactive learning"
    echo ""
    echo "Documentation available in docs/README.md"
}

# Run main function
main "$@"
