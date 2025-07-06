#!/bin/bash

# Production Build Script for llama.cpp
# This script handles CMake issues and configures optimal production settings

set -e

echo "🔧 Building llama.cpp for Production"
echo "====================================="

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

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."

    # Check for required tools
    local missing_tools=()

    if ! command -v cmake &> /dev/null; then
        missing_tools+=("cmake")
    fi

    if ! command -v make &> /dev/null; then
        missing_tools+=("make")
    fi

    if ! command -v gcc &> /dev/null && ! command -v clang &> /dev/null; then
        missing_tools+=("C/C++ compiler")
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi

    print_success "All required tools are available"
}

# Detect system and set optimal build options
detect_system() {
    print_status "Detecting system capabilities..."

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        CMAKE_GENERATOR="Unix Makefiles"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        CMAKE_GENERATOR="Unix Makefiles"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        CMAKE_GENERATOR="Unix Makefiles"
    else
        OS="unknown"
        CMAKE_GENERATOR="Unix Makefiles"
    fi

    # Detect CPU architecture
    ARCH=$(uname -m)

    # Detect available hardware acceleration
    CUDA_AVAILABLE=false
    METAL_AVAILABLE=false
    OPENCL_AVAILABLE=false

    if command -v nvidia-smi &> /dev/null; then
        CUDA_AVAILABLE=true
        print_status "NVIDIA GPU detected - CUDA support available"
    fi

    if [[ "$OS" == "macos" ]]; then
        METAL_AVAILABLE=true
        print_status "macOS detected - Metal support available"
    fi

    if command -v clinfo &> /dev/null; then
        OPENCL_AVAILABLE=true
        print_status "OpenCL support available"
    fi

    print_success "System detection complete"
}

# Configure optimal CMake options
configure_cmake_options() {
    print_status "Configuring CMake options for production..."

    CMAKE_OPTIONS=(
        "-DCMAKE_BUILD_TYPE=Release"
        "-DLLAMA_BUILD_SERVER=ON"
        "-DLLAMA_BUILD_TESTS=OFF"
        "-DLLAMA_BUILD_EXAMPLES=OFF"
        "-DLLAMA_BUILD_TOOLS=ON"
        "-DLLAMA_CURL=ON"
        "-DLLAMA_ALL_WARNINGS=OFF"
        "-DLLAMA_FATAL_WARNINGS=OFF"
    )

    # Add hardware acceleration options
    if [ "$CUDA_AVAILABLE" = true ]; then
        CMAKE_OPTIONS+=("-DGGML_CUDA=ON")
        CMAKE_OPTIONS+=("-DGGML_CUDA_GRAPHS=ON")
        print_status "Enabling CUDA acceleration"
    fi

    if [ "$METAL_AVAILABLE" = true ]; then
        CMAKE_OPTIONS+=("-DGGML_METAL=ON")
        print_status "Enabling Metal acceleration"
    fi

    if [ "$OPENCL_AVAILABLE" = true ]; then
        CMAKE_OPTIONS+=("-DGGML_OPENCL=ON")
        print_status "Enabling OpenCL acceleration"
    fi

    # Optimize for specific architecture
    if [ "$ARCH" = "x86_64" ]; then
        CMAKE_OPTIONS+=("-DCMAKE_CXX_FLAGS=-march=native -mtune=native")
        CMAKE_OPTIONS+=("-DCMAKE_C_FLAGS=-march=native -mtune=native")
    elif [ "$ARCH" = "aarch64" ]; then
        CMAKE_OPTIONS+=("-DCMAKE_CXX_FLAGS=-march=native")
        CMAKE_OPTIONS+=("-DCMAKE_C_FLAGS=-march=native")
    fi

    print_success "CMake options configured"
}

# Build llama.cpp
build_llama() {
    print_status "Building llama.cpp..."

    # Navigate to llama.cpp directory
    cd llama.cpp

    # Create and enter build directory
    rm -rf build
    mkdir -p build
    cd build

    # Configure with CMake
    print_status "Running CMake configuration..."
    cmake -G "$CMAKE_GENERATOR" "${CMAKE_OPTIONS[@]}" ..

    if [ $? -ne 0 ]; then
        print_error "CMake configuration failed"
        exit 1
    fi

    # Build with optimal number of jobs
    local jobs=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    print_status "Building with $jobs parallel jobs..."

    make -j$jobs

    if [ $? -ne 0 ]; then
        print_error "Build failed"
        exit 1
    fi

    print_success "Build completed successfully"
}

