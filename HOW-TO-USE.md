# How to Use Core Agent (Non-Technical Guide)

[![User-Friendly](https://img.shields.io/badge/User-Friendly-brightgreen)](https://github.com/your-repo)
[![Interactive Learning](https://img.shields.io/badge/Interactive_Learning-blue)](https://github.com/your-repo)
[![Safety First](https://img.shields.io/badge/Safety_First-orange)](https://github.com/your-repo)
[![No Coding Required](https://img.shields.io/badge/No_Coding_Required-green)](https://github.com/your-repo)

Welcome! This guide will help you use the Core Agent system, even if you have no technical background. Follow these simple steps to get started, use the main features, and get help if you need it.

---

## Table of Contents

- [What is Core Agent?](#1-what-is-core-agent)
- [Starting the Agent](#2-starting-the-agent)
- [Using the Agent](#3-using-the-agent-simple-commands)
- [Main Features](#4-main-features-no-coding-needed)
- [Learning Missions](#5-learning-missions-learn-mode)
- [Safety Features](#6-safety-features)
- [Getting Help](#7-getting-help)
- [Stopping the Agent](#8-stopping-the-agent)
- [Using Cache-Augmented Generation (CAG) 🆕](#9-using-cache-augmented-generation-cag)
- [Advanced Features](#10-advanced-features-for-power-users)
- [Understanding the AI](#11-understanding-the-ais-capabilities)
- [Best Practices](#12-best-practices)
- [Troubleshooting](#13-troubleshooting)
- [Quick Reference](#14-quick-reference)

---

## 1. What is Core Agent?

Core Agent is a smart assistant for cybersecurity and learning. It can:

- ✅ Answer questions and explain security concepts
- ✅ Run security tools (red/blue team)
- ✅ Analyze logs for threats
- ✅ Teach you with interactive missions (Learn Mode)
- ✅ Monitor its own health and fix problems automatically
- ✅ Access comprehensive cybersecurity knowledge from authoritative books
- ✅ Provide advanced reasoning and analysis
- ✅ Track your learning progress and adapt to your skill level

### **How the AI "Thinks" About Cybersecurity**

Core Agent uses advanced AI technology with three different thinking strategies:

#### **🧠 Multi-Layered Reasoning**
- **Zero-Shot**: Direct responses for simple queries
- **Darwin-Gödel**: Evolutionary problem-solving for complex scenarios
- **Absolute Zero**: First-principles reasoning for novel problems

#### **📚 Knowledge Sources**
The AI processes 4 cybersecurity books:
- **Black Hat Python**: Offensive security techniques
- **The Hacker Playbook**: Red team methodologies
- **Blue Team Handbook**: Defensive security
- **RTFm**: Security tools and techniques

#### **🔍 Knowledge Access Process**
1. **Input Analysis**: Extracts cybersecurity terms from your question
2. **Semantic Search**: Finds relevant concepts using AI embeddings
3. **Context Enhancement**: Adds book content to reasoning context
4. **Prompt Augmentation**: Enhances generation with knowledge
5. **Response Generation**: Provides informed, practical guidance

---

## 2. Starting the Agent

### **If your system is already set up:**

- Double-click or run the `start-services.sh` script (if available)
- Or, open a terminal and type:

  ```bash
  node bin/cli.js
  ```

### **If you see errors, ask your IT admin to run the setup script:**

  ```bash
  bash scripts/setup.sh
  ```

---

## 3. Using the Agent (Simple Commands)

When you see a prompt like this:

```
🤖 Enter your prompt:
```

Type what you want the agent to do! For example:

- "Explain phishing"
- "Scan my network for threats"
- "Show me recent security alerts"
- "Start a learning mission"
- "What are lateral movement techniques?"
- "How do I detect network intrusions?"

---

## 4. Main Features (No Coding Needed)

### **Ask Questions & Get Knowledge**
- **General Questions**: Just type your question and press Enter
- **Cybersecurity Knowledge**: Ask about specific techniques, tools, or concepts
- **Code Examples**: Request practical implementation examples
- **Technique Explanations**: Get detailed explanations of attack and defense methods

**Examples:**
```bash
node bin/cli.js --cyber-query "network reconnaissance techniques"
node bin/cli.js --explain "lateral movement techniques"
node bin/cli.js --cyber-category red-team
node bin/cli.js --cyber-stats
```

### **Run Security Tools**
- **List Available Tools**: See what security tools are available
- **Execute Tools**: Run specific tools with your parameters
- **Safe Execution**: Tools run in simulation mode by default for safety

**Examples:**
```bash
node bin/cli.js --list-tools
node bin/cli.js --tool nmap --args '{"target": "127.0.0.1"}'
```

**Available Tools:**

| Category | Tools | Purpose |
|----------|-------|---------|
| **Red Team** | nmap, burpsuite, metasploit, sqlmap | Attack and penetration testing |
| **Blue Team** | snort, suricata, wazuh, yara, osquery | Defense and monitoring |

### **Analyze Logs & Detect Threats**
- **Log Analysis**: Check for security threats and anomalies
- **Audit Logs**: View recent system activities
- **Query Logs**: Search for specific events or patterns
- **Threat Detection**: Machine learning identifies unusual patterns

**Examples:**
```bash
node bin/cli.js --analyze-logs
node bin/cli.js --audit-log
node bin/cli.js --query-logs '{"severity": "high", "time_range": "24h"}'
```

### **Learn Mode (Interactive Training)**
- **Interactive Missions**: Step-by-step cybersecurity training
- **Personalized Learning**: Adapts to your skill level and role
- **Real-World Scenarios**: Practice with actual attack patterns
- **Progress Tracking**: Monitor your learning advancement
- **Hints System**: Get help when you're stuck

**Examples:**
```bash
node bin/cli.js --learn-mode
node bin/cli.js --list-missions
node bin/cli.js --start-mission reconnaissance-basics
node bin/cli.js --mission-progress
```

**Available Mission Categories:**

| Category | Description | Difficulty Levels |
|----------|-------------|-------------------|
| **Red Team** | Attack techniques and penetration testing | Beginner to Advanced |
| **Blue Team** | Defense and monitoring strategies | Beginner to Advanced |
| **General** | Basic cybersecurity concepts | Beginner to Intermediate |

### **System Health & Monitoring**
- **Health Check**: Verify everything is working properly
- **Performance Report**: Get detailed system metrics
- **Self-Healing**: Automatically fix problems
- **Resource Monitoring**: Track system performance

**Examples:**
```bash
node bin/cli.js --health-check
node bin/cli.js --performance-report
node bin/cli.js --self-heal
```

### **Knowledge Management**
- **Add Knowledge Sources**: Ingest new cybersecurity books or documents
- **Browse Concepts**: Explore available cybersecurity concepts
- **Category Filtering**: Find concepts by category (red-team, blue-team, etc.)
- **Statistics**: View knowledge base statistics

**Examples:**
```bash
node bin/cli.js --ingest-book <path-to-book>
node bin/cli.js --cyber-concepts
node bin/cli.js --cyber-category blue-team
```

---

## 5. Learning Missions (Learn Mode)

When you enter Learn Mode, you'll have access to:

### **Available Commands:**
| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `missions` | List available training missions |
| `start <mission-id>` | Begin a specific mission |
| `progress` | Show your learning progress |
| `explain <concept>` | Get detailed explanations |
| `hint [context]` | Get help for current mission |
| `complete <data>` | Submit mission completion |
| `exit/quit` | Exit learn mode |

### **Mission Types:**

| Mission Type | Description | Skills Covered |
|--------------|-------------|----------------|
| **Reconnaissance Basics** | Learn information gathering techniques | OSINT, network scanning, target identification |
| **Network Monitoring** | Master traffic analysis and threat detection | Traffic analysis, anomaly detection, alerting |
| **Web Application Security** | Understand web vulnerabilities | OWASP Top 10, testing methodologies |
| **Malware Analysis** | Learn to identify and analyze malicious software | Static/dynamic analysis, reverse engineering |
| **Incident Response** | Practice responding to security incidents | IR procedures, evidence collection, containment |

### **Difficulty Levels:**

| Level | Description | Prerequisites |
|-------|-------------|---------------|
| **Beginner** | Basic concepts and simple scenarios | None |
| **Intermediate** | More complex techniques and real-world applications | Basic cybersecurity knowledge |
| **Advanced** | Expert-level challenges and advanced methodologies | Intermediate cybersecurity experience |

---

## 6. Safety Features

Core Agent includes several safety features to protect you:

### **User Modes:**

| Mode | Access Level | Safety Features |
|------|-------------|-----------------|
| **Beginner** | Limited access | Extra safety checks, guided experience |
| **Pro** | Full access | Appropriate warnings, advanced features |
| **Simulation** | Safe testing | No real impact, practice environment |
| **Safe** | Maximum restrictions | Read-only operations, no tool execution |

### **Tool Permissions:**
- **Granular Control**: Fine-tuned permissions for each tool
- **Approval Required**: Some tools require explicit permission
- **Simulation Mode**: Tools run safely without real impact
- **Audit Logging**: All actions are recorded for review

### **Content Filtering:**
- **Appropriate Use**: Ensures offensive techniques are used responsibly
- **Educational Focus**: Primarily for learning and defensive purposes
- **Legal Compliance**: Respects applicable laws and regulations

---

## 7. Getting Help

### **Built-in Help:**
- Type `--help` at any time for a list of commands
- Use `help` in Learn Mode for mission-specific commands
- The agent will guide you through complex processes

### **Support Options:**
- Ask your IT admin or support team
- Check the main README.md for technical details
- Review the QUICK_REFERENCE.md for quick commands
- Consult the AI_THOUGHT_PROCESS.md for understanding how the AI works

### **Common Issues:**

| Problem | Solution |
|---------|----------|
| **Permission Denied** | Ask your admin to check file permissions |
| **Tool Not Found** | Ensure the required tools are installed |
| **Connection Errors** | Verify network connectivity and service status |
| **Memory Issues** | Check system resources and configuration |

---

## 8. Stopping the Agent

- **Exit Learn Mode**: Type `exit` or `quit` in Learn Mode
- **Stop CLI**: Press `Ctrl+C` or close the terminal window
- **Stop All Services**: Run the stop script:

  ```bash
  ./stop-services.sh
  ```

---

## 9. Using Cache-Augmented Generation (CAG) 🆕

CAG is like having a super-fast memory for cybersecurity questions. It remembers previous answers and gives you instant responses for similar questions.

### **What is CAG?**
- **Faster Responses**: Get answers in milliseconds instead of seconds
- **Smart Memory**: Remembers similar questions and their answers
- **Always Learning**: Gets smarter with each question you ask
- **Privacy Safe**: All memory stays on your computer

### **Basic CAG Commands**

#### **Ask a Question with CAG**
```bash
# Ask about cybersecurity topics
core-agent cag:query "What is SQL injection?"

# Ask with specific options
core-agent cag:query "How to detect malware?" --category blue-team --difficulty intermediate
```

#### **Check Cache Performance**
```bash
# See how well CAG is performing
core-agent cag:stats
```

#### **Clear the Cache (if needed)**
```bash
# Clear all cached answers
core-agent cag:clear
```

#### **Pre-load Common Questions**
```bash
# Load common cybersecurity questions for instant answers
core-agent cag:prewarm
```

### **CAG vs Regular Queries**

| Type | Speed | Best For |
|------|-------|----------|
| **CAG Query** | Very Fast (50-200ms) | Repeated questions, similar topics |
| **Regular Query** | Normal (2-5 seconds) | New questions, unique topics |

### **When to Use CAG**
✅ **Use CAG for:**
- Questions you've asked before
- Similar cybersecurity topics
- Quick reference lookups
- Training and learning sessions

❌ **Use Regular Queries for:**
- Completely new topics
- Unique scenarios
- When you want fresh analysis

### **CAG Tips**
1. **Start with Pre-warming**: Run `cag:prewarm` to load common questions
2. **Check Stats**: Use `cag:stats` to see how well it's working
3. **Clear When Needed**: Use `cag:clear` if you want fresh answers
4. **Combine with Learning**: Use CAG during training missions for faster feedback

### **Advanced CAG Features**

#### **Export/Import Cache**
```bash
# Save your cache to a file
core-agent cag:export my-cache.json

# Load cache from a file
core-agent cag:import my-cache.json
```

#### **Benchmark Performance**
```bash
# Test CAG performance with your own questions
# First, create a file called queries.json with your questions:
# ["What is phishing?", "How to secure a network?", ...]
core-agent cag:benchmark queries.json
```

### **CAG in Practice**

**Scenario 1: Training Session**
```bash
# Pre-warm with common training questions
core-agent cag:prewarm

# During training, ask questions quickly
core-agent cag:query "What is network reconnaissance?"
core-agent cag:query "How to perform port scanning?"
# These will be instant responses!
```

**Scenario 2: Daily Security Work**
```bash
# Check cache performance
core-agent cag:stats

# Ask about common security topics
core-agent cag:query "OWASP Top 10 vulnerabilities"
core-agent cag:query "Incident response procedures"
```

**Scenario 3: Team Knowledge Sharing**
```bash
# Export your team's cache
core-agent cag:export team-cache.json

# Share with colleagues
# They can import it with:
core-agent cag:import team-cache.json
```

### **Troubleshooting CAG**

**Problem**: CAG responses are slow
**Solution**: Check if cache is working with `cag:stats`

**Problem**: Getting old information
**Solution**: Clear cache with `cag:clear`

**Problem**: Want fresh answers
**Solution**: Use regular queries instead of CAG

**Problem**: Cache not working
**Solution**: Restart the system and try `cag:prewarm`

---

## 10. Advanced Features (For Power Users)

### **Knowledge Queries:**
```bash
# Query specific cybersecurity knowledge
node bin/cli.js --cyber-query "Python network scanning"

# Get concepts by category
node bin/cli.js --cyber-category red-team

# View knowledge statistics
node bin/cli.js --cyber-stats

# Explain specific concepts
node bin/cli.js --explain "zero-day exploitation"
```

### **Tool Execution:**
```bash
# List all available tools
node bin/cli.js --list-tools

# Run a specific tool
node bin/cli.js --tool nmap --args '{"target": "192.168.1.0/24"}'

# Run with simulation mode
node bin/cli.js --simulation true --tool metasploit
```

### **Log Analysis:**
```bash
# Analyze logs for anomalies
node bin/cli.js --analyze-logs

# Query specific log entries
node bin/cli.js --query-logs '{"severity": "high", "time_range": "24h"}'

# View recent audit entries
node bin/cli.js --audit-log
```

### **System Management:**
```bash
# Check system health
node bin/cli.js --health-check

# Generate performance report
node bin/cli.js --performance-report

# Run self-healing diagnostics
node bin/cli.js --self-heal
```

---

## 11. Understanding the AI's Capabilities

Core Agent uses advanced AI technology to provide intelligent cybersecurity assistance:

### **Reasoning Engine:**
- **Multi-layered Analysis**: Uses different reasoning strategies based on complexity
- **Context Awareness**: Understands your environment and situation
- **Adaptive Intelligence**: Learns from interactions and improves over time

### **Knowledge Integration:**
- **Comprehensive Library**: Access to Black Hat Python, Hacker Playbook, Blue Team Handbook, RTFm
- **Semantic Search**: Finds relevant information even with natural language queries
- **Code Examples**: Provides practical implementation examples
- **Technique Extraction**: Identifies attack and defense techniques automatically

### **Memory Systems:**
- **Episodic Memory**: Remembers past security events and experiences
- **Semantic Memory**: Stores conceptual knowledge and understanding
- **Procedural Memory**: Maintains step-by-step procedures and methodologies
- **Working Memory**: Handles short-term context and active problem-solving

### **Learning & Adaptation:**
- **Memory Systems**: Semantic, episodic, procedural, working memory
- **Feedback Loop**: Learns from interactions and outcomes
- **Performance Monitoring**: Tracks response quality
- **Strategy Optimization**: Adjusts reasoning based on success

### **Knowledge Statistics:**
The AI can provide:
- Total concepts loaded from books
- Concepts by category and difficulty
- Related techniques and tools
- Confidence scores for responses
- Source attribution for information

---

## 12. Best Practices

### **For Beginners:**
- ✅ Start with Learn Mode to understand basic concepts
- ✅ Use simulation mode when testing tools
- ✅ Ask for explanations when you don't understand something
- ✅ Take advantage of the hint system in missions

### **For Regular Users:**
- ✅ Build your knowledge gradually through missions
- ✅ Use the knowledge query features to learn new techniques
- ✅ Practice with real-world scenarios in safe environments
- ✅ Monitor your progress and focus on areas for improvement

### **For Advanced Users:**
- ✅ Customize your user mode based on your needs
- ✅ Integrate Core Agent with your existing security tools
- ✅ Use the audit logging for compliance and documentation
- ✅ Contribute to the knowledge base by ingesting new sources

---

## 13. Troubleshooting

### **Common Problems:**

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Agent won't start** | Error messages, services not responding | Check if all services are running, verify configuration files |
| **Tools not working** | "Tool not found" errors, permission denied | Verify tools are installed, check permissions, use simulation mode |
| **Learn Mode issues** | Missions not loading, progress not saving | Restart the agent, check progress status, use hint system |
| **Performance problems** | Slow responses, high resource usage | Run health check, use performance report, try self-healing |

### **Getting Support:**
- Check the main README.md for technical details
- Review logs in the `data/logs/` directory
- Ask your IT admin for system-level issues
- Consult the QUICK_REFERENCE.md for quick solutions

---

## 14. Quick Reference

### **Essential Commands:**
```bash
node bin/cli.js --help                    # Get help
node bin/cli.js --learn-mode              # Start learning
node bin/cli.js --health-check            # Check system
node bin/cli.js --list-tools              # See available tools
node bin/cli.js --cyber-query "your question"  # Ask about security
```

### **Knowledge Commands:**
```bash
node bin/cli.js --cyber-query "network scanning"
node bin/cli.js --cyber-stats
node bin/cli.js --cyber-category red-team
node bin/cli.js --explain "lateral movement"
```

### **CAG Commands:**
```bash
core-agent cag:query "What is SQL injection?"
core-agent cag:stats
core-agent cag:prewarm
core-agent cag:clear
```

### **Safety First:**
- 🔒 Always use simulation mode for testing
- 📝 All actions are logged for your protection
- 🛡️ User modes control access levels
- ⚠️ Ask for help if you're unsure

### **Getting Started:**
1. **Basic Query**: `node bin/cli.js --cyber-query "your question"`
2. **Learn Mode**: `node bin/cli.js --learn-mode`
3. **Health Check**: `node bin/cli.js --health-check`
4. **List Tools**: `node bin/cli.js --list-tools`

---

Enjoy using Core Agent! The system is designed to be both powerful and user-friendly, helping you learn and practice cybersecurity safely and effectively.

> **💡 Pro Tip**: Start with Learn Mode to get comfortable with the system before exploring advanced features.

The AI combines advanced reasoning with comprehensive cybersecurity knowledge to provide intelligent, practical security guidance.
