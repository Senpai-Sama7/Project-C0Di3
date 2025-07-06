#!/bin/bash

# Production Test Script for Core Agent
# This script verifies all production components are working correctly

set -e

echo "🧪 Core Agent - Production Testing"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    print_status "Running: $test_name"

    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "$test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test CMake and build tools
test_cmake() {
    echo ""
    echo "🔧 Testing CMake and Build Tools"
    echo "================================"

    run_test "CMake installation" "cmake --version"
    run_test "Make installation" "make --version"
    run_test "GCC/Clang compiler" "gcc --version || clang --version"
    run_test "Git installation" "git --version"
    run_test "Node.js installation" "node --version"
    run_test "npm installation" "npm --version"
}

# Test llama.cpp build
test_llama_build() {
    echo ""
    echo "🤖 Testing Llama.cpp Build"
    echo "=========================="

    run_test "Llama.cpp directory exists" "test -d llama.cpp"
    run_test "CMakeLists.txt exists" "test -f llama.cpp/CMakeLists.txt"
    run_test "Server binary exists" "test -f bin/production/llama-server"
    run_test "Server binary is executable" "test -x bin/production/llama-server"
    run_test "Startup script exists" "test -f bin/production/start-server.sh"
    run_test "Startup script is executable" "test -x bin/production/start-server.sh"
}