# Install and configure
install_and_configure() {
    print_status "Installing and configuring..."

    # Create production directories
    mkdir -p ../bin/production
    mkdir -p ../models
    mkdir -p ../logs

    # Copy server binary
    if [ -f "bin/server" ]; then
        cp bin/server ../bin/production/llama-server
        chmod +x ../bin/production/llama-server
        print_success "Server binary installed"
    else
        print_error "Server binary not found"
        exit 1
    fi

    # Create production configuration
    cat > ../bin/production/server.conf << EOF
# Production Server Configuration
# Generated on $(date)

# Server settings
port=8000
host=0.0.0.0
threads=8
ctx-size=4096
batch-size=512
parallel=1

# Model settings
model=../models/gemma-2b-it.Q4_K_M.gguf
n-gpu-layers=0

# Performance settings
rope-scaling=linear
rope-freq-base=10000
rope-freq-scale=1.0

# Memory settings
mem-f32=0
mem-f16=0
mem-q4_0=0
mem-q4_1=0
mem-q5_0=0
mem-q5_1=0
mem-q8_0=0

# Logging
log-format=json
log-file=../logs/server.log
log-level=info

# Security
api-key=
EOF

    print_success "Production configuration created"
}

# Create startup script
create_startup_script() {
    print_status "Creating production startup script..."

    cat > ../bin/production/start-server.sh << 'EOF'
#!/bin/bash

# Production Server Startup Script
# This script starts the llama.cpp server with optimal production settings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Default settings
MODEL_PATH="${MODEL_PATH:-$PROJECT_ROOT/models/gemma-2b-it.Q4_K_M.gguf}"
SERVER_PORT="${SERVER_PORT:-8000}"
SERVER_HOST="${SERVER_HOST:-0.0.0.0}"
THREADS="${THREADS:-8}"
CTX_SIZE="${CTX_SIZE:-4096}"
API_KEY="${API_KEY:-}"

# Check if model exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ Model not found: $MODEL_PATH"
    echo "Please download a model and place it in the models directory"
    exit 1
fi

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

echo "🚀 Starting llama.cpp server in production mode..."
echo "📁 Model: $MODEL_PATH"
echo "🌐 Host: $SERVER_HOST:$SERVER_PORT"
echo "⚙️  Threads: $THREADS"
echo "🧠 Context Size: $CTX_SIZE"

# Start server with production settings
exec "$SCRIPT_DIR/llama-server" \
    --model "$MODEL_PATH" \
    --port "$SERVER_PORT" \
    --host "$SERVER_HOST" \
    --threads "$THREADS" \
    --ctx-size "$CTX_SIZE" \
    --batch-size 512 \
    --parallel 1 \
    --rope-scaling linear \
    --rope-freq-base 10000 \
    --rope-freq-scale 1.0 \
    --log-format json \
    --log-file "$PROJECT_ROOT/logs/server.log" \
    --log-level info \
    ${API_KEY:+--api-key "$API_KEY"}
EOF

    chmod +x ../bin/production/start-server.sh
    print_success "Startup script created"
}

# Create systemd service (Linux)
create_systemd_service() {
    if [[ "$OS" == "linux" ]]; then
        print_status "Creating systemd service..."

        cat > ../bin/production/llama-server.service << EOF
[Unit]
Description=Llama.cpp Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=$PWD/bin/production/start-server.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

        print_success "Systemd service created"
        echo "To install the service, run:"
        echo "sudo cp bin/production/llama-server.service /etc/systemd/system/"
        echo "sudo systemctl daemon-reload"
        echo "sudo systemctl enable llama-server"
        echo "sudo systemctl start llama-server"
    fi
}

# Main execution
main() {
    echo "🔧 Production Build Script for llama.cpp"
    echo "========================================="

    check_requirements
    detect_system
    configure_cmake_options
    build_llama
    install_and_configure
    create_startup_script
    create_systemd_service

    echo ""
    print_success "Production build completed successfully!"
    echo ""
    echo "📁 Files created:"
    echo "  - bin/production/llama-server (server binary)"
    echo "  - bin/production/server.conf (configuration)"
    echo "  - bin/production/start-server.sh (startup script)"
    if [[ "$OS" == "linux" ]]; then
        echo "  - bin/production/llama-server.service (systemd service)"
    fi
    echo ""
    echo "🚀 To start the server:"
    echo "  cd bin/production"
    echo "  ./start-server.sh"
    echo ""
    echo "📝 Make sure to:"
    echo "  1. Download a model to the models/ directory"
    echo "  2. Set API_KEY in .env for authentication"
    echo "  3. Configure firewall rules for port 8000"
    echo ""
}

# Run main function
main "$@"
