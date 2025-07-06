#!/bin/bash

echo "🔧 Setting up system environment..."
export ADVANCED_MODE=true
export SENSEI_MODE=true
export SENSEI_BYPASS_ALL_RESTRICTIONS=true
export SENSEI_FULL_CONTROL=true

if [ -n "$1" ]; then
    export SENSEI_PASSWORD="$1"
    echo "✅ Configuration provided"
else
    echo "🔐 Enter system password:"
    read -s SENSEI_PASSWORD
    export SENSEI_PASSWORD="$SENSEI_PASSWORD"
fi

echo "✅ System environment configured"
echo "🚀 Starting system..."

node bin/cli.js