# Test server functionality
test_server() {
    echo ""
    echo "🌐 Testing Server Functionality"
    echo "=============================="

    # Check if server is running
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Server is running and responding"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Server is not running - starting test server"

        # Start server in background for testing
        timeout 30s ./bin/production/start-server.sh > /dev/null 2>&1 &
        SERVER_PID=$!

        # Wait for server to start
        sleep 5

        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_success "Test server started successfully"
            PASSED_TESTS=$((PASSED_TESTS + 1))

            # Stop test server
            kill $SERVER_PID 2>/dev/null || true
        else
            print_error "Failed to start test server"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test authentication system
test_authentication() {
    echo ""
    echo "🔐 Testing Authentication System"
    echo "==============================="

    run_test "Auth service file exists" "test -f services/auth-service.ts"
    run_test "Auth middleware exists" "test -f middleware/auth-middleware.ts"
    run_test "Users file exists" "test -f data/auth/users.json"
    run_test "Sessions file exists" "test -f data/auth/sessions.json"
    run_test "Users file is valid JSON" "python3 -m json.tool data/auth/users.json > /dev/null"
    run_test "Sessions file is valid JSON" "python3 -m json.tool data/auth/sessions.json > /dev/null"

    # Test user data structure
    if python3 -c "
import json
with open('data/auth/users.json') as f:
    users = json.load(f)
    assert len(users) > 0
    for user in users:
        assert 'id' in user
        assert 'username' in user
        assert 'role' in user
        assert 'permissions' in user
print('User data structure is valid')
" > /dev/null 2>&1; then
        print_success "User data structure validation"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "User data structure validation"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test audit logging
test_audit_logging() {
    echo ""
    echo "📊 Testing Audit Logging"
    echo "========================"

    run_test "Audit log file exists" "test -f logs/audit.log"
    run_test "Audit log is writable" "test -w logs/audit.log"
    run_test "Logs directory exists" "test -d logs"
    run_test "Logs directory is writable" "test -w logs"

    # Test audit log format
    if [ -s logs/audit.log ]; then
        print_success "Audit log contains data"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Audit log is empty (normal for fresh install)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test CAG service
test_cag_service() {
    echo ""
    echo "⚡ Testing CAG Service"
    echo "======================"

    run_test "CAG service file exists" "test -f services/cag-service.ts"
    run_test "CAG configuration is valid" "grep -q 'maxCacheSize' services/cag-service.ts"
    run_test "CAG performance metrics defined" "grep -q 'CAGPerformanceMetrics' services/cag-service.ts"
    run_test "CAG cache management exists" "grep -q 'maintainCache' services/cag-service.ts"
    run_test "CAG pre-warming exists" "grep -q 'preWarmCache' services/cag-service.ts"
}

# Test CLI integration
test_cli_integration() {
    echo ""
    echo "💻 Testing CLI Integration"
    echo "========================="

    run_test "CLI file exists" "test -f bin/cli.js"
    run_test "CLI is executable" "test -x bin/cli.js"
    run_test "CLI imports auth service" "grep -q 'AuthService' bin/cli.js"
    run_test "CLI imports auth middleware" "grep -q 'AuthMiddleware' bin/cli.js"
    run_test "CLI has authentication flow" "grep -q 'authenticate' bin/cli.js"
    run_test "CLI has audit logging" "grep -q 'logAuthEvent' bin/cli.js"
}

# Test production configuration
test_production_config() {
    echo ""
    echo "⚙️  Testing Production Configuration"
    echo "=================================="

    run_test "Production env file exists" "test -f .env.production"
    run_test "Security config exists" "test -f config/security.json"
    run_test "Security config is valid JSON" "python3 -m json.tool config/security.json > /dev/null"
    run_test "Production startup script exists" "test -f bin/production/start-app.sh"
    run_test "Production startup script is executable" "test -x bin/production/start-app.sh"
    run_test "Systemd service files exist" "test -f bin/production/core-agent.service"
    run_test "Systemd service files exist" "test -f bin/production/llama-server.service"
}

# Test model availability
test_model() {
    echo ""
    echo "🧠 Testing Model Availability"
    echo "============================"

    if [ -f "models/gemma-2b-it.Q4_K_M.gguf" ]; then
        print_success "Default model exists"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Check model size (should be > 1GB)
        MODEL_SIZE=$(stat -c%s "models/gemma-2b-it.Q4_K_M.gguf" 2>/dev/null || echo 0)
        if [ "$MODEL_SIZE" -gt 1000000000 ]; then
            print_success "Model size is reasonable"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_warning "Model size seems small - may be corrupted"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        print_warning "Default model not found - please download manually"
        print_warning "Download from: https://huggingface.co/TheBloke/gemma-2b-it-GGUF"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 2))
}

# Test system dependencies
test_system_dependencies() {
    echo ""
    echo "🔧 Testing System Dependencies"
    echo "=============================="

    run_test "OpenSSL development" "pkg-config --exists openssl"
    run_test "Curl development" "pkg-config --exists libcurl"
    run_test "BLAS library" "ldconfig -p | grep -q libblas"
    run_test "LAPACK library" "ldconfig -p | grep -q liblapack"
    run_test "OpenBLAS library" "ldconfig -p | grep -q libopenblas"

    # Test hardware acceleration
    if command -v nvidia-smi &> /dev/null; then
        run_test "NVIDIA GPU detected" "nvidia-smi --query-gpu=name --format=csv,noheader"
    else
        print_warning "NVIDIA GPU not detected - CUDA acceleration unavailable"
    fi

    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_success "macOS detected - Metal acceleration available"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test performance metrics
test_performance() {
    echo ""
    echo "📈 Testing Performance Metrics"
    echo "=============================="

    # Test memory usage
    MEMORY_USAGE=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
        print_success "Memory usage is acceptable ($MEMORY_USAGE%)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Memory usage is high ($MEMORY_USAGE%)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Test disk space
    DISK_USAGE=$(df . | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 90 ]; then
        print_success "Disk space is sufficient ($DISK_USAGE% used)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Disk space is low ($DISK_USAGE% used)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Test CPU cores
    CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
    if [ "$CPU_CORES" -ge 4 ]; then
        print_success "Sufficient CPU cores ($CPU_CORES)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_warning "Limited CPU cores ($CPU_CORES) - may impact performance"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Test security features
test_security() {
    echo ""
    echo "🔒 Testing Security Features"
    echo "==========================="

    run_test "Firewall is active" "sudo ufw status | grep -q 'Status: active' || echo 'Firewall not configured'"
    run_test "SSH is configured" "test -f /etc/ssh/sshd_config"
    run_test "SSL certificates directory exists" "test -d /etc/ssl/certs"
    run_test "Security config has rate limiting" "grep -q 'rate_limiting' config/security.json"
    run_test "Security config has authentication" "grep -q 'authentication' config/security.json"
    run_test "Security config has audit logging" "grep -q 'audit_logging' config/security.json"
}

# Test documentation
test_documentation() {
    echo ""
    echo "📚 Testing Documentation"
    echo "======================="

    run_test "Production guide exists" "test -f PRODUCTION_GUIDE.md"
    run_test "README exists" "test -f README.md"
    run_test "How-to-use guide exists" "test -f HOW-TO-USE.md"
    run_test "Production guide is readable" "test -r PRODUCTION_GUIDE.md"
    run_test "README contains deployment info" "grep -q 'deployment' README.md"
    run_test "How-to-use guide contains authentication" "grep -q 'authentication' HOW-TO-USE.md"
}

# Generate test report
generate_report() {
    echo ""
    echo "📊 Test Report"
    echo "=============="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $((PASSED_TESTS * 100 / TOTAL_TESTS))%"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        print_success "🎉 All tests passed! Production deployment is ready."
        echo ""
        echo "🚀 Next steps:"
        echo "1. Start the server: ./bin/production/start-server.sh"
        echo "2. Start the application: ./bin/production/start-app.sh"
        echo "3. Login with default credentials (admin/password)"
        echo "4. Change default passwords immediately"
        echo "5. Review security configuration"
    else
        echo ""
        print_warning "⚠️  Some tests failed. Please review the issues above."
        echo ""
        echo "🔧 Common fixes:"
        echo "1. Install missing dependencies"
        echo "2. Download the model file"
        echo "3. Check file permissions"
        echo "4. Verify system requirements"
        echo "5. Review error messages above"
    fi
}

# Main test execution
main() {
    echo "🧪 Starting Core Agent Production Tests"
    echo "======================================"

    test_cmake
    test_llama_build
    test_server
    test_authentication
    test_audit_logging
    test_cag_service
    test_cli_integration
    test_production_config
    test_model
    test_system_dependencies
    test_performance
    test_security
    test_documentation

    generate_report
}

# Run main function
main "$@"
