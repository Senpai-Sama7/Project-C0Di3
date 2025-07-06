#!/bin/bash

# Core Agent Production Deployment Script
# Comprehensive setup for production environment

set -e

echo "🚀 Core Agent Production Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Some features may not work correctly."
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

print_status "Project root: $PROJECT_ROOT"

# Step 1: Install system dependencies
print_status "Step 1: Installing system dependencies..."

# Update package lists
if command -v apt-get >/dev/null 2>&1; then
    print_status "Using apt package manager"
    sudo apt-get update
    sudo apt-get install -y build-essential cmake git wget curl python3 python3-pip nodejs npm
elif command -v yum >/dev/null 2>&1; then
    print_status "Using yum package manager"
    sudo yum update -y
    sudo yum groupinstall -y "Development Tools"
    sudo yum install -y cmake git wget curl python3 python3-pip nodejs npm
elif command -v dnf >/dev/null 2>&1; then
    print_status "Using dnf package manager"
    sudo dnf update -y
    sudo dnf groupinstall -y "Development Tools"
    sudo dnf install -y cmake git wget curl python3 python3-pip nodejs npm
elif command -v pacman >/dev/null 2>&1; then
    print_status "Using pacman package manager"
    sudo pacman -Syu --noconfirm
    sudo pacman -S --noconfirm base-devel cmake git wget curl python3 python-pip nodejs npm
else
    print_error "Unsupported package manager. Please install dependencies manually."
    exit 1
fi

print_success "System dependencies installed"

# Step 2: Install Node.js dependencies
print_status "Step 2: Installing Node.js dependencies..."

cd "$PROJECT_ROOT"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please ensure you're in the correct directory."
    exit 1
fi

# Install npm dependencies
npm install

print_success "Node.js dependencies installed"

# Step 3: Build llama.cpp for production
print_status "Step 3: Building llama.cpp for production..."

# Check if llama.cpp directory exists
if [ ! -d "llama.cpp" ]; then
    print_error "llama.cpp directory not found. Please ensure the repository is properly cloned."
    exit 1
fi

cd llama.cpp

# Create build directory
mkdir -p build
cd build

# Configure CMake with production optimizations
print_status "Configuring CMake with production optimizations..."

# Detect system architecture and available features
ARCH=$(uname -m)
CMAKE_OPTIONS="-DCMAKE_BUILD_TYPE=Release"

# Add architecture-specific optimizations
if [[ "$ARCH" == "x86_64" ]]; then
    CMAKE_OPTIONS="$CMAKE_OPTIONS -DLLAMA_AVX=ON -DLLAMA_AVX2=ON -DLLAMA_F16C=ON"
    print_status "Enabling x86_64 optimizations (AVX, AVX2, F16C)"
elif [[ "$ARCH" == "aarch64" ]]; then
    CMAKE_OPTIONS="$CMAKE_OPTIONS -DLLAMA_BLAS=ON"
    print_status "Enabling ARM64 optimizations with BLAS"
fi

# Check for CUDA
if command -v nvcc >/dev/null 2>&1; then
    CMAKE_OPTIONS="$CMAKE_OPTIONS -DLLAMA_CUBLAS=ON"
    print_status "CUDA detected - enabling CUDA acceleration"
fi

# Check for OpenBLAS
if pkg-config --exists openblas; then
    CMAKE_OPTIONS="$CMAKE_OPTIONS -DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS"
    print_status "OpenBLAS detected - enabling BLAS acceleration"
fi

# Configure and build
cmake .. $CMAKE_OPTIONS
make -j$(nproc)

print_success "llama.cpp built successfully"

# Step 4: Install the core shortcut globally
print_status "Step 4: Installing core shortcut globally..."

cd "$PROJECT_ROOT"

# Make the core script executable
chmod +x bin/core

# Create symbolic link in /usr/local/bin
if command -v sudo >/dev/null 2>&1; then
    sudo ln -sf "$PROJECT_ROOT/bin/core" /usr/local/bin/core

    if [ $? -eq 0 ]; then
        print_success "Core Agent shortcut installed globally"
    else
        print_warning "Failed to create global shortcut. Creating local installation..."

        # Fallback to local installation
        mkdir -p "$HOME/.local/bin"
        ln -sf "$PROJECT_ROOT/bin/core" "$HOME/.local/bin/core"

        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
            print_status "Added to PATH in shell configuration files"
        fi

        print_success "Core Agent shortcut installed locally"
    fi
