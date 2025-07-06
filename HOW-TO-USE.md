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
- [Using the Agent](#3-using-the-agent-natural-language-interface)
- [Technical Shortcuts](#4-technical-shortcuts-for-power-users)
- [Main Features](#5-main-features-no-coding-needed)
- [Learning Missions](#6-learning-missions-learn-mode)
- [Safety Features](#7-safety-features)
- [Getting Help](#8-getting-help)
- [Stopping the Agent](#9-stopping-the-agent)
- [Using Cache-Augmented Generation (CAG) 🆕](#10-using-cache-augmented-generation-cag)
- [Using Retrieval-Augmented Generation (RAG) 🆕](#11-using-retrieval-augmented-generation-rag)
- [Advanced Features](#12-advanced-features-for-power-users)
- [Understanding the AI](#13-understanding-the-ais-capabilities)
- [Best Practices](#14-best-practices)
- [Troubleshooting](#15-troubleshooting)
- [Quick Reference](#16-quick-reference)

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
- **"Black Hat Python" by Justin Seitz & Tim Arnold**: Offensive security techniques
- **"The Hacker Playbook 3" by Peter Kim**: Red team methodologies
- **"RTFM: Red Team Field Manual v2" by Ben Clark & Nick Downer**: Security tools and techniques
- **"Hands-On Ethical Hacking and Network Defense" by Michael Simpson, Nicholas Antill & Robert Wilson**: Defensive security

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
  core
  ```

### **If you see errors, ask your IT admin to run the setup script:**

  ```bash
  bash scripts/terms.sh
  ```

---

## 3. Using the Agent (Natural Language Interface)

When you start the agent, you'll see a prompt like this:

```
🤖 Core Agent - Natural Language Cybersecurity Assistant
==================================================
💡 Type your request in natural language. Examples:
   "Check system health"
   "Analyze logs for threats"
   "Run nmap scan on localhost"
   "Explain SQL injection"
   "Start learning mission"
   "List available tools"
   "exit" or "quit" to exit

🤖 Enter your request:
```

**Simply type what you want the agent to do in natural language!** For example:

- "Check if my system is secure"
- "Scan my network for vulnerabilities"
- "Show me recent security alerts"
- "Start a learning mission"
- "What are lateral movement techniques?"
- "How do I detect network intrusions?"
- "Explain phishing attacks"
- "Run a port scan on 192.168.1.1"
- "What tools are available for penetration testing?"

**The AI understands your intent and will execute the appropriate actions automatically.**

---

## 4. Technical Shortcuts (For Power Users)

For technical users and security professionals, Core Agent provides convenient shortcuts that map to natural language commands:

### **Quick Start Shortcuts**

```bash
# System & Health
core health          # Check system health
core status          # Show system status
core stats           # Display system statistics

# Security Operations
core scan            # Run network scan
core logs            # Analyze security logs
core tools           # List available tools

# Learning & Knowledge
core explain         # Explain cybersecurity concept
core learn           # Start learning mission
core query           # Query knowledge base

# System Management
core help            # Show help information
core shortcuts       # List all shortcuts
core mode            # Toggle interface mode
core logout          # Logout current user
```

### **Shortcut Categories**

| Category | Shortcuts | Purpose |
|----------|-----------|---------|
| **System** | health, status, stats, help, logout | System management and health |
| **Security** | scan, logs, tools, audit | Security operations and monitoring |
| **Learning** | explain, learn, query, training | Knowledge and education |
| **Custom** | User-defined shortcuts | Personalized workflows |

### **Advanced Shortcut Usage**

```bash
# With parameters
core scan 192.168.1.0/24
core explain "SQL injection"
core query "network reconnaissance"

# Mode switching
core mode            # Toggle between natural language and technical mode

# Help and information
core help            # Show comprehensive help
core shortcuts       # List all available shortcuts
```

### **Shortcut Benefits**

- **Speed**: Execute common tasks quickly
- **Consistency**: Standardized commands across environments
- **Efficiency**: Reduce typing for frequent operations
- **Flexibility**: Easy to customize and extend
- **Integration**: Works seamlessly with natural language

---

## 5. Main Features (No Coding Needed)

### **Ask Questions & Get Knowledge**
- **General Questions**: Just type your question and press Enter
- **Cybersecurity Knowledge**: Ask about specific techniques, tools, or concepts
- **Code Examples**: Request practical implementation examples
- **Technique Explanations**: Get detailed explanations of attack and defense methods

**Examples:**
```bash
core query "network reconnaissance techniques"
core explain "lateral movement techniques"
core query "red team tools"
core stats
```

### **Run Security Tools**
- **List Available Tools**: See what security tools are available
- **Execute Tools**: Run specific tools with your parameters
- **Safe Execution**: Tools run in simulation mode by default for safety

**Examples:**
```bash
core tools
core scan 127.0.0.1
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
core logs
core logs --severity high
core logs --time-range 24h
```

### **Learn Mode (Interactive Training)**
- **Interactive Missions**: Step-by-step cybersecurity training
- **Personalized Learning**: Adapts to your skill level and role
- **Real-World Scenarios**: Practice with actual attack patterns
- **Progress Tracking**: Monitor your learning advancement
- **Hints System**: Get help when you're stuck

**Examples:**
```bash
core learn
core learn --mission recon
core learn --progress
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
core health
core stats
```

### **Knowledge Management**
- **Add Knowledge Sources**: Ingest new cybersecurity books or documents
- **Browse Concepts**: Explore available cybersecurity concepts
- **Category Filtering**: Find concepts by category (red-team, blue-team, etc.)
- **Statistics**: View knowledge base statistics

**Examples:**
```bash
core query "SQL injection"
core explain "phishing"
core tools --category all
```

---

## 6. Learning Missions (Learn Mode)

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

## 7. Safety Features

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

## 8. Getting Help

### **Built-in Help:**
- Type `help` at any time for a list of commands
- Use `core help` for comprehensive help information
- Use `core shortcuts` to see all available shortcuts
- The agent will guide you through complex processes

### **Support Options:**
- Ask your IT admin or support team
- Check the main README.md for technical details
- Review the documentation for quick commands
- Consult the AI_THOUGHT_PROCESS.md for understanding how the AI works

### **Common Issues:**

| Problem | Solution |
|---------|----------|
| **Permission Denied** | Ask your admin to check file permissions |
| **Tool Not Found** | Ensure the required tools are installed |
| **Connection Errors** | Verify network connectivity and service status |
| **Memory Issues** | Check system resources and configuration |

---

## 9. Stopping the Agent

- **Exit Learn Mode**: Type `exit` or `quit` in Learn Mode
- **Stop CLI**: Press `Ctrl+C` or close the terminal window
- **Stop All Services**: Run the stop script:

  ```bash
  ./stop-services.sh
  ```

---

## 10. Using Cache-Augmented Generation (CAG) 🆕

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
core cag:query "What is SQL injection?"

# Ask with specific options
core cag:query "How to detect malware?" --category blue-team --difficulty intermediate
```

#### **Check Cache Performance**
```bash
# See how well CAG is performing
core cag:stats
```

#### **Clear the Cache (if needed)**
```bash
# Clear all cached answers
core cag:clear
```

#### **Pre-load Common Questions**
```bash
# Load common cybersecurity questions for instant answers
core cag:prewarm
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
- High-volume query environments
- When you need consistent responses
- Performance-critical scenarios

### **When to Use Regular Queries (RAG)**
✅ **Use Regular Queries for:**
- Completely new topics or unique scenarios
- Real-time threat intelligence
- Research and development questions
- Dynamic content that changes frequently
- When you need fresh, up-to-date analysis
- Custom scenarios with specific context
- Debugging or understanding AI reasoning
- Low-query-volume environments

### **Why Both Are Important**

**CAG (Cache-Augmented Generation):**
- Provides lightning-fast responses for common questions
- Reduces computational overhead and costs
- Ensures consistent answers for training and compliance
- Optimizes performance in high-volume environments

**RAG (Retrieval-Augmented Generation):**
- Enables fresh, real-time analysis of new threats
- Provides adaptive learning from evolving cybersecurity landscapes
- Supports research and development of new security techniques
- Handles unique, one-off scenarios with custom context
- Essential for staying ahead of emerging threats

**Our System's Hybrid Approach:**
- Automatically uses CAG for repeated or similar queries
- Falls back to RAG for novel questions and dynamic content
- Intelligently chooses the best approach based on query context
- Combines efficiency with innovation for optimal results

### **CAG Tips**
1. **Start with Pre-warming**: Run `core cag:prewarm` to load common questions
2. **Check Stats**: Use `core cag:stats` to see how well it's working
3. **Clear When Needed**: Use `core cag:clear` if you want fresh answers
4. **Combine with Learning**: Use CAG during training missions for faster feedback

### **Advanced CAG Features**

#### **Export/Import Cache**
```bash
# Save your cache to a file
core cag:export my-cache.json

# Load cache from a file
core cag:import my-cache.json
```

#### **Benchmark Performance**
```bash
# Test CAG performance with your own questions
# First, create a file called queries.json with your questions:
# ["What is phishing?", "How to secure a network?", ...]
core cag:benchmark queries.json
```

### **CAG in Practice**

**Scenario 1: Training Session**
```bash
# Pre-warm with common training questions
core cag:prewarm

# During training, ask questions quickly
core cag:query "What is network reconnaissance?"
core cag:query "How to perform port scanning?"
# These will be instant responses!
```

**Scenario 2: Daily Security Work**
```bash
# Check cache performance
core cag:stats

# Ask about common security topics
core cag:query "OWASP Top 10 vulnerabilities"
core cag:query "Incident response procedures"
```

**Scenario 3: Team Knowledge Sharing**
```bash
# Export your team's cache
core cag:export team-cache.json

# Share with colleagues
# They can import it with:
core cag:import team-cache.json
```

### **Troubleshooting CAG**

**Problem**: CAG responses are slow
**Solution**: Check if cache is working with `core cag:stats`

**Problem**: Getting old information
**Solution**: Clear cache with `core cag:clear`

**Problem**: Want fresh answers
**Solution**: Use regular queries instead of CAG

**Problem**: Cache not working
**Solution**: Restart the system and try `core cag:prewarm`

---

## 11. Using Retrieval-Augmented Generation (RAG) 🆕

RAG is the core technology that enables Core Agent to access and retrieve information from cybersecurity knowledge sources in real-time.

### **What is RAG?**
- **Real-time Retrieval**: Gets fresh information from knowledge sources for each query
- **Dynamic Analysis**: Provides up-to-date responses based on current context
- **Novel Problem Solving**: Handles unique scenarios and new questions
- **Research Capability**: Enables exploration of new cybersecurity concepts

### **When to Use RAG**
✅ **Use RAG for:**
- Completely new topics or unique scenarios
- Real-time threat intelligence
- Research and development questions
- Dynamic content that changes frequently
- When you need fresh, up-to-date analysis
- Custom scenarios with specific context
- Debugging or understanding AI reasoning
- Low-query-volume environments

### **RAG vs CAG Comparison**

| Feature | RAG | CAG |
|---------|-----|-----|
| **Speed** | Normal (2-5 seconds) | Very Fast (50-200ms) |
| **Freshness** | Always current | May be cached |
| **Use Case** | New questions, research | Repeated questions |
| **Resource Usage** | Higher (per query) | Lower (cached) |
| **Best For** | Novel problems, real-time | Common queries, training |

### **RAG Commands**
```bash
# Ask a new question (uses RAG automatically)
core query "What is the latest zero-day vulnerability?"

# Research a new topic
core explain "quantum cryptography attacks"

# Get real-time threat analysis
core logs

# Custom scenario analysis
core query "Analyze this specific attack pattern..."
```

### **RAG in Practice**

**Scenario 1: Research Mode**
```bash
# Research new attack techniques
core query "What are the latest APT techniques?"

# Explore emerging threats
core explain "supply chain attacks 2024"
```

**Scenario 2: Real-time Analysis**
```bash
# Analyze current security events
core logs

# Get fresh threat intelligence
core query "latest ransomware variants"
```

**Scenario 3: Custom Scenarios**
```bash
# Ask about specific environments
core query "How would I secure a cloud-native application?"

# Get contextual advice
core query "defense strategies for IoT networks"
```

### **Why RAG is Essential**

**1. Fresh Intelligence**
- RAG provides real-time access to the latest cybersecurity knowledge
- Enables dynamic reasoning based on current threat landscapes
- Allows for novel problem-solving approaches

**2. Adaptive Learning**
- RAG can incorporate new information sources as they become available
- Enables the system to learn from new attack patterns and defense techniques
- Provides flexibility for evolving cybersecurity challenges

**3. Contextual Reasoning**
- RAG can process unique combinations of information for specific scenarios
- Enables deep analysis of complex, multi-faceted security problems
- Provides nuanced responses tailored to specific situations

**4. Research and Development**
- Essential for cybersecurity research and development
- Enables exploration of new attack vectors and defense strategies
- Critical for staying ahead of emerging threats

**5. Custom Scenarios**
- RAG can handle highly specific, one-off queries
- Enables personalized security analysis for unique environments
- Provides flexibility for custom security requirements

### **Hybrid Approach**

Our system intelligently combines both approaches:
- **CAG for Efficiency**: Cached responses for common queries and training scenarios
- **RAG for Innovation**: Fresh analysis for novel problems and dynamic content
- **Smart Fallback**: When CAG cache misses, automatically falls back to RAG
- **Context Awareness**: Chooses the best approach based on query type and context

---

## 12. Advanced Features (For Power Users)

### **Knowledge Queries:**
```bash
# Query specific cybersecurity knowledge
core query "Python network scanning"

# Get concepts by category
core query "red team techniques"

# View knowledge statistics
core stats

# Explain specific concepts
core explain "zero-day exploitation"
```

### **Tool Execution:**
```bash
# List all available tools
core tools

# Run a specific tool
core scan 192.168.1.0/24

# Run with simulation mode
core scan --simulation true
```

### **Log Analysis:**
```bash
# Analyze logs for anomalies
core logs

# Query specific log entries
core logs --severity high --time-range 24h

# View recent audit entries
core audit
```

### **System Management:**
```bash
# Check system health
core health

# Generate performance report
core stats

# Run self-healing diagnostics
core health --self-heal
```

---

## 13. Understanding the AI's Capabilities

Core Agent uses advanced AI technology to provide intelligent cybersecurity assistance:

### **Reasoning Engine:**
- **Multi-layered Analysis**: Uses different reasoning strategies based on complexity
- **Context Awareness**: Understands your environment and situation
- **Adaptive Intelligence**: Learns from interactions and improves over time

### **Knowledge Integration:**
- **Comprehensive Library**: Access to "Black Hat Python" by Justin Seitz & Tim Arnold, "The Hacker Playbook 3" by Peter Kim, "RTFM: Red Team Field Manual v2" by Ben Clark & Nick Downer, "Hands-On Ethical Hacking and Network Defense" by Michael Simpson, Nicholas Antill & Robert Wilson
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

## 14. Best Practices

### **For Beginners:**
- ✅ Start with natural language to understand basic concepts
- ✅ Use simulation mode when testing tools
- ✅ Ask for explanations when you don't understand something
- ✅ Take advantage of the hint system in missions

### **For Regular Users:**
- ✅ Build your knowledge gradually through missions
- ✅ Use the knowledge query features to learn new techniques
- ✅ Practice with real-world scenarios in safe environments
- ✅ Monitor your progress and focus on areas for improvement

### **For Advanced Users:**
- ✅ Use technical shortcuts for efficiency
- ✅ Customize your user mode based on your needs
- ✅ Integrate Core Agent with your existing security tools
- ✅ Use the audit logging for compliance and documentation
- ✅ Contribute to the knowledge base by ingesting new sources

---

## 15. Troubleshooting

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
- Consult the documentation for quick solutions

---

## 16. Quick Reference

### **Essential Commands:**
```bash
core                    # Start natural language interface
core help               # Get help
core health             # Check system health
core tools              # List available tools
core query "your question"  # Ask about security
```

### **Natural Language Examples:**
```bash
core
"Check system health"
"Scan my network for vulnerabilities"
"Explain SQL injection attacks"
"Start a learning mission"
"Analyze recent security logs"
"Show me available penetration testing tools"
```

### **Technical Shortcuts:**
```bash
core health             # Check system health
core scan 192.168.1.0/24  # Run network scan
core logs               # Analyze security logs
core tools              # List available tools
core explain "phishing" # Explain concept
core learn              # Start learning mission
core query "malware"    # Search knowledge base
core stats              # Show system statistics
```

### **CAG Commands:**
```bash
core cag:query "What is SQL injection?"
core cag:stats
core cag:prewarm
core cag:clear
```

### **Safety First:**
- 🔒 Always use simulation mode for testing
- 📝 All actions are logged for your protection
- 🛡️ User modes control access levels
- ⚠️ Ask for help if you're unsure

### **Getting Started:**
1. **Start Interface**: `core`
2. **Natural Language**: Type your request naturally
3. **Health Check**: `core health`
4. **List Tools**: `core tools`
5. **Get Help**: `core help`

---

Enjoy using Core Agent! The system is designed to be both powerful and user-friendly, helping you learn and practice cybersecurity safely and effectively.

> **💡 Pro Tip**: Start with natural language to get comfortable with the system before exploring technical shortcuts.

The AI combines advanced reasoning with comprehensive cybersecurity knowledge to provide intelligent, practical security guidance.
