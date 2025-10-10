#!/bin/bash

# Deployment Validation Script
# Validates deployment configuration and environment before production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source deployment utilities
# shellcheck source=./deployment-utils.sh
source "$SCRIPT_DIR/deployment-utils.sh"

# Setup logging
setup_logging "$PROJECT_ROOT/logs" "validation.log"

echo "=================================="
echo "🔍 Deployment Validation"
echo "=================================="

# Track validation results
VALIDATION_PASSED=true

# Validation function wrapper
validate() {
    local check_name=$1
    shift
    local check_command="$@"
    
    print_status "Checking: $check_name"
    if eval "$check_command"; then
        print_success "✓ $check_name"
        log_message "INFO" "Validation passed: $check_name"
        return 0
    else
        print_error "✗ $check_name"
        log_message "ERROR" "Validation failed: $check_name"
        VALIDATION_PASSED=false
        return 1
    fi
}

echo ""
echo "1. System Requirements"
echo "----------------------"

validate "Node.js (v18+)" "check_node_version 18"
validate "npm" "check_npm"
validate "git" "check_command git"

echo ""
echo "2. Project Structure"
echo "--------------------"

validate "package.json exists" "validate_file_exists '$PROJECT_ROOT/package.json' 'package.json'"
validate "tsconfig.json exists" "validate_file_exists '$PROJECT_ROOT/tsconfig.json' 'tsconfig.json'"
validate "node_modules exists" "validate_directory_exists '$PROJECT_ROOT/node_modules' 'node_modules'"

echo ""
echo "3. Required Directories"
echo "-----------------------"