else
    print_warning "sudo not available. Creating local installation..."

    # Local installation
    mkdir -p "$HOME/.local/bin"
    ln -sf "$PROJECT_ROOT/bin/core" "$HOME/.local/bin/core"

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
        print_status "Added to PATH in shell configuration files"
    fi

    print_success "Core Agent shortcut installed locally"
fi

# Step 5: Create production configuration
print_status "Step 5: Creating production configuration..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Core Agent Production Configuration

# LLM Configuration
LLM_API_URL=http://localhost:8000
MODEL_PATH=models/gemma-2b-it.Q4_K_M.gguf
LLM_TIMEOUT=30000
LLM_MAX_TOKENS=4096

# Memory Configuration
MEMORY_VECTOR_STORE=local
MEMORY_PERSISTENCE_PATH=data/memory
MEMORY_MAX_SIZE=1000
MEMORY_TTL=86400

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=data/logs/core-agent.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=86400
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION=1800
SESSION_TIMEOUT=3600
PASSWORD_MIN_LENGTH=8
REQUIRE_MFA=false

# Audit Configuration
AUDIT_LOG_RETENTION=90
AUDIT_LOG_PATH=data/logs/audit.log
AUDIT_ENABLED=true

# CAG Configuration
CAG_CACHE_SIZE=1000
CAG_TTL=3600
CAG_SIMILARITY_THRESHOLD=0.8
CAG_ENABLED=true

# Performance Configuration
PERFORMANCE_MONITORING=true
HEALTH_CHECK_INTERVAL=300
SELF_HEALING_ENABLED=true

# Network Configuration
PORT=3000
HOST=localhost
CORS_ORIGIN=*
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Development Configuration
NODE_ENV=production
DEBUG=false
VERBOSE=false
EOF

    print_success "Production configuration created"
else
    print_status "Configuration file already exists"
fi

# Step 6: Create necessary directories
print_status "Step 6: Creating necessary directories..."

mkdir -p data/logs
mkdir -p data/memory
mkdir -p data/learning
mkdir -p data/audit
mkdir -p models
mkdir -p config

print_success "Directories created"

# Step 7: Download default model (if not present)
print_status "Step 7: Checking for default model..."

if [ ! -f "models/gemma-2b-it.Q4_K_M.gguf" ]; then
    print_warning "Default model not found. Please download a model manually:"
    echo "   wget -O models/gemma-2b-it.Q4_K_M.gguf <model-url>"
    echo "   Or use the model download script: bash scripts/download-models.sh"
else
    print_success "Default model found"
fi

# Step 8: Set up systemd service (optional)
print_status "Step 8: Setting up systemd service..."

if command -v systemctl >/dev/null 2>&1; then
    cat > /tmp/core-agent.service << EOF
[Unit]
Description=Core Agent Cybersecurity Assistant
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
Environment=NODE_ENV=production
Environment=PATH=$PROJECT_ROOT/node_modules/.bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/node $PROJECT_ROOT/bin/cli.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo cp /tmp/core-agent.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable core-agent.service

    print_success "Systemd service configured"
    print_status "To start the service: sudo systemctl start core-agent"
    print_status "To check status: sudo systemctl status core-agent"
else
    print_warning "systemctl not available. Skipping systemd service setup."
fi

# Step 9: Create startup script
print_status "Step 9: Creating startup script..."

cat > start-services.sh << 'EOF'
#!/bin/bash

# Core Agent Services Startup Script

set -e

echo "🚀 Starting Core Agent Services..."
echo "=================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start llama.cpp server
echo "📡 Starting llama.cpp server..."
cd "$SCRIPT_DIR/llama.cpp/build"
./server --model ../../models/gemma-2b-it.Q4_K_M.gguf --port 8000 --host 0.0.0.0 &
LLAMA_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ Failed to start llama.cpp server"
    exit 1
fi

echo "✅ llama.cpp server started (PID: $LLAMA_PID)"

# Start log analyzer service
echo "📊 Starting log analyzer service..."
cd "$SCRIPT_DIR/services/log-analyzer"
python3 app.py &
LOGGER_PID=$!

echo "✅ Log analyzer started (PID: $LOGGER_PID)"

# Save PIDs for later cleanup
echo $LLAMA_PID > /tmp/llama.pid
echo $LOGGER_PID > /tmp/logger.pid

