#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');
const { GemmaAgent } = require('../gemma3n:4B-agent');
const { ToolRegistry } = require('../tools/tool-registry');

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: core-agent [options]

Core Options:
  --prompt <text>           Provide a prompt to the agent
  --mode <mode>             Set user mode (safe, simulation, pro, beginner)
  --simulation <true|false> Enable or disable simulation mode
  --list-tools              List all available tools
  --tool <tool>             Run a specific tool by name
  --args <json>             Arguments for the tool as JSON

Log Analysis:
  --audit-log               Show recent audit log entries
  --analyze-logs            Analyze audit logs for anomalies
  --query-logs <filter>     Query audit logs with filter (JSON)

Learn Mode:
  --learn-mode              Enter interactive learning mode
  --list-missions           List available training missions
  --start-mission <id>      Start a training mission
  --mission-progress        Show learning progress
  --explain <concept>       Explain a cybersecurity concept
  --hint [context]          Get a hint for current mission

Health & Monitoring:
  --health-check            Check system health
  --performance-report      Generate performance report
  --self-heal               Run self-healing diagnostics

Knowledge & Memory:
  --ingest-book <path>      Ingest a book into the agent's knowledge base

Help:
  --help, -h                Show this help message
`);
    process.exit(0);
  }

  const agent = new GemmaAgent();
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

  // Health check
  if (args.includes('--health-check')) {
    console.log('\n🏥 System Health Check:');
    try {
      const metrics = agent.getPerformanceMetrics();
      console.log('✅ Agent: Online');
      console.log('📊 Performance Metrics:', JSON.stringify(metrics, null, 2));
      console.log('🔄 Memory Status:', await agent.getMemoryState('health-check'));
      console.log('✅ All systems operational');
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
    }
    process.exit(0);
  }

  // Performance report
  if (args.includes('--performance-report')) {
    console.log('\n📊 Performance Report:');
    try {
      const metrics = agent.getPerformanceMetrics();
      console.log(JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.error('❌ Failed to generate performance report:', error.message);
    }
    process.exit(0);
  }

  // List tools
  if (args.includes('--list-tools')) {
    console.log('\n🔧 Available Tools:');
    registry.list().forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
    process.exit(0);
  }

  // Analyze logs
  if (args.includes('--analyze-logs')) {
    console.log('\n🔍 Analyzing audit logs for anomalies...');
    try {
      const analysis = await agent.analyzeAuditLogs();
      console.log('📊 Analysis Results:', JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error('❌ Log analysis failed:', error.message);
    }
    process.exit(0);
  }

  // Query logs
  const queryIndex = args.indexOf('--query-logs');
  if (queryIndex !== -1 && args[queryIndex + 1]) {
    console.log('\n📋 Querying audit logs...');
    try {
      const filter = JSON.parse(args[queryIndex + 1]);
      const logs = await agent.auditService.queryLogs(filter);
      console.log(`Found ${logs.length} matching entries:`);
      logs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.level} - ${log.action.type}`);
        if (log.errorMessage) {
          console.log(`   Error: ${log.errorMessage}`);
        }
      });
    } catch (error) {
      console.error('❌ Query failed:', error.message);
    }
    process.exit(0);
  }

  // Show audit log
  if (args.includes('--audit-log')) {
    console.log('\n📋 Recent Audit Log Entries:');
    try {
      const logs = await agent.auditService.queryLogs({});
      const recent = logs.slice(-10);
      recent.forEach((log, index) => {
        console.log(`${index + 1}. [${log.timestamp}] ${log.level} - ${log.action.type}`);
        if (log.errorMessage) {
          console.log(`   Error: ${log.errorMessage}`);
        }
      });
    } catch (error) {
      console.error('❌ Failed to fetch audit log:', error.message);
    }
    process.exit(0);
  }

  // Ingest a book
  const ingestIndex = args.indexOf('--ingest-book');
  if (ingestIndex !== -1 && args[ingestIndex + 1]) {
    const bookPath = args[ingestIndex + 1];
    console.log(`\n📚 Ingesting book from: ${bookPath}`);
    try {
      await agent.ingestBook(bookPath);
      console.log('✅ Book ingested successfully.');
    } catch (error) {
      console.error('❌ Failed to ingest book:', error.message);
    }
    process.exit(0);
  }

  // Learn Mode Features
  if (args.includes('--learn-mode')) {
    console.log('\n🎓 Welcome to Learn Mode!');
    console.log('Interactive cybersecurity training environment');
    console.log('Type "help" for available commands or "exit" to quit');

    await runLearnMode(agent);
    process.exit(0);
  }

  if (args.includes('--list-missions')) {
    console.log('\n📚 Available Training Missions:');
    const missions = agent.listTrainingMissions();
    console.log(missions);
    process.exit(0);
  }

  const missionIndex = args.indexOf('--start-mission');
  if (missionIndex !== -1 && args[missionIndex + 1]) {
    const missionId = args[missionIndex + 1];
    console.log(`\n🎯 Starting mission: ${missionId}`);
    try {
      const response = await agent.startTrainingMission('cli-user', missionId, {
        interactive: true,
        provideFeedback: true,
        enableHints: true,
        simulationMode: agent.getSimulationMode(),
        difficulty: agent.getUserMode() === 'beginner' ? 'beginner' : 'intermediate'
      });
      console.log(response);
    } catch (error) {
      console.error('❌ Failed to start mission:', error.message);
    }
    process.exit(0);
  }

  if (args.includes('--mission-progress')) {
    console.log('\n📊 Learning Progress:');
    const progress = agent.getLearningProgress('cli-user');
    console.log(progress);
    process.exit(0);
  }

  const explainIndex = args.indexOf('--explain');
  if (explainIndex !== -1 && args[explainIndex + 1]) {
    const concept = args[explainIndex + 1];
    console.log(`\n💡 Explaining: ${concept}`);
    try {
      const explanation = await agent.explainConcept(concept);
      console.log(explanation);
    } catch (error) {
      console.error('❌ Failed to explain concept:', error.message);
    }
    process.exit(0);
  }

  const hintIndex = args.indexOf('--hint');
  if (hintIndex !== -1) {
    const context = args[hintIndex + 1] || '';
    console.log('\n💡 Getting hint...');
    try {
      const hint = await agent.provideHint('cli-user', context);
      console.log(hint);
    } catch (error) {
      console.error('❌ Failed to provide hint:', error.message);
    }
    process.exit(0);
  }

  // Run specific tool
  const toolIndex = args.indexOf('--tool');
  if (toolIndex !== -1 && args[toolIndex + 1]) {
    const toolName = args[toolIndex + 1];
    const tool = registry.get(toolName);
    if (!tool) {
      console.error(`Tool not found: ${toolName}`);
      process.exit(1);
    }
    let toolArgs = {};
    const argsIndex = args.indexOf('--args');
    if (argsIndex !== -1 && args[argsIndex + 1]) {
      try {
        toolArgs = JSON.parse(args[argsIndex + 1]);
      } catch (e) {
        console.error('Invalid JSON for --args');
        process.exit(1);
      }
    }
    try {
      const result = await tool.execute(toolArgs, { simulation: agent.getSimulationMode() });
      console.log('\n🔧 Tool Output:', result.summary || result);
      if (result.full) {
        console.log('\n📄 Full Output:', result.full);
      }
    } catch (err) {
      console.error('\n❌ Error:', err.message || err);
    }
    process.exit(0);
  }

  // Handle prompt processing
  let prompt = '';
  const promptIndex = args.indexOf('--prompt');
  if (promptIndex !== -1 && args[promptIndex + 1]) {
    prompt = args[promptIndex + 1];
  } else {
    // Read from stdin if no prompt argument
    process.stdout.write('🤖 Enter your prompt: ');
    prompt = await new Promise(resolve => {
      process.stdin.once('data', data => resolve(data.toString().trim()));
    });
  }

  try {
    console.log('\n🤖 Processing...');
    const response = await agent.process(prompt);
    console.log('\n💬 Agent Response:');
    console.log(response.text || response);

    if (response.reasoning && response.reasoning.length > 0) {
      console.log('\n🧠 Reasoning Trace:');
      response.reasoning.forEach((step, index) => {
        console.log(`${index + 1}. ${step.step}: ${step.output}`);
      });
    }

    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log('\n🔧 Tool Calls:');
      response.toolCalls.forEach((call, index) => {
        console.log(`${index + 1}. ${call.toolName}: ${call.success ? '✅' : '❌'}`);
      });
    }

    if (response.performance) {
      console.log('\n📊 Performance:', JSON.stringify(response.performance, null, 2));
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message || err);
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
        const response = await agent.startTrainingMission('cli-user', missionId, {
          interactive: true,
          provideFeedback: true,
          enableHints: true,
          simulationMode: agent.getSimulationMode(),
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
