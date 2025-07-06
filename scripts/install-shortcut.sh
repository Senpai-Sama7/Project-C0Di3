#!/bin/bash

# Core Agent Shortcut Installer
# Makes the 'core' command available globally

set -e

echo "🔧 Installing Core Agent Shortcut..."
echo "=================================="

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/bin/core" ]; then
    echo "❌ Error: bin/core not found. Please run this script from the project root."
    exit 1
fi

# Make the core script executable
chmod +x "$PROJECT_ROOT/bin/core"

# Create symbolic link in /usr/local/bin (requires sudo)
if command -v sudo >/dev/null 2>&1; then
    echo "📦 Creating global shortcut..."
    sudo ln -sf "$PROJECT_ROOT/bin/core" /usr/local/bin/core

    if [ $? -eq 0 ]; then
        echo "✅ Core Agent shortcut installed successfully!"
        echo "🎯 You can now use 'core' from anywhere in your system"
    else
        echo "❌ Failed to create global shortcut. Trying local installation..."

        # Fallback to local installation
        mkdir -p "$HOME/.local/bin"
        ln -sf "$PROJECT_ROOT/bin/core" "$HOME/.local/bin/core"

        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
            echo "📝 Added to PATH in shell configuration files"
        fi

        echo "✅ Core Agent shortcut installed locally!"
        echo "🎯 You can now use 'core' from anywhere in your system"
        echo "💡 You may need to restart your terminal or run 'source ~/.bashrc'"
    fi
else
    echo "📦 Creating local shortcut..."

    # Local installation
    mkdir -p "$HOME/.local/bin"
    ln -sf "$PROJECT_ROOT/bin/core" "$HOME/.local/bin/core"

    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc" 2>/dev/null || true
        echo "📝 Added to PATH in shell configuration files"
    fi

    echo "✅ Core Agent shortcut installed locally!"
    echo "🎯 You can now use 'core' from anywhere in your system"
    echo "💡 You may need to restart your terminal or run 'source ~/.bashrc'"
fi

# Test the installation
echo ""
echo "🧪 Testing installation..."
if command -v core >/dev/null 2>&1; then
    echo "✅ Core Agent shortcut is working!"
    echo ""
    echo "🚀 Quick Start:"
    echo "   core                    # Start natural language interface"
    echo "   core help               # Show help"
    echo "   core health             # Check system health"
    echo "   core shortcuts          # List all shortcuts"
    echo ""
    echo "💡 Examples:"
    echo "   core 'Check system health'"
    echo "   core 'Scan my network'"
    echo "   core 'Explain SQL injection'"
    echo "   core scan 192.168.1.0/24"
    echo "   core logs"
    echo "   core tools"
else
    echo "❌ Installation test failed. Please check the installation."
    echo "💡 Try running: source ~/.bashrc"
fi

echo ""
echo "📚 For more information, see:"
echo "   README.md - Main documentation"
echo "   HOW-TO-USE.md - User guide"
echo "   core help - Built-in help"

echo ""
echo "🎉 Installation complete!"
