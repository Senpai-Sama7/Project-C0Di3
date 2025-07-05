#!/bin/bash
set -e

# Clone llama.cpp if not present
if [ ! -d "llama.cpp" ]; then
  git clone https://github.com/ggerganov/llama.cpp.git
fi

# Build llama.cpp
cd llama.cpp
make
cd ..

# Download Mistral-7B GGUF model (Q4_K_M quantized)
mkdir -p models
MODEL_PATH="models/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
if [ ! -f "$MODEL_PATH" ]; then
  echo "Downloading Mistral-7B Instruct GGUF model (Q4_K_M)..."
  wget -O "$MODEL_PATH" https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
else
  echo "Model already exists: $MODEL_PATH"
fi

echo "llama.cpp and Mistral-7B model setup complete."

echo "To run the server:"
echo "cd llama.cpp && ./server -m ../models/mistral-7b-instruct-v0.2.Q4_K_M.gguf --port 8000"
