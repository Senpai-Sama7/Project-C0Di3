#!/bin/bash

# Deployment Utilities Library
# Common functions for deployment scripts

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Error handling
set -euo pipefail
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_number=$2
    print_error "Error occurred in script at line $line_number with exit code $exit_code"
    
    # Log error for debugging
    if [ -n "${LOG_FILE:-}" ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: Exit code $exit_code at line $line_number" >> "$LOG_FILE"
    fi
    
    exit "$exit_code"
}

# Input validation
validate_required_var() {
    local var_name=$1
    local var_value=${2:-}
    
    if [ -z "$var_value" ]; then
        print_error "Required variable $var_name is not set"
        return 1
    fi
    return 0
}

validate_file_exists() {
    local file_path=$1
    local file_desc=${2:-file}
    
    if [ ! -f "$file_path" ]; then
        print_error "$file_desc not found at: $file_path"
        return 1
    fi
    return 0
}

validate_directory_exists() {
    local dir_path=$1
    local dir_desc=${2:-directory}
    
    if [ ! -d "$dir_path" ]; then
        print_error "$dir_desc not found at: $dir_path"
        return 1
    fi
    return 0
}

# Environment detection
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

detect_package_manager() {
    if command -v apt-get >/dev/null 2>&1; then
        echo "apt"
    elif command -v yum >/dev/null 2>&1; then
        echo "yum"
    elif command -v dnf >/dev/null 2>&1; then
        echo "dnf"
    elif command -v pacman >/dev/null 2>&1; then
        echo "pacman"
    elif command -v brew >/dev/null 2>&1; then
        echo "brew"
    else
        echo "unknown"
    fi
}

# Health checks
check_command() {
    local cmd=$1
    if ! command -v "$cmd" >/dev/null 2>&1; then
        print_error "Required command not found: $cmd"
        return 1
    fi
    return 0
}

check_node_version() {
    local required_version=${1:-18}
    
    if ! check_command node; then
        return 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "$required_version" ]; then
        print_error "Node.js version $required_version or higher required (current: $node_version)"
        return 1
    fi
    
    print_success "Node.js version check passed (v$node_version)"
    return 0
}

check_npm() {
    if ! check_command npm; then
        return 1
    fi
    print_success "npm is installed: $(npm -v)"
    return 0
}

# Backup and rollback
create_backup() {
    local source_dir=$1
    local backup_dir=${2:-./backups}
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$backup_dir"
    local backup_path="$backup_dir/backup_$timestamp.tar.gz"
    
    print_status "Creating backup: $backup_path"
    tar -czf "$backup_path" -C "$(dirname "$source_dir")" "$(basename "$source_dir")" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Backup created: $backup_path"
        echo "$backup_path"
        return 0
    else
        print_error "Backup creation failed"
        return 1
    fi
}

restore_backup() {
    local backup_path=$1
    local restore_dir=${2:-.}
    
    if [ ! -f "$backup_path" ]; then
        print_error "Backup file not found: $backup_path"
        return 1
    fi
    
    print_status "Restoring from backup: $backup_path"
    tar -xzf "$backup_path" -C "$restore_dir"
    
    if [ $? -eq 0 ]; then
        print_success "Backup restored successfully"
        return 0
    else
        print_error "Backup restoration failed"
        return 1
    fi
}

# Process management
check_process_running() {
    local process_name=$1
    if pgrep -f "$process_name" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

wait_for_port() {
    local port=$1
    local timeout=${2:-30}
    local elapsed=0
    
    print_status "Waiting for port $port to be available..."
    
    while [ $elapsed -lt $timeout ]; do
        if nc -z localhost "$port" 2>/dev/null; then
            print_success "Port $port is available"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    print_error "Timeout waiting for port $port"
    return 1
}

# Installation helpers
install_node_dependencies() {
    local use_ci=${1:-false}
    
    if [ "$use_ci" = true ] && [ -f "package-lock.json" ]; then
        print_status "Installing dependencies with npm ci..."
        npm ci
    else
        print_status "Installing dependencies with npm install..."
        npm install
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
        return 0
    else
        print_error "Dependency installation failed"
        return 1
    fi
}

build_typescript() {
    print_status "Building TypeScript..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "TypeScript build completed"
        return 0
    else
        print_error "TypeScript build failed"
        return 1
    fi
}

# Environment configuration
load_env_file() {
    local env_file=${1:-.env}
    
    if [ -f "$env_file" ]; then
        print_status "Loading environment from $env_file"
        # shellcheck disable=SC1090
        source "$env_file"
        print_success "Environment loaded"
        return 0
    else
        print_warning "Environment file not found: $env_file"
        return 1
    fi
}

create_env_template() {
    local env_file=${1:-.env.template}
    
    cat > "$env_file" << 'EOF'
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
MEMORY_VECTOR_STORE=postgres
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
TOOLS_TIMEOUT=300000
EOF
    
    print_success "Environment template created: $env_file"
}

# Logging
setup_logging() {
    local log_dir=${1:-./logs}
    local log_file=${2:-deployment.log}
    
    mkdir -p "$log_dir"
    LOG_FILE="$log_dir/$log_file"
    
    print_status "Logging to: $LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Deployment started" >> "$LOG_FILE"
}

log_message() {
    local level=$1
    shift
    local message="$*"
    
    if [ -n "${LOG_FILE:-}" ]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message" >> "$LOG_FILE"
    fi
}

# Export functions for use in other scripts
export -f print_status
export -f print_success
export -f print_warning
export -f print_error
export -f validate_required_var
export -f validate_file_exists
export -f validate_directory_exists
export -f detect_os
export -f detect_package_manager
export -f check_command
export -f check_node_version
export -f check_npm
export -f create_backup
export -f restore_backup
export -f check_process_running
export -f wait_for_port
export -f install_node_dependencies
export -f build_typescript
export -f load_env_file
export -f create_env_template
export -f setup_logging
export -f log_message