# Check and create necessary directories
REQUIRED_DIRS=(
    "data/logs"
    "data/memory"
    "data/learning"
    "data/audit"
    "models"
    "config"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        print_warning "Directory missing: $dir (will be created)"
        mkdir -p "$PROJECT_ROOT/$dir"
        print_success "Created: $dir"
    else
        print_success "✓ Directory exists: $dir"
    fi
done

echo ""
echo "4. Environment Configuration"
echo "----------------------------"

# Check for .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    print_success "✓ .env file exists"
    
    # Check for critical environment variables
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    
    if [ -n "${MEMORY_ENCRYPTION_KEY:-}" ]; then
        if [ ${#MEMORY_ENCRYPTION_KEY} -ge 32 ]; then
            print_success "✓ MEMORY_ENCRYPTION_KEY is set and valid"
        else
            print_error "✗ MEMORY_ENCRYPTION_KEY is too short (minimum 32 characters)"
            VALIDATION_PASSED=false
        fi
    else
        print_warning "⚠ MEMORY_ENCRYPTION_KEY is not set"
        print_warning "  Generate one with: openssl rand -base64 32"
        VALIDATION_PASSED=false
    fi
    
    # Check other important variables
    IMPORTANT_VARS=(
        "LLM_API_URL"
        "LLM_MODEL"
        "PORT"
    )
    
    for var in "${IMPORTANT_VARS[@]}"; do
        if [ -n "${!var:-}" ]; then
            print_success "✓ $var is set: ${!var}"
        else
            print_warning "⚠ $var is not set (will use default)"
        fi
    done
else
    print_error "✗ .env file not found"
    print_status "Creating .env template..."
    create_env_template "$PROJECT_ROOT/.env.template"
    print_warning "Please copy .env.template to .env and configure it"
    VALIDATION_PASSED=false
fi

echo ""
echo "5. Build Validation"
echo "-------------------"

cd "$PROJECT_ROOT"

# Check if TypeScript files compile
validate "TypeScript compilation" "npx tsc --noEmit"

# Check if build output exists
if [ -d "$PROJECT_ROOT" ]; then
    JS_COUNT=$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./coverage/*" | wc -l)
    if [ "$JS_COUNT" -gt 0 ]; then
        print_success "✓ JavaScript build files exist ($JS_COUNT files)"
    else
        print_warning "⚠ No JavaScript build files found - may need to run 'npm run build'"
    fi
fi

echo ""
echo "6. Deployment Scripts"
echo "---------------------"

SCRIPTS=(
    "scripts/deploy-production.sh"
    "scripts/test-production.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$PROJECT_ROOT/$script" ]; then
        # Check if script is executable
        if [ -x "$PROJECT_ROOT/$script" ]; then
            print_success "✓ $script exists and is executable"
        else
            print_warning "⚠ $script exists but is not executable"
            chmod +x "$PROJECT_ROOT/$script"
            print_success "  Made executable: $script"
        fi
        
        # Validate bash syntax
        if bash -n "$PROJECT_ROOT/$script" 2>/dev/null; then
            print_success "✓ $script syntax is valid"
        else
            print_error "✗ $script has syntax errors"
            VALIDATION_PASSED=false
        fi
    else
        print_error "✗ $script not found"
        VALIDATION_PASSED=false
    fi
done

echo ""
echo "7. Security Checks"
echo "------------------"

# Check for sensitive files that should be gitignored
SENSITIVE_PATTERNS=(
    ".env"
    "*.key"
    "*.pem"
    "*.p12"
    "id_rsa"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git ls-files --error-unmatch "$pattern" 2>/dev/null; then
        print_error "✗ Sensitive file tracked by git: $pattern"
        VALIDATION_PASSED=false
    fi
done

# Check .gitignore
if [ -f "$PROJECT_ROOT/.gitignore" ]; then
    print_success "✓ .gitignore exists"
    
    # Check for important patterns
    IMPORTANT_PATTERNS=(
        ".env"
        "node_modules"
        "coverage"
        "*.log"
    )
    
    for pattern in "${IMPORTANT_PATTERNS[@]}"; do
        if grep -q "$pattern" "$PROJECT_ROOT/.gitignore"; then
            print_success "✓ .gitignore includes: $pattern"
        else
            print_warning "⚠ .gitignore missing: $pattern"
        fi
    done
else
    print_error "✗ .gitignore not found"
    VALIDATION_PASSED=false
fi

echo ""
echo "8. Documentation"
echo "----------------"

DOCS=(
    "README.md"
    "docs/DEPLOYMENT_GUIDE.md"
)

for doc in "${DOCS[@]}"; do
    validate "Documentation: $doc" "validate_file_exists '$PROJECT_ROOT/$doc' '$doc'"
done

echo ""
echo "9. Port Availability"
echo "--------------------"

# Check if default port is available
DEFAULT_PORT=${PORT:-3000}
if nc -z localhost "$DEFAULT_PORT" 2>/dev/null; then
    print_warning "⚠ Port $DEFAULT_PORT is already in use"
    print_warning "  You may need to stop the existing service or use a different port"
else
    print_success "✓ Port $DEFAULT_PORT is available"
fi

echo ""
echo "10. Disk Space"
echo "--------------"

# Check available disk space
AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | tail -1 | awk '{print $4}' | sed 's/G//')
REQUIRED_SPACE=5

if [ "$AVAILABLE_SPACE" -ge "$REQUIRED_SPACE" ]; then
    print_success "✓ Sufficient disk space available: ${AVAILABLE_SPACE}GB"
else
    print_warning "⚠ Low disk space: ${AVAILABLE_SPACE}GB (recommended: ${REQUIRED_SPACE}GB+)"
fi

echo ""
echo "=================================="
echo "📊 Validation Summary"
echo "=================================="

if [ "$VALIDATION_PASSED" = true ]; then
    print_success "✓ All validations passed!"
    print_success "System is ready for deployment"
    log_message "INFO" "Deployment validation passed"
    echo ""
    echo "Next steps:"
    echo "1. Review your .env configuration"
    echo "2. Run: npm run build"
    echo "3. Run: npm test"
    echo "4. Deploy: bash scripts/deploy-production.sh"
    exit 0
else
    print_error "✗ Some validations failed"
    print_error "Please fix the issues above before deploying"
    log_message "ERROR" "Deployment validation failed"
    echo ""
    echo "Common fixes:"
    echo "- Set MEMORY_ENCRYPTION_KEY in .env (min 32 chars)"
    echo "- Run: npm install"
    echo "- Run: npm run build"
    echo "- Review .env configuration"
    exit 1
fi
