---
layout: default
title: Core Agent FAQ
---

# Core Agent FAQ

[![FAQ](https://img.shields.io/badge/FAQ-blue)](https://github.com/your-repo)
[![User Support](https://img.shields.io/badge/User_Support-green)](https://github.com/your-repo)
[![Quick Answers](https://img.shields.io/badge/Quick_Answers-orange)](https://github.com/your-repo)

Frequently Asked Questions about Core Agent - Your Cybersecurity Intelligence Assistant

---

## Table of Contents

- [Getting Started](#getting-started)
- [Natural Language Interface](#natural-language-interface)
- [Technical Shortcuts](#technical-shortcuts)
- [Security & Safety](#security--safety)
- [Learning & Training](#learning--training)
- [Troubleshooting](#troubleshooting)
- [Advanced Features](#advanced-features)

---

## Getting Started

### **How do I start using Core Agent?**

Simply run `core` in your terminal. The system will guide you through authentication and then present the natural language interface where you can ask questions or give commands naturally.

### **What are the default login credentials?**

- **Username**: `admin`
- **Password**: `admin123`

*⚠️ Change these immediately after first login for production use.*

### **Do I need to install anything special?**

Core Agent requires Node.js (v18+) and some basic system tools. Run `bash scripts/terms.sh` to install all dependencies automatically.

### **How do I know if Core Agent is working properly?**

Run `core health` to check system status. This will verify all services are running and show performance metrics.

---

## Natural Language Interface

### **How does the natural language interface work?**

Core Agent uses advanced AI to understand your intent. Simply type what you want in plain English:

- "Check system health"
- "Scan my network for vulnerabilities"
- "Explain SQL injection attacks"
- "Start a learning mission"

The AI automatically maps your request to the appropriate action.

### **Do I need to activate a special mode for natural language?**

**No!** Natural language is the **default and primary interface**. When you start Core Agent with `core`, you can immediately begin typing natural language requests. No special mode activation is required.

### **What if the AI doesn't understand my request?**

Core Agent will provide helpful suggestions and examples. You can also use technical shortcuts like `core health` or `core scan` for direct commands.

### **Can I use both natural language and technical commands?**

**Yes!** You can seamlessly switch between approaches. Use natural language for complex requests and technical shortcuts for quick operations. Type `mode` to toggle the interface emphasis.

---

## Technical Shortcuts

### **What are technical shortcuts and when should I use them?**

Technical shortcuts are quick commands for power users:

```bash
core health          # Check system health
core scan            # Run network scan
core explain         # Explain cybersecurity concept
core learn           # Start learning mission
core logs            # Analyze security logs
core tools           # List available tools
```

Use them when you need speed and precision for common tasks.

### **How do I see all available shortcuts?**

Type `core shortcuts` or `help` to see a complete list of available shortcuts organized by category.

### **Can I create my own shortcuts?**

Yes! The system supports custom shortcuts. Contact your administrator to add personalized shortcuts for your workflow.

### **Do I need to activate a technical mode?**

**No!** Technical shortcuts work immediately alongside natural language. You can use either approach at any time without switching modes.

---

## Security & Safety

### **Is Core Agent safe to use?**

**Yes!** Core Agent includes multiple safety features:

- **Simulation Mode**: Tools run safely by default
- **User Modes**: Different access levels (beginner, pro, simulation, safe)
- **Audit Logging**: All actions are recorded
- **Permission System**: Granular control over tool execution

### **What happens if I run a dangerous command?**

Core Agent will warn you before executing potentially dangerous operations and may require confirmation. In simulation mode, tools run safely without real impact.

### **How do I enable simulation mode for safe testing?**

Use `core --simulation` or type "simulation mode" in natural language. This ensures all tools run safely without affecting your system.

### **Are my actions logged?**

**Yes!** All actions are logged for security and compliance. You can view audit logs with `core audit` or "Show me recent audit logs".

---

## Learning & Training

### **How do I start learning cybersecurity?**

Type "Start learning mission" or use `core learn`. Core Agent will guide you through interactive training missions tailored to your skill level.

### **What types of training missions are available?**

- **Reconnaissance Basics**: Information gathering techniques
- **Network Monitoring**: Traffic analysis and threat detection
- **Web Application Security**: OWASP Top 10 and testing methodologies
- **Malware Analysis**: Static/dynamic analysis techniques
- **Incident Response**: IR procedures and evidence collection

### **Can I track my learning progress?**

Yes! Use `core learn --progress` or ask "Show my learning progress" to see your advancement through different skill levels.

### **Are the training scenarios safe?**

**Absolutely!** All training missions run in simulation mode by default, ensuring you can practice safely without any real impact on systems.

---

## Troubleshooting

### **Core Agent won't start. What should I do?**

1. Check if all services are running: `./start-services.sh`
2. Verify Node.js is installed: `node --version`
3. Check system health: `core health`
4. Review logs in `data/logs/` directory

### **I'm getting permission errors. How do I fix this?**

1. Ensure you're authenticated: `core logout` then login again
2. Check your user role and permissions
3. Use simulation mode for testing: `core --simulation`
4. Contact your administrator for access issues

### **The AI responses are slow. What can I do?**

1. Check system resources: `core stats`
2. Use CAG for faster responses: `core cag:query "your question"`
3. Pre-warm the cache: `core cag:prewarm`
4. Check network connectivity to LLM services

### **Tools aren't working. How do I troubleshoot?**

1. Verify tools are installed: `core tools --installed`
2. Check tool permissions: `core tools --available`
3. Use simulation mode: `core --simulation`
4. Review tool-specific logs in `data/logs/`

---

## Advanced Features

### **What is CAG and when should I use it?**

**Cache-Augmented Generation (CAG)** provides lightning-fast responses for repeated questions:

```bash
core cag:query "What is SQL injection?"
core cag:stats
core cag:prewarm
```

Use CAG for:
- Repeated questions
- Training sessions
- Quick reference lookups
- High-volume environments

### **What is RAG and when should I use it?**

**Retrieval-Augmented Generation (RAG)** provides fresh, real-time analysis:

```bash
core query "What is the latest zero-day vulnerability?"
core explain "quantum cryptography attacks"
```

Use RAG for:
- New or unique questions
- Real-time threat intelligence
- Research and development
- Dynamic content analysis

### **How do I access advanced mode features?**

Advanced mode is controlled via environment variables in the `.gitsensei` file. This file is auto-loaded at startup and enables advanced features for power users.

### **Can I customize the AI's knowledge base?**

Yes! Core Agent can ingest new cybersecurity books and documents. Contact your administrator to add new knowledge sources to the system.

### **How do I export my data and settings?**

```bash
core config --export my-config.json
core cag:export my-cache.json
core audit --export audit-logs.json
```

### **Can I integrate Core Agent with other security tools?**

Yes! Core Agent supports integration with existing SIEM systems, security tools, and APIs. Contact your administrator for integration options.

---

## Performance & Optimization

### **How can I improve Core Agent's performance?**

1. **Use CAG for repeated queries**: `core cag:prewarm`
2. **Monitor system resources**: `core stats`
3. **Optimize memory usage**: `core memory --optimize`
4. **Use appropriate user modes**: Match mode to your needs

### **What are the system requirements?**

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores
- **Storage**: 10GB free space for models and cache
- **Network**: Stable internet for initial setup

### **How do I monitor Core Agent's health?**

```bash
core health              # Comprehensive health check
core stats               # Performance metrics
core performance         # Detailed performance analysis
```

### **Can I run Core Agent in a container?**

Yes! Core Agent supports Docker deployment. See the deployment documentation for containerized setup instructions.

---

## Support & Community

### **Where can I get help if I'm stuck?**

1. **Built-in help**: Type `help` or `core help`
2. **Documentation**: Check `docs/` directory
3. **Technical cheat sheet**: See `docs/TECHNICAL_CHEAT_SHEET.md`
4. **Community**: Join our support channels
5. **Administrator**: Contact your system administrator

### **How do I report bugs or request features?**

1. Check existing issues in the project repository
2. Create a detailed bug report with logs
3. Include steps to reproduce the issue
4. Provide system information and error messages

### **Is there a community or forum?**

Yes! Join our community channels for:
- User discussions and tips
- Feature requests and feedback
- Troubleshooting help
- Best practices sharing

---

## Privacy & Compliance

### **Is my data private?**

**Yes!** Core Agent operates entirely on-premises. Your data never leaves your infrastructure, ensuring complete privacy and control.

### **Are there audit logs for compliance?**

**Yes!** All actions are logged with detailed audit trails:
- User authentication and sessions
- Tool executions and results
- System changes and configurations
- Query history and responses

### **Can I customize the logging level?**

Yes! Set the `CORE_LOG_LEVEL` environment variable to control logging detail:
- `debug`: Detailed debugging information
- `info`: General information (default)
- `warn`: Warning messages only
- `error`: Error messages only

### **How long are logs retained?**

Log retention is configurable. Default settings retain:
- **Audit logs**: 90 days
- **Performance logs**: 30 days
- **Debug logs**: 7 days
- **Cache data**: Until manually cleared

---

## Quick Reference

### **Essential Commands**
```bash
core                    # Start interface
core health             # Check system health
core help               # Get help
core shortcuts          # List shortcuts
core mode               # Toggle interface mode
```

### **Natural Language Examples**
```bash
"Check system health"
"Scan my network for vulnerabilities"
"Explain SQL injection attacks"
"Start a learning mission"
"Show available tools"
```

### **Technical Shortcuts**
```bash
core health             # System health
core scan 192.168.1.0/24  # Network scan
core logs               # Log analysis
core tools              # List tools
core explain "phishing" # Explain concept
core learn              # Start learning
core query "malware"    # Search knowledge
```

### **CAG Commands**
```bash
core cag:query "What is SQL injection?"
core cag:stats
core cag:prewarm
core cag:clear
```

---

*This FAQ covers the most common questions about Core Agent. For detailed technical information, see the main documentation and technical cheat sheet.*

**Last Updated**: 2024
**Version**: 1.0
