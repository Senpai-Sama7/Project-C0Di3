#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');
const { GemmaAgent } = require('../gemma3n:4B-agent');
const { ToolRegistry } = require('../tools/tool-registry');
const readline = require('readline');

async function main() {
  const args = process.argv.slice(2);

  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🤖 Core Agent - Natural Language Cybersecurity Assistant

Usage: core-agent [options]

Options:
  --help, -h                Show this help message
  --mode <mode>             Set user mode (safe, simulation, pro, beginner)
  --simulation <true|false> Enable or disable simulation mode
  --learn-mode              Enter interactive learning mode
  --batch <file>            Process commands from a file

Natural Language Examples:
  "Check system health"
  "Analyze recent logs for threats"
  "Run nmap scan on 192.168.1.0/24"
  "Explain SQL injection"
  "Start a reconnaissance mission"
  "List available security tools"
  "What are the latest cybersecurity threats?"
  "How do I detect malware?"
  "Show me network monitoring techniques"

The AI will understand your intent and execute the appropriate actions.
`);
    process.exit(0);
  }

  // Initialize agent
  let agent;
  try {
    agent = new GemmaAgent();
    console.log('🤖 Core Agent initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Core Agent:', error.message);
    console.log('\n💡 To start the system:');
    console.log('1. Ensure llama.cpp server is running');
    console.log('2. Check your LLM_API_URL configuration');
    console.log('3. Run: ./start-services.sh');
    process.exit(1);
  }

  const registry = new ToolRegistry();

  // Handle user mode and simulation mode
  const modeIndex = args.indexOf('--mode');
  if (modeIndex !== -1 && args[modeIndex + 1]) {
    agent.setUserMode(args[modeIndex + 1]);
  }
  const simIndex = args.indexOf('--simulation');
  if (simIndex !== -1 && args[simIndex + 1]) {
    agent.setSimulationMode(args[simIndex + 1] === 'true');
  }

  // Check for learn mode
  if (args.includes('--learn-mode')) {
    console.log('\n🎓 Welcome to Learn Mode!');
    console.log('Interactive cybersecurity training environment');
    console.log('Type "help" for available commands or "exit" to quit');

    // Enable training mode and simulation for safety
    agent.setTrainingMode(true);
    agent.setSimulationMode(true);

    await runLearnMode(agent);
    process.exit(0);
  }

  // Check for batch processing
  const batchIndex = args.indexOf('--batch');
  if (batchIndex !== -1 && args[batchIndex + 1]) {
    const batchFile = args[batchIndex + 1];
    await processBatchFile(agent, batchFile);
    process.exit(0);
  }

  // Start natural language interface
  console.log('\n🤖 Core Agent - Natural Language Cybersecurity Assistant');
  console.log('==================================================');
  console.log('💡 Type your request in natural language. Examples:');
  console.log('   "Check system health"');
  console.log('   "Analyze logs for threats"');
  console.log('   "Run nmap scan on localhost"');
  console.log('   "Explain SQL injection"');
  console.log('   "Start learning mission"');
  console.log('   "List available tools"');
  console.log('   "exit" or "quit" to exit\n');

  await runNaturalLanguageInterface(agent);
}

async function runNaturalLanguageInterface(agent) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  let running = true;
  while (running) {
    try {
      const userInput = await question('🤖 Enter your request: ');

      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        running = false;
        break;
      }

      if (!userInput.trim()) {
        continue;
      }

      console.log('\n🔄 Processing your request...\n');

      // Process the natural language request
      const response = await processNaturalLanguageRequest(agent, userInput);

      console.log('📝 Response:');
      console.log(response.text || response);

      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log('\n🔧 Actions taken:');
        response.toolCalls.forEach(call => {
          console.log(`- ${call.tool}: ${call.result}`);
        });
      }

      console.log('\n' + '='.repeat(50) + '\n');

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 Try rephrasing your request or type "help" for examples.\n');
    }
  }

  rl.close();
  console.log('\n👋 Goodbye! Stay secure!');
}

async function processNaturalLanguageRequest(agent, userInput) {
  const input = userInput.toLowerCase();

  // Health and system requests
  if (input.includes('health') || input.includes('status') || input.includes('check system')) {
    const metrics = agent.getPerformanceMetrics();
    return {
      text: `🏥 System Health Check:\n✅ Agent: Online\n📊 Performance: ${JSON.stringify(metrics, null, 2)}`,
      toolCalls: []
    };
  }

  // Log analysis requests
  if (input.includes('analyze') && (input.includes('log') || input.includes('logs'))) {
    const analysis = await agent.analyzeAuditLogs();
    return {
      text: `🔍 Log Analysis Results:\n${JSON.stringify(analysis, null, 2)}`,
      toolCalls: []
    };
  }

  // Tool execution requests
  if (input.includes('run') || input.includes('execute') || input.includes('scan')) {
    return await handleToolExecution(agent, userInput);
  }

  // Knowledge queries
  if (input.includes('explain') || input.includes('what is') || input.includes('how to')) {
    return await handleKnowledgeQuery(agent, userInput);
  }

  // Learning requests
  if (input.includes('learn') || input.includes('mission') || input.includes('training')) {
    return await handleLearningRequest(agent, userInput);
  }

  // Tool listing
  if (input.includes('list') && (input.includes('tool') || input.includes('tools'))) {
    const tools = agent.toolRegistry?.list() || [];
    return {
      text: `🔧 Available Tools:\n${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}`,
      toolCalls: []
    };
  }

  // General AI processing
  return await agent.process(userInput, {
    strategy: 'auto',
    maxSteps: 5
  });
}

async function handleToolExecution(agent, userInput) {
  // Extract tool name and arguments from natural language
  const toolMapping = {
    'nmap': ['nmap', 'network scan', 'port scan'],
    'metasploit': ['metasploit', 'msf'],
    'burpsuite': ['burp', 'burpsuite'],
    'sqlmap': ['sqlmap', 'sql injection'],
    'snort': ['snort', 'ids'],
    'suricata': ['suricata'],
    'wazuh': ['wazuh'],
    'yara': ['yara'],
    'osquery': ['osquery']
  };

  let toolName = null;
  let target = null;

  // Find tool in input
  for (const [tool, keywords] of Object.entries(toolMapping)) {
    if (keywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
      toolName = tool;
      break;
    }
  }

  // Extract target from input
  const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
  const targetMatch = userInput.match(ipPattern);
  if (targetMatch) {
    target = targetMatch[0];
  }

  if (!toolName) {
    return {
      text: "I couldn't identify which tool you want to run. Please specify the tool name (e.g., 'run nmap scan on 192.168.1.1')",
      toolCalls: []
    };
  }

  try {
    const toolArgs = target ? { target } : {};
    const result = await agent.toolRegistry?.get(toolName)?.execute(toolArgs, {
      simulation: agent.isTrainingMode()
    });

    return {
      text: `🔧 Tool Execution: ${toolName}\n${result.summary || result}`,
      toolCalls: [{
        tool: toolName,
        result: result.summary || 'Executed successfully'
      }]
    };
  } catch (error) {
    return {
      text: `❌ Failed to execute ${toolName}: ${error.message}`,
      toolCalls: []
    };
  }
}

async function handleKnowledgeQuery(agent, userInput) {
  try {
    // Extract the concept to explain
    let concept = userInput;
    if (userInput.includes('explain')) {
      concept = userInput.replace(/explain\s+/i, '');
    } else if (userInput.includes('what is')) {
      concept = userInput.replace(/what\s+is\s+/i, '');
    } else if (userInput.includes('how to')) {
      concept = userInput.replace(/how\s+to\s+/i, '');
    }

    const result = await agent.queryCybersecurityKnowledge(concept, {
      maxResults: 3,
      includeCode: true,
      includeTechniques: true
    });

    return {
      text: `📚 Knowledge Query: "${concept}"\n\nFound ${result.concepts.length} relevant concepts:\n${result.concepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}`,
      toolCalls: []
    };
  } catch (error) {
    return {
      text: `❌ Failed to query knowledge: ${error.message}`,
      toolCalls: []
    };
  }
}

async function handleLearningRequest(agent, userInput) {
  if (userInput.includes('mission') || userInput.includes('training')) {
    const missions = agent.listTrainingMissions();
    return {
      text: `🎓 Available Training Missions:\n${missions}`,
      toolCalls: []
    };
  }

  if (userInput.includes('start') && userInput.includes('mission')) {
    // Extract mission name from input
    const missionMatch = userInput.match(/start\s+(?:mission\s+)?(\w+)/i);
    if (missionMatch) {
      const missionId = missionMatch[1];
      try {
        // Ensure we're in training mode
        agent.setTrainingMode(true);
        agent.setSimulationMode(true);

        const response = await agent.startTrainingMission('cli-user', missionId, {
          interactive: true,
          provideFeedback: true,
          enableHints: true,
          simulationMode: true, // Always use simulation in training
          difficulty: 'beginner'
        });
        return {
          text: response,
          toolCalls: []
        };
      } catch (error) {
        return {
          text: `❌ Failed to start mission: ${error.message}`,
          toolCalls: []
        };
      }
    }
  }

  return {
    text: "I can help you with learning missions. Try saying 'show available missions' or 'start reconnaissance mission'",
    toolCalls: []
  };
}

async function processBatchFile(agent, filePath) {
  const fs = require('fs');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const commands = content.split('\n').filter(line => line.trim());

    console.log(`📄 Processing ${commands.length} commands from ${filePath}\n`);

    for (const command of commands) {
      console.log(`🔄 Processing: ${command}`);
      const response = await processNaturalLanguageRequest(agent, command);
      console.log(`📝 Response: ${response.text}\n`);
    }
  } catch (error) {
    console.error('❌ Failed to process batch file:', error.message);
  }
}

async function runLearnMode(agent) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  let running = true;
  while (running) {
    const input = await question('\n🎓 Learn Mode > ');
    const command = input.trim().toLowerCase();

    try {
      if (command === 'exit' || command === 'quit') {
        running = false;
      } else if (command === 'help') {
        console.log(`
📚 Learn Mode Commands:
  help                    Show this help
  missions               List available missions
  start <mission-id>     Start a training mission
  progress               Show your learning progress
  explain <concept>      Explain a cybersecurity concept
  hint [context]         Get a hint for current mission
  complete <data>        Submit mission completion
  exit/quit              Exit learn mode
`);
      } else if (command === 'missions') {
        const missions = agent.listTrainingMissions();
        console.log(missions);
      } else if (command.startsWith('start ')) {
        const missionId = command.split(' ')[1];

        // Ensure we're in training mode
        agent.setTrainingMode(true);
        agent.setSimulationMode(true);

        const response = await agent.startTrainingMission('cli-user', missionId, {
          interactive: true,
          provideFeedback: true,
          enableHints: true,
          simulationMode: true, // Always use simulation in training
          difficulty: 'beginner'
        });
        console.log(response);
      } else if (command === 'progress') {
        const progress = agent.getLearningProgress('cli-user');
        console.log(progress);
      } else if (command.startsWith('explain ')) {
        const concept = command.substring(8);
        const explanation = await agent.explainConcept(concept);
        console.log(explanation);
      } else if (command === 'hint' || command.startsWith('hint ')) {
        const context = command.substring(5);
        const hint = await agent.provideHint('cli-user', context);
        console.log(hint);
      } else if (command.startsWith('complete ')) {
        const data = command.substring(9);
        const response = await agent.completeMission('cli-user', { submission: data });
        console.log(response);
      } else {
        console.log('❓ Unknown command. Type "help" for available commands.');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  rl.close();
  console.log('\n👋 Goodbye! Keep learning!');
}

main();
