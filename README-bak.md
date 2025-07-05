# Core Agent

## Overview

Core Agent is a robust, production-ready AI agent system for cybersecurity, learning, and automation. It features a local LLM backend (llama.cpp, default: Gemma3n:4B), advanced memory, reasoning, and tool systems, and is designed for both technical and non-technical users.

---

## Features

- Local LLM backend (llama.cpp, default: Gemma3n:4B)
- Online/offline operation
- Advanced memory, reasoning, learning, and tool systems
- Plugin architecture
- Persistent, queryable audit logging
- Log analysis and anomaly detection (SIEM)
- Interactive Learn Mode with educational feedback
- Health monitoring and self-healing
- Red/blue team tools (nmap, burpsuite, snort, osquery, yara, metasploit, suricata, wazuh, etc.)
- Fine-grained permissions system
- CLI and API support for all features
- Easy install, extensible, privacy-friendly

---

## Quick Start

```bash
git clone <repo-url>
cd core
bash scripts/setup.sh
./start-services.sh
```

---

## Installation

1. **Install prerequisites:**
   - Node.js (v18+)
   - gcc/g++ (for building llama.cpp)
   - wget, git
   - [Miniconda](https://docs.conda.io/en/latest/miniconda.html) (for log analyzer microservice)
2. **Run the setup script:**

   ```bash
   bash scripts/setup.sh
   ```

3. **Start all services:**

   ```bash
   ./start-services.sh
   ```

---

## Configuration

- Edit `.env` for all main settings (LLM API, memory, logging, etc.)
- Main options:
  - `LLM_API_URL` (default: <http://localhost:8000>)
  - `MODEL_PATH` (default: models/gemma-2b-it.Q4_K_M.gguf)
  - `PORT` (agent server port, if applicable)
  - `LOG_ANALYZER_URL` (default: <http://localhost:5001>)
  - `MEMORY_VECTOR_STORE`, `MEMORY_PERSISTENCE_PATH`, etc.

---

## CLI Usage

```bash
node bin/cli.js --help
```

### Common Commands

- `--prompt <text>`: Ask a question or give a task
- `--list-tools`: List all available tools
- `--tool <tool> --args '<json>'`: Run a specific tool
- `--audit-log`: Show recent audit log entries
- `--analyze-logs`: Analyze audit logs for anomalies
- `--query-logs <filter>`: Query audit logs with filter (JSON)
- `--learn-mode`: Enter interactive learning mode
- `--list-missions`: List available training missions
- `--start-mission <id>`: Start a training mission
- `--mission-progress`: Show learning progress
- `--explain <concept>`: Explain a cybersecurity concept
- `--health-check`: Check system health
- `--performance-report`: Generate performance report
- `--self-heal`: Run self-healing diagnostics

---

## Log Analysis & SIEM

- Real-time anomaly detection using machine learning
- Persistent, queryable audit logging
- Automated threat detection and alerting
- Use `--analyze-logs` and `--query-logs` for SIEM features

---

## Learn Mode (Interactive Training)

- Step-by-step missions, feedback, hints, and progress tracking
- Use `--learn-mode`, `--list-missions`, `--start-mission`, `--mission-progress`, `--explain`, `--hint`

---

## Health Monitoring & Self-Healing

- Continuous system health monitoring
- Automated self-healing procedures
- Performance metrics and reporting
- Use `--health-check`, `--performance-report`, `--self-heal`

---

## Red/Blue Team Tools & Permissions

- Red team: nmap, burpsuite, sqlmap, metasploit, etc.
- Blue team: snort, osquery, yara, suricata, wazuh, etc.
- Fine-grained permissions per user/session/tool
- All tool executions are logged and can be simulated for safety

---

## API Usage

- All features are available via CLI and can be integrated into scripts or other systems
- For advanced API usage, see the codebase or contact the maintainer

---

## Documentation & Help

- Full documentation is generated in `docs/README.md` after running `scripts/setup.sh`
- For non-technical users, see [HOW-TO-USE.md](./HOW-TO-USE.md)
- For troubleshooting, see the Troubleshooting section in `docs/README.md`

---

## License

MIT
