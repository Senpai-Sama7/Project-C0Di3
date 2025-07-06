#!/usr/bin/env node
require('dotenv/config');
require('ts-node/register');
const { GemmaAgent } = require('../gemma3n:4B-agent');
const { ToolRegistry } = require('../tools/tool-registry');
const program = require('commander');

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

Cybersecurity Knowledge:
  --cyber-query <query>     Query cybersecurity knowledge from books
  --cyber-stats             Show cybersecurity knowledge statistics
  --cyber-concepts          List all cybersecurity concepts
  --cyber-category <cat>    List concepts by category (red-team, blue-team, etc.)

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

  // Cybersecurity Knowledge Commands
  const cyberQueryIndex = args.indexOf('--cyber-query');
  if (cyberQueryIndex !== -1 && args[cyberQueryIndex + 1]) {
    const query = args[cyberQueryIndex + 1];
    console.log(`\n🔍 Querying cybersecurity knowledge: "${query}"`);
    try {
      const result = await agent.queryCybersecurityKnowledge(query, {
        maxResults: 5,
        includeCode: true,
        includeTechniques: true
      });

      console.log('\n📊 Cybersecurity Knowledge Results:');
      console.log(`Found ${result.concepts.length} relevant concepts`);
      console.log(`Techniques: ${result.techniques.join(', ')}`);
      console.log(`Tools: ${result.tools.join(', ')}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Sources: ${result.sources.join(', ')}`);

      if (result.concepts.length > 0) {
        console.log('\n📖 Top Concepts:');
        result.concepts.slice(0, 3).forEach((concept, index) => {
          console.log(`${index + 1}. ${concept.name} (${concept.category})`);
          console.log(`   ${concept.description}`);
          console.log(`   Source: ${concept.source}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to query cybersecurity knowledge:', error.message);
    }
    process.exit(0);
  }

  if (args.includes('--cyber-stats')) {
    console.log('\n📊 Cybersecurity Knowledge Statistics:');
    try {
      const stats = agent.getCybersecurityKnowledgeStatistics();
      console.log(`Total Concepts: ${stats.totalConcepts}`);
      console.log('Concepts by Category:');
      Object.entries(stats.conceptsByCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
      console.log('Concepts by Difficulty:');
      Object.entries(stats.conceptsByDifficulty).forEach(([difficulty, count]) => {
        console.log(`  ${difficulty}: ${count}`);
      });
      console.log(`Total Techniques: ${stats.totalTechniques}`);
      console.log(`Total Tools: ${stats.totalTools}`);
    } catch (error) {
      console.error('❌ Failed to get cybersecurity statistics:', error.message);
    }
    process.exit(0);
  }

  if (args.includes('--cyber-concepts')) {
    console.log('\n📚 All Cybersecurity Concepts:');
    try {
      const concepts = agent.getAllCybersecurityConcepts();
      concepts.slice(0, 10).forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.name} (${concept.category})`);
        console.log(`   ${concept.description}`);
        console.log(`   Source: ${concept.source}`);
        console.log('');
      });
      if (concepts.length > 10) {
        console.log(`... and ${concepts.length - 10} more concepts`);
      }
    } catch (error) {
      console.error('❌ Failed to get cybersecurity concepts:', error.message);
    }
    process.exit(0);
  }

  const cyberCategoryIndex = args.indexOf('--cyber-category');
  if (cyberCategoryIndex !== -1 && args[cyberCategoryIndex + 1]) {
    const category = args[cyberCategoryIndex + 1];
    console.log(`\n📚 Cybersecurity Concepts for category: ${category}`);
    try {
      const concepts = agent.getCybersecurityConceptsByCategory(category);
      concepts.slice(0, 10).forEach((concept, index) => {
        console.log(`${index + 1}. ${concept.name}`);
        console.log(`   ${concept.description}`);
        console.log(`   Source: ${concept.source}`);
        console.log('');
      });
      if (concepts.length > 10) {
        console.log(`... and ${concepts.length - 10} more concepts`);
      }
    } catch (error) {
      console.error('❌ Failed to get cybersecurity concepts by category:', error.message);
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

  // Add CAG commands
  program
    .command('cag:query <query>')
    .description('Query cybersecurity knowledge using CAG (Cache-Augmented Generation)')
    .option('-c, --category <category>', 'Filter by category (red-team, blue-team, tools, techniques, defense)')
    .option('-d, --difficulty <difficulty>', 'Filter by difficulty (beginner, intermediate, advanced)')
    .option('-m, --max-results <number>', 'Maximum number of results', '10')
    .option('--no-code', 'Exclude code examples')
    .option('--no-techniques', 'Exclude techniques')
    .option('--no-cache', 'Disable caching for this query')
    .action(async (query, options) => {
      try {
        const agent = await createAgent();
        const result = await agent.queryCybersecurityKnowledgeCAG(query, {
          category: options.category,
          difficulty: options.difficulty,
          maxResults: parseInt(options.maxResults),
          includeCode: options.code !== false,
          includeTechniques: options.techniques !== false,
          useCache: options.cache !== false
        });

        console.log('\n🔍 CAG Query Results:');
        console.log('='.repeat(50));
        console.log(`Query: ${query}`);
        console.log(`Cached: ${result.cached ? '✅ Yes' : '❌ No'}`);
        console.log(`Cache Hit Type: ${result.cacheHitType}`);
        console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`Processing Time: ${result.processingTime}ms`);

        if (result.similarityScore) {
          console.log(`Similarity Score: ${(result.similarityScore * 100).toFixed(1)}%`);
        }

        console.log('\n📝 Response:');
        console.log(result.response);

        if (result.techniques && result.techniques.length > 0) {
          console.log('\n🔧 Related Techniques:');
          result.techniques.forEach(technique => console.log(`  • ${technique}`));
        }

        if (result.tools && result.tools.length > 0) {
          console.log('\n🛠️  Related Tools:');
          result.tools.forEach(tool => console.log(`  • ${tool}`));
        }

        if (result.codeExamples && result.codeExamples.length > 0) {
          console.log('\n�� Code Examples:');
          result.codeExamples.forEach((code, index) => {
            console.log(`\n  Example ${index + 1}:`);
            console.log(`  ${code}`);
          });
        }

        if (result.sources && result.sources.length > 0) {
          console.log('\n📚 Sources:');
          result.sources.forEach(source => console.log(`  • ${source}`));
        }

      } catch (error) {
        console.error('❌ CAG query failed:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:stats')
    .description('Show CAG cache statistics')
    .action(async () => {
      try {
        const agent = await createAgent();
        const stats = agent.getCAGCacheStats();

        console.log('\n📊 CAG Cache Statistics:');
        console.log('='.repeat(50));
        console.log(`Total Queries: ${stats.totalQueries}`);
        console.log(`Cache Hits: ${stats.hits}`);
        console.log(`Cache Misses: ${stats.misses}`);
        console.log(`Hit Rate: ${stats.hitRate}`);
        console.log(`Cache Size: ${stats.cacheSize} entries`);
        console.log(`Embedding Cache Size: ${stats.embeddingCacheSize} entries`);
        console.log(`Evictions: ${stats.evictions}`);

        if (stats.totalQueries > 0) {
          const avgResponseTime = stats.avgResponseTime || 0;
          console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
        }

      } catch (error) {
        console.error('❌ Failed to get CAG stats:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:clear')
    .description('Clear CAG cache')
    .action(async () => {
      try {
        const agent = await createAgent();
        agent.clearCAGCache();
        console.log('✅ CAG cache cleared successfully');
      } catch (error) {
        console.error('❌ Failed to clear CAG cache:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:prewarm')
    .description('Pre-warm CAG cache with common cybersecurity queries')
    .action(async () => {
      try {
        const agent = await createAgent();
        console.log('🔥 Pre-warming CAG cache with common cybersecurity queries...');
        await agent.preWarmCAGCache();
        console.log('✅ CAG cache pre-warmed successfully');
      } catch (error) {
        console.error('❌ Failed to pre-warm CAG cache:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:export <file>')
    .description('Export CAG cache to file')
    .action(async (file) => {
      try {
        const agent = await createAgent();
        const cacheData = agent.exportCAGCache();

        const fs = require('fs');
        fs.writeFileSync(file, JSON.stringify(cacheData, null, 2));
        console.log(`✅ CAG cache exported to ${file}`);
        console.log(`📊 Exported ${Object.keys(cacheData.cache).length} cache entries`);
      } catch (error) {
        console.error('❌ Failed to export CAG cache:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:import <file>')
    .description('Import CAG cache from file')
    .action(async (file) => {
      try {
        const agent = await createAgent();
        const fs = require('fs');

        if (!fs.existsSync(file)) {
          console.error(`❌ File not found: ${file}`);
          process.exit(1);
        }

        const cacheData = JSON.parse(fs.readFileSync(file, 'utf8'));
        agent.importCAGCache(cacheData);
        console.log(`✅ CAG cache imported from ${file}`);
        console.log(`📊 Imported ${Object.keys(cacheData.cache).length} cache entries`);
      } catch (error) {
        console.error('❌ Failed to import CAG cache:', error.message);
        process.exit(1);
      }
    });

  program
    .command('cag:benchmark <queries-file>')
    .description('Benchmark CAG performance with queries from file')
    .option('-r, --runs <number>', 'Number of benchmark runs', '3')
    .action(async (queriesFile, options) => {
      try {
        const agent = await createAgent();
        const fs = require('fs');

        if (!fs.existsSync(queriesFile)) {
          console.error(`❌ File not found: ${queriesFile}`);
          process.exit(1);
        }

        const queries = JSON.parse(fs.readFileSync(queriesFile, 'utf8'));
        const runs = parseInt(options.runs);

        console.log(`🚀 Running CAG benchmark with ${queries.length} queries, ${runs} runs each...`);

        const results = {
          totalQueries: queries.length * runs,
          cacheHits: 0,
          cacheMisses: 0,
          totalTime: 0,
          avgResponseTime: 0,
          queries: []
        };

        for (let run = 1; run <= runs; run++) {
          console.log(`\n📊 Run ${run}/${runs}:`);

          for (const query of queries) {
            const startTime = Date.now();
            const result = await agent.queryCybersecurityKnowledgeCAG(query);
            const endTime = Date.now();

            const responseTime = endTime - startTime;
            results.totalTime += responseTime;

            if (result.cached) {
              results.cacheHits++;
            } else {
              results.cacheMisses++;
            }

            results.queries.push({
              query,
              cached: result.cached,
              responseTime,
              cacheHitType: result.cacheHitType
            });

            console.log(`  ${result.cached ? '✅' : '❌'} ${query.substring(0, 50)}... (${responseTime}ms)`);
          }
        }

        results.avgResponseTime = results.totalTime / results.totalQueries;
        const hitRate = (results.cacheHits / results.totalQueries) * 100;

        console.log('\n📊 Benchmark Results:');
        console.log('='.repeat(50));
        console.log(`Total Queries: ${results.totalQueries}`);
        console.log(`Cache Hits: ${results.cacheHits}`);
        console.log(`Cache Misses: ${results.cacheMisses}`);
        console.log(`Hit Rate: ${hitRate.toFixed(2)}%`);
        console.log(`Average Response Time: ${results.avgResponseTime.toFixed(2)}ms`);
        console.log(`Total Time: ${(results.totalTime / 1000).toFixed(2)}s`);

      } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
        process.exit(1);
      }
    });

  program.parse(process.argv);
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
