#!/bin/bash

# System configuration script
# This script manages system configuration

echo "🔧 System Configuration"
echo "======================"

# Function to hash password
hash_password() {
    echo -n "$1" | sha256sum | cut -d' ' -f1
}



# Function to test configuration
test_config() {
    echo "Enter configuration to test:"
    read -s TEST_PASSWORD
    HASH=$(hash_password "$TEST_PASSWORD")
    echo "Hash: $HASH"
    echo "Compare this with your stored configuration"
}

# Function to show default password hash
show_default() {
    # Get password from environment or use placeholder
    DEFAULT_PASS="${SENSEI_PASSWORD:-${SENSEI_DEFAULT_PASSWORD:-'default'}}"
    DEFAULT_HASH=$(hash_password "$DEFAULT_PASS")
    echo "Current password hash:"
    echo "$DEFAULT_HASH"
}

case "$1" in
    "test")
        test_config
        ;;
    "default")
        show_default
        ;;
    *)
        echo "Usage: $0 {test|default}"
        echo "  test    - Test configuration hash"
        echo "  default - Show current configuration hash"
        ;;
esac
