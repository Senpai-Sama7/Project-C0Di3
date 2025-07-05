# How to Use Core Agent (Non-Technical Guide)

Welcome! This guide will help you use the Core Agent system, even if you have no technical background. Follow these simple steps to get started, use the main features, and get help if you need it.

---

## 1. What is Core Agent?

Core Agent is a smart assistant for cybersecurity and learning. It can:

- Answer questions and explain security concepts
- Run security tools (red/blue team)
- Analyze logs for threats
- Teach you with interactive missions (Learn Mode)
- Monitor its own health and fix problems automatically

---

## 2. Starting the Agent

**If your system is already set up:**

- Double-click or run the `start-services.sh` script (if available)
- Or, open a terminal and type:

  ```bash
  node bin/cli.js
  ```

**If you see errors, ask your IT admin to run the setup script:**

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

---

## 4. Main Features (No Coding Needed)

- **Ask Questions:**
  - Just type your question and press Enter.

- **Run Security Tools:**
  - Type: `--list-tools` to see available tools
  - Type: `--tool nmap --args '{"target": "127.0.0.1"}'` to run a tool (replace with your info)

- **Analyze Logs:**
  - Type: `--analyze-logs` to check for threats
  - Type: `--audit-log` to see recent activity

- **Learn Mode (Training):**
  - Type: `--learn-mode` to enter interactive training
  - Follow the on-screen instructions

- **Health Check:**
  - Type: `--health-check` to check if everything is working

---

## 5. Getting Help

- Type `--help` at any time for a list of commands
- If you get stuck, ask your IT admin or support team

---

## 6. Stopping the Agent

- To stop, close the terminal window or type `exit`
- To stop all services, run:

  ```bash
  ./stop-services.sh
  ```

---

## 7. Safety

- The agent will not make real changes unless you ask for it
- "Simulation mode" is on by default for safety
- All actions are logged for your protection

---

Enjoy using Core Agent! If you have questions, just ask the agent or your support team.
