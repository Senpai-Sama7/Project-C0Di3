#!/bin/bash
set -e

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Setup llama.cpp
bash scripts/setup-llama-cpp.sh

echo "\nSetup complete! To start the LLM server, run:"
echo "./llama.cpp/server -m models/gemma-2b-it.Q4_K_M.gguf --port 8000"
