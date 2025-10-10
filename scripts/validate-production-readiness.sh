#!/bin/bash

# Production Readiness Validation Script
# Comprehensive checks for production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
}

# Check environment variables
check_environment() {
    print_header "Environment Configuration"
    
    print_check "Checking required environment variables"
    
    REQUIRED_VARS=(
        "MEMORY_ENCRYPTION_KEY"
        "JWT_SECRET"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_fail "$var is not set"
        else
            if [ ${#var} -ge 32 ]; then
                print_pass "$var is set and has sufficient length"
            else
                print_warn "$var is set but may be too short (< 32 chars)"
            fi
        fi
    done
    
    # Check optional but recommended vars
    OPTIONAL_VARS=(
        "LLM_API_URL"
        "LOG_ANALYZER_URL"
        "POSTGRES_HOST"
        "REDIS_HOST"
    )
    
    for var in "${OPTIONAL_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_warn "$var is not set (optional)"
        else
            print_pass "$var is configured"
        fi
    done
}

# Check dependencies
check_dependencies() {
    print_header "Dependency Checks"
    
    print_check "Node.js version"
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_pass "Node.js $NODE_VERSION installed"
    else
        print_fail "Node.js not found"
    fi
    
    print_check "npm version"
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_pass "npm $NPM_VERSION installed"
    else
        print_fail "npm not found"
    fi
    
    print_check "TypeScript installation"
    if npm list typescript >/dev/null 2>&1; then
        print_pass "TypeScript is installed"
    else
        print_warn "TypeScript not found in node_modules"
    fi
    
    print_check "Jest installation"
    if npm list jest >/dev/null 2>&1; then
        print_pass "Jest is installed"
    else
        print_warn "Jest not found in node_modules"
    fi
}

# Check file structure
check_file_structure() {
    print_header "File Structure"
    
    REQUIRED_FILES=(
        "package.json"
        "tsconfig.json"
        ".gitignore"
        "README.md"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        print_check "Checking $file"
        if [ -f "$file" ]; then
            print_pass "$file exists"
        else
            print_fail "$file not found"
        fi
    done
    
    REQUIRED_DIRS=(
        "utils"
        "services"
        "memory"
        "reasoning"
        "tools"
        "docs"
    )
    
    for dir in "${REQUIRED_DIRS[@]}"; do
        print_check "Checking $dir directory"
        if [ -d "$dir" ]; then
            print_pass "$dir directory exists"
        else
            print_fail "$dir directory not found"
        fi
    done
}

# Check build
check_build() {
    print_header "Build Verification"
    
    print_check "TypeScript compilation"
    if npm run build >/dev/null 2>&1; then
        print_pass "TypeScript compiles successfully"
    else
        print_fail "TypeScript compilation failed"
    fi
    
    print_check "Checking compiled output"
    if [ -f "gemma3n:4B-agent.js" ]; then
        print_pass "Compiled JavaScript files exist"
    else
        print_warn "Compiled files not found (run 'npm run build')"
    fi
}

# Check tests
check_tests() {
    print_header "Test Suite"
    
    print_check "Running test suite"
    if npm test -- --passWithNoTests >/dev/null 2>&1; then
        print_pass "Tests pass"
    else
        print_warn "Some tests failed (check 'npm test' output)"
    fi
    
    print_check "Test coverage"
    if [ -d "coverage" ]; then
        print_pass "Test coverage reports exist"
    else
        print_warn "No coverage reports found"
    fi
}

# Check documentation
check_documentation() {
    print_header "Documentation"
    
    DOCS=(
        "docs/DEPLOYMENT_GUIDE.md"
        "docs/IMPLEMENTATION_GUIDE.md"
        "docs/TROUBLESHOOTING.md"
        "docs/PERFORMANCE_TUNING.md"
    )
    
    for doc in "${DOCS[@]}"; do
        print_check "Checking $doc"
        if [ -f "$doc" ]; then
            print_pass "$doc exists"
        else
            print_warn "$doc not found"
        fi
    done
}

# Check Docker setup
check_docker() {
    print_header "Docker Configuration"
    
    print_check "Dockerfile"
    if [ -f "Dockerfile" ]; then
        print_pass "Dockerfile exists"
    else
        print_warn "Dockerfile not found"
    fi
    
    print_check "docker-compose.yml"
    if [ -f "docker-compose.yml" ]; then
        print_pass "docker-compose.yml exists"
    else
        print_warn "docker-compose.yml not found"
    fi
    
    print_check ".dockerignore"
    if [ -f ".dockerignore" ]; then
        print_pass ".dockerignore exists"
    else
        print_warn ".dockerignore not found"
    fi
}

# Check Kubernetes setup
check_kubernetes() {
    print_header "Kubernetes Configuration"
    
    K8S_FILES=(
        "k8s/namespace.yaml"
        "k8s/configmap.yaml"
        "k8s/deployment.yaml"
        "k8s/ingress.yaml"
    )
    
    for file in "${K8S_FILES[@]}"; do
        print_check "Checking $file"
        if [ -f "$file" ]; then
            print_pass "$file exists"
        else
            print_warn "$file not found"
        fi
    done
}

# Check security
check_security() {
    print_header "Security Checks"
    
    print_check "Checking for exposed secrets"
    if grep -r "password\s*=\s*['\"]" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v ".example" >/dev/null; then
        print_fail "Potential hardcoded passwords found"
    else
        print_pass "No hardcoded passwords detected"
    fi
    
    print_check ".env file"
    if [ -f ".env" ]; then
        print_warn ".env file exists (ensure it's in .gitignore)"
        if grep -q "^\.env$" .gitignore; then
            print_pass ".env is in .gitignore"
        else
            print_fail ".env is NOT in .gitignore - SECURITY RISK!"
        fi
    else
        print_pass "No .env file in repository"
    fi
    
    print_check ".env.example"
    if [ -f ".env.example" ]; then
        print_pass ".env.example template exists"
    else
        print_warn ".env.example not found"
    fi
    
    print_check "npm audit"
    if npm audit --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
        print_pass "No high/critical vulnerabilities found"
    else
        print_warn "Vulnerabilities detected (run 'npm audit' for details)"
    fi
}

# Check CI/CD
check_cicd() {
    print_header "CI/CD Configuration"
    
    WORKFLOWS=(
        ".github/workflows/ci-cd.yml"
        ".github/workflows/pylint.yml"
    )
    
    for workflow in "${WORKFLOWS[@]}"; do
        print_check "Checking $workflow"
        if [ -f "$workflow" ]; then
            print_pass "$workflow exists"
        else
            print_warn "$workflow not found"
        fi
    done
}

# Generate report
generate_report() {
    print_header "Production Readiness Report"
    
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    
    SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "\n${BLUE}Production Readiness Score: $SCORE%${NC}"
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "\n${GREEN}✅ EXCELLENT! System is production ready!${NC}"
            exit 0
        else
            echo -e "\n${YELLOW}⚠️  GOOD! System is mostly ready, but has some warnings.${NC}"
            exit 0
        fi
    else
        echo -e "\n${RED}❌ CRITICAL! System has $FAILED_CHECKS critical issues that must be fixed!${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║  Production Readiness Validation        ║"
    echo "║  Project C0Di3                           ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_environment
    check_dependencies
    check_file_structure
    check_build
    check_tests
    check_documentation
    check_docker
    check_kubernetes
    check_security
    check_cicd
    
    generate_report
}

# Run main function
main
