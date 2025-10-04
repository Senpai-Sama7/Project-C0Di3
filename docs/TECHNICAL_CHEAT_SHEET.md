---
layout: default
title: Technical Cheat Sheet
---

# Core Agent Technical Cheat Sheet

[![Technical Users](https://img.shields.io/badge/Technical_Users-blue)](https://github.com/your-repo)
[![Power Users](https://img.shields.io/badge/Power_Users-green)](https://github.com/your-repo)
[![Quick Reference](https://img.shields.io/badge/Quick_Reference-orange)](https://github.com/your-repo)

A comprehensive reference for technical users and power users of Core Agent. This cheat sheet covers all shortcuts, commands, and technical details for efficient cybersecurity operations.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Natural Language Interface](#natural-language-interface)
- [Technical Shortcuts](#technical-shortcuts)
- [System Commands](#system-commands)
- [Security Operations](#security-operations)
- [Learning & Knowledge](#learning--knowledge)
- [CAG Operations](#cag-operations)
- [RAG Operations](#rag-operations)
- [Tool Integration](#tool-integration)
- [Log Analysis](#log-analysis)
- [Advanced Features](#advanced-features)
- [Bash Shortcuts](#bash-shortcuts)
- [Troubleshooting](#troubleshooting)
- [Configuration](#configuration)

---

## Quick Start

```bash
# Start Core Agent
core

# Check system health
core health

# List available tools
core tools

# Get help
core help
```

---

## Natural Language Interface

### **Primary Commands**
```bash
core                    # Start natural language interface
```

### **Natural Language Examples**
```bash
"Check system health"
"Analyze recent logs for threats"
"Run nmap scan on 192.168.1.0/24"
"Explain SQL injection"
"Start a reconnaissance mission"
"List available security tools"
"What are the latest cybersecurity threats?"
"How do I detect malware?"
"Show me network monitoring techniques"
"Start learning mission"
"Analyze security logs"
"Show available tools"
"What is phishing?"
"How to secure a network?"
```

---

## Technical Shortcuts

### **System & Health**
```bash
core health             # Check system health
core status             # Show system status
core stats              # Display system statistics
core help               # Show help information
core shortcuts          # List all shortcuts
core mode               # Toggle interface mode
core logout             # Logout current user
```

### **Security Operations**
```bash
core scan               # Run network scan
core logs               # Analyze security logs
core tools              # List available tools
core audit              # View audit logs
```

### **Learning & Knowledge**
```bash
core explain            # Explain cybersecurity concept
core learn              # Start learning mission
core query              # Query knowledge base
core training           # Enter training mode
```

### **Advanced Operations**
```bash
core cag:query          # Cache-augmented generation query
core cag:stats          # CAG statistics
core cag:prewarm        # Pre-warm CAG cache
core cag:clear          # Clear CAG cache
core cag:export         # Export cache
core cag:import         # Import cache
core cag:benchmark      # Benchmark CAG performance
```

---

## System Commands

### **Health & Status**
```bash
core health             # Comprehensive health check
core health --self-heal # Run self-healing diagnostics
core status             # Quick status overview
core stats              # Detailed performance metrics
core stats --verbose    # Verbose statistics
```

### **System Management**
```bash
core help               # Comprehensive help
core help <command>     # Help for specific command
core shortcuts          # List all available shortcuts
core mode               # Toggle between modes
core mode --list        # List available modes
core logout             # Logout current session
core logout --force     # Force logout
```

### **Configuration**
```bash
core config             # Show current configuration
core config --edit      # Edit configuration
core config --reset     # Reset to defaults
core config --export    # Export configuration
core config --import    # Import configuration
```

---

## Security Operations

### **Network Scanning**
```bash
core scan               # Default network scan
core scan 192.168.1.0/24    # Specific network
core scan --target localhost # Single target
core scan --ports 1-1000     # Port range
core scan --service-detection # Service detection
core scan --simulation       # Safe simulation mode
```

### **Log Analysis**
```bash
core logs               # Analyze all logs
core logs --severity high    # High severity only
core logs --time-range 24h  # Last 24 hours
core logs --query '{"type": "auth"}'  # Custom query
core logs --anomaly         # Anomaly detection
```

### **Tool Management**
```bash
core tools              # List all tools
core tools --category red    # Red team tools
core tools --category blue   # Blue team tools
core tools --category all    # All categories
core tools --available       # Available tools only
core tools --installed       # Installed tools only
```

### **Audit & Compliance**
```bash
core audit              # View audit logs
core audit --recent     # Recent entries
core audit --user <user>     # User-specific
core audit --action <action> # Action-specific
core audit --export     # Export audit logs
```

---

## Learning & Knowledge

### **Knowledge Queries**
```bash
core query "SQL injection"           # Basic query
core query "red team techniques"     # Category query
core query "network reconnaissance"  # Technique query
core query --category red-team       # Category filter
core query --difficulty advanced     # Difficulty filter
core query --source "Black Hat Python"  # Source filter
```

### **Concept Explanations**
```bash
core explain "lateral movement"      # Explain concept
core explain "zero-day exploitation" # Advanced concept
core explain --with-examples         # Include examples
core explain --with-code             # Include code
core explain --detailed              # Detailed explanation
```

### **Learning Missions**
```bash
core learn              # Start learning mode
core learn --mission recon   # Specific mission
core learn --difficulty beginner  # Difficulty level
core learn --progress        # Show progress
core learn --reset           # Reset progress
core learn --missions        # List missions
```

### **Training Mode**
```bash
core training           # Enter training mode
core training --safe    # Safe mode only
core training --simulation  # Simulation mode
core training --real    # Real mode (advanced)
```

---

## CAG Operations

### **Cache-Augmented Generation**
```bash
core cag:query "What is SQL injection?"           # Basic CAG query
core cag:query "How to detect malware?" --category blue-team  # With options
core cag:query "network reconnaissance" --difficulty intermediate
```

### **Cache Management**
```bash
core cag:stats          # Cache statistics
core cag:stats --detailed  # Detailed statistics
core cag:prewarm        # Pre-warm cache
core cag:clear          # Clear cache
core cag:clear --force  # Force clear
```

### **Cache Export/Import**
```bash
core cag:export cache.json     # Export cache
core cag:export --format json  # Specify format
core cag:import cache.json     # Import cache
core cag:import --overwrite    # Overwrite existing
```

### **Performance Testing**
```bash
core cag:benchmark queries.json    # Benchmark with file
core cag:benchmark --iterations 100  # Multiple iterations
core cag:benchmark --compare-rag   # Compare with RAG
```

---

## RAG Operations

### **Retrieval-Augmented Generation**
```bash
core query "What is the latest zero-day vulnerability?"  # RAG query
core explain "quantum cryptography attacks"              # RAG explanation
core query "Analyze this specific attack pattern..."     # Custom analysis
```

### **Knowledge Sources**
```bash
core query --source "Black Hat Python"      # Specific source
core query --source "The Hacker Playbook 3" # Another source
core query --source "RTFM"                  # RTFM manual
core query --source "Hands-On Ethical Hacking"  # Defensive source
```

---

## Tool Integration

### **Red Team Tools**
```bash
# Nmap
core scan 192.168.1.0/24 --tool nmap
core scan --nmap-args "-sS -sV -O"

# Burp Suite
core tools --tool burpsuite
core tools --tool burpsuite --target https://example.com

# Metasploit
core tools --tool metasploit
core tools --tool metasploit --module exploit/windows/smb/ms08_067_netapi

# SQLMap
core tools --tool sqlmap
core tools --tool sqlmap --target http://example.com/vuln.php?id=1
```

### **Blue Team Tools**
```bash
# Snort
core tools --tool snort
core tools --tool snort --config /etc/snort/snort.conf

# Suricata
core tools --tool suricata
core tools --tool suricata --rules /etc/suricata/rules/

# Wazuh
core tools --tool wazuh
core tools --tool wazuh --agent-status

# YARA
core tools --tool yara
core tools --tool yara --scan-file suspicious.exe

# OSQuery
core tools --tool osquery
core tools --tool osquery --query "SELECT * FROM processes"
```

---

## Log Analysis

### **Basic Log Analysis**
```bash
core logs               # Analyze all logs
core logs --recent      # Recent logs only
core logs --tail        # Follow log updates
core logs --grep "error"  # Search for errors
```

### **Advanced Log Queries**
```bash
core logs --query '{"severity": "high"}'           # High severity
core logs --query '{"type": "authentication"}'     # Auth events
core logs --query '{"source": "firewall"}'         # Firewall logs
core logs --query '{"time_range": "24h"}'          # Time range
core logs --query '{"user": "admin"}'              # User-specific
```

### **Log Export & Reporting**
```bash
core logs --export report.json    # Export to JSON
core logs --export --format csv   # Export to CSV
core logs --report                # Generate report
core logs --report --html         # HTML report
core logs --report --pdf          # PDF report
```

---

## Advanced Features

### **Memory Management**
```bash
core memory --stats     # Memory statistics
core memory --clear     # Clear memory
core memory --export    # Export memory
core memory --import    # Import memory
core memory --optimize  # Optimize memory usage
```

### **Performance Monitoring**
```bash
core performance        # Performance metrics
core performance --cpu  # CPU usage
core performance --memory  # Memory usage
core performance --network  # Network usage
core performance --disk    # Disk usage
```

### **Debugging**
```bash
core debug              # Enable debug mode
core debug --verbose    # Verbose debug
core debug --log-level debug  # Set log level
core debug --trace      # Enable tracing
```

### **API Operations**
```bash
core api --status       # API status
core api --endpoints    # List endpoints
core api --test         # Test API
core api --docs         # API documentation
```

---

## Bash Shortcuts

### **Navigation**
```bash
Ctrl + a               # Go to beginning of line
Ctrl + e               # Go to end of line
Alt + b                # Move back one word
Alt + f                # Move forward one word
Ctrl + f               # Forward one character
Ctrl + b               # Backward one character
Ctrl + xx              # Toggle between start and current position
```

### **Editing**
```bash
Ctrl + u               # Cut line before cursor
Ctrl + k               # Cut line after cursor
Ctrl + w               # Cut word before cursor
Ctrl + y               # Paste last cut
Ctrl + _               # Undo
Alt + d                # Delete word after cursor
Alt + t                # Swap current word with previous
```

### **History**
```bash
Ctrl + r               # Reverse history search
Ctrl + g               # Escape from history search
Ctrl + p               # Previous command
Ctrl + n               # Next command
Alt + .                # Recall last argument
```

### **Process Control**
```bash
Ctrl + l               # Clear screen
Ctrl + z               # Suspend process
Ctrl + c               # Interrupt process
Ctrl + d               # Exit shell
```

---

## Troubleshooting

### **Common Issues**
```bash
# Service not starting
core health --diagnose  # Run diagnostics
core health --repair    # Attempt repair

# Permission issues
sudo core              # Run with sudo
core --user <username>  # Specify user

# Connection issues
core --host localhost   # Specify host
core --port 8000       # Specify port
core --timeout 30      # Set timeout

# Memory issues
core --memory-limit 1G # Set memory limit
core --cleanup         # Clean up resources
```

### **Debug Commands**
```bash
core debug --enable     # Enable debug mode
core debug --log-file debug.log  # Log to file
core debug --trace     # Enable tracing
core debug --profile   # Enable profiling
```

### **Reset & Recovery**
```bash
core reset              # Reset to defaults
core reset --config     # Reset configuration
core reset --cache      # Reset cache
core reset --memory     # Reset memory
core reset --all        # Reset everything
```

---

## Configuration

### **Environment Variables**
```bash
export CORE_DEBUG=true          # Enable debug mode
export CORE_LOG_LEVEL=debug     # Set log level
export CORE_HOST=localhost       # Set host
export CORE_PORT=8000           # Set port
export CORE_TIMEOUT=30          # Set timeout
export CORE_MEMORY_LIMIT=1G     # Set memory limit
```

### **Configuration Files**
```bash
# .env file
CORE_DEBUG=true
CORE_LOG_LEVEL=info
CORE_HOST=localhost
CORE_PORT=8000
CORE_TIMEOUT=30
CORE_MEMORY_LIMIT=1G

# .gitsensei file (advanced mode)
ADVANCED_MODE_ENABLED=true
SENSEI_MODE_ENABLED=true
SENSEI_BYPASS_ALL_RESTRICTIONS=true
SENSEI_FULL_CONTROL=true
SENSEI_NO_SIMULATION=true
SENSEI_UNLIMITED_ACCESS=true
SENSEI_PASSWORD_REQUIRED=true
```

### **Service Configuration**
```bash
# Start services
./start-services.sh

# Stop services
./stop-services.sh

# Restart services
./restart-services.sh

# Check service status
./status-services.sh
```

---

## Quick Reference

### **Essential Commands**
```bash
core                    # Start interface
core health             # Health check
core tools              # List tools
core scan               # Network scan
core logs               # Log analysis
core query              # Knowledge query
core explain            # Explain concept
core learn              # Learning mode
core help               # Get help
```

### **CAG Commands**
```bash
core cag:query          # CAG query
core cag:stats          # Cache stats
core cag:prewarm        # Pre-warm cache
core cag:clear          # Clear cache
core cag:export         # Export cache
core cag:import         # Import cache
```

### **Advanced Commands**
```bash
core debug              # Debug mode
core performance        # Performance metrics
core memory             # Memory management
core api                # API operations
core config             # Configuration
core reset              # Reset system
```

### **Safety Commands**
```bash
core --simulation       # Simulation mode
core --safe             # Safe mode
core --read-only        # Read-only mode
core --dry-run          # Dry run mode
```

---

## Performance Tips

### **Optimization**
- Use CAG for repeated queries
- Pre-warm cache with common questions
- Use technical shortcuts for efficiency
- Enable debug mode only when needed
- Monitor memory usage regularly

### **Best Practices**
- Always use simulation mode for testing
- Check system health before operations
- Export important data regularly
- Monitor audit logs for compliance
- Use appropriate user modes

### **Security**
- Change default credentials immediately
- Use strong passwords
- Enable audit logging
- Monitor for suspicious activity
- Keep system updated

---

*This cheat sheet covers all technical shortcuts and commands for Core Agent. For detailed explanations, refer to the main documentation.*

**Last Updated**: 2024
**Version**: 1.0
