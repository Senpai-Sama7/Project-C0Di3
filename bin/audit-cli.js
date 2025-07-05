#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

program
  .name('audit-cli')
  .description('CLI to query and filter audit logs');

program
  .command('query')
  .description('Query the audit log file')
  .option('--log-file <file>', 'Path to the audit log file', './data/logs/audit.log')
  .option('--actor <type>', 'Filter by actor type (user, agent, system)')
  .option('--action <type>', 'Filter by action type')
  .option('--result <type>', 'Filter by result (success, failure, pending)')
  .option('--since <timestamp>', 'Show logs since a given ISO timestamp')
  .option('--limit <number>', 'Limit the number of results', '100')
  .action(async (options) => {
    const logFilePath = path.resolve(options.logFile);
    if (!fs.existsSync(logFilePath)) {
      console.error(`Log file not found: ${logFilePath}`);
      process.exit(1);
    }

    const logData = await fs.readFile(logFilePath, 'utf-8');
    const logEntries = logData.split('\n').filter(Boolean).map(line => JSON.parse(line));

    let filteredEntries = logEntries;

    if (options.actor) {
      filteredEntries = filteredEntries.filter(e => e.actor.type === options.actor);
    }
    if (options.action) {
      filteredEntries = filteredEntries.filter(e => e.action.type.startsWith(options.action));
    }
    if (options.result) {
      filteredEntries = filteredEntries.filter(e => e.result === options.result);
    }
    if (options.since) {
      filteredEntries = filteredEntries.filter(e => new Date(e.timestamp) >= new Date(options.since));
    }

    const limit = parseInt(options.limit, 10);
    const finalEntries = filteredEntries.slice(-limit);

    console.log(JSON.stringify(finalEntries, null, 2));
  });

program.parse(process.argv);