echo ""
echo "🎉 All services started successfully!"
echo "💡 You can now use: core"
echo "💡 Or start the CLI: node bin/cli.js"
echo ""
echo "📝 Service PIDs:"
echo "   llama.cpp: $LLAMA_PID"
echo "   log analyzer: $LOGGER_PID"
echo ""
echo "🛑 To stop services: ./stop-services.sh"
EOF

chmod +x start-services.sh

# Create stop script
cat > stop-services.sh << 'EOF'
#!/bin/bash

# Core Agent Services Stop Script

echo "🛑 Stopping Core Agent Services..."
echo "=================================="

# Stop llama.cpp server
if [ -f /tmp/llama.pid ]; then
    LLAMA_PID=$(cat /tmp/llama.pid)
    if kill -0 $LLAMA_PID 2>/dev/null; then
        echo "📡 Stopping llama.cpp server (PID: $LLAMA_PID)..."
        kill $LLAMA_PID
        rm /tmp/llama.pid
    fi
fi

# Stop log analyzer
if [ -f /tmp/logger.pid ]; then
    LOGGER_PID=$(cat /tmp/logger.pid)
    if kill -0 $LOGGER_PID 2>/dev/null; then
        echo "📊 Stopping log analyzer (PID: $LOGGER_PID)..."
        kill $LOGGER_PID
        rm /tmp/logger.pid
    fi
fi

# Kill any remaining processes
pkill -f "llama.cpp" || true
pkill -f "log-analyzer" || true

echo "✅ All services stopped"
EOF

chmod +x stop-services.sh

print_success "Startup scripts created"

# Step 10: Set proper permissions
print_status "Step 10: Setting proper permissions..."

chmod +x bin/*.js
chmod +x scripts/*.sh
chmod 644 .env

print_success "Permissions set"

# Step 11: Generate documentation
print_status "Step 11: Generating documentation..."

# Create quick reference
cat > QUICK_REFERENCE.md << 'EOF'
# Core Agent Quick Reference

## Quick Start
```bash
core                    # Start natural language interface
core help               # Show help
core health             # Check system health
core shortcuts          # List all shortcuts
```

## Natural Language Examples
```bash
core
"Check system health"
"Scan my network for vulnerabilities"
"Explain SQL injection"
"Start a learning mission"
"Analyze recent security logs"
```

## Technical Shortcuts
```bash
core health             # Check system health
core scan 192.168.1.0/24  # Run network scan
core logs               # Analyze security logs
core tools              # List available tools
core explain "phishing" # Explain concept
core learn              # Start learning mission
core query "malware"    # Search knowledge base
```

## Service Management
```bash
./start-services.sh     # Start all services
./stop-services.sh      # Stop all services
sudo systemctl start core-agent    # Start as service
sudo systemctl status core-agent   # Check service status
```

## Default Credentials
- Username: admin
- Password: admin123

⚠️ Change these immediately after first login!
EOF

print_success "Documentation generated"

# Step 12: Final verification
print_status "Step 12: Final verification..."

# Test the core command
if command -v core >/dev/null 2>&1; then
    print_success "Core Agent shortcut is working"
else
    print_warning "Core Agent shortcut not found in PATH"
    print_status "Try: source ~/.bashrc"
fi

# Check if all required files exist
REQUIRED_FILES=("bin/cli.js" "bin/core" "package.json" ".env")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file exists"
    else
        print_error "✗ $file missing"
    fi
done

print_success "Deployment completed successfully!"
echo ""
echo "🎉 Core Agent is ready for production!"
echo ""
echo "📋 Next Steps:"
echo "   1. Download a model: bash scripts/download-models.sh"
echo "   2. Start services: ./start-services.sh"
echo "   3. Test the system: core"
echo "   4. Change default credentials"
echo ""
echo "📚 Documentation:"
echo "   README.md - Main documentation"
echo "   HOW-TO-USE.md - User guide"
echo "   QUICK_REFERENCE.md - Quick reference"
echo ""
echo "🔧 Configuration:"
echo "   Edit .env for production settings"
echo "   Modify config/ for advanced configuration"
echo ""
echo "🛡️ Security:"
echo "   Change JWT_SECRET in .env"
echo "   Update default credentials"
echo "   Configure firewall rules"
echo ""
echo "🚀 Ready to use: core"
