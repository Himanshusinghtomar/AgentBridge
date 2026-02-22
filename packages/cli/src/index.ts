#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import AgentBridge from '@agentbridge/sdk';

const program = new Command();
program.name('agentbridge').description('CLI for AgentBridge runtime');

program.option('-e, --endpoint <url>', 'AgentBridge endpoint', process.env.AGENTBRIDGE_ENDPOINT || 'http://localhost:3030');
program.option('--api-key <key>', 'API key');
program.option('--jwt <token>', 'JWT token');

program
  .command('create-session')
  .option('--headless', 'Headless mode', true)
  .action(async (opts, cmd) => {
    const parent = cmd.parent!;
    const client = new AgentBridge({ endpoint: parent.getOptionValue('endpoint'), apiKey: parent.getOptionValue('apiKey'), jwt: parent.getOptionValue('jwt') });
    const res = await client.createSession({ headless: opts.headless !== false });
    console.log(chalk.green('session created'), res.sessionId);
  });

program
  .command('navigate <sessionId> <url>')
  .action(async (sessionId, url, cmd) => {
    const parent = cmd.parent!;
    const client = new AgentBridge({ endpoint: parent.getOptionValue('endpoint'), apiKey: parent.getOptionValue('apiKey'), jwt: parent.getOptionValue('jwt') });
    const res = await client.navigate(sessionId, url);
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('snapshot <sessionId>')
  .action(async (sessionId, cmd) => {
    const parent = cmd.parent!;
    const client = new AgentBridge({ endpoint: parent.getOptionValue('endpoint'), apiKey: parent.getOptionValue('apiKey'), jwt: parent.getOptionValue('jwt') });
    const res = await client.snapshot(sessionId);
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('click <sessionId> <elementId>')
  .action(async (sessionId, elementId, cmd) => {
    const parent = cmd.parent!;
    const client = new AgentBridge({ endpoint: parent.getOptionValue('endpoint'), apiKey: parent.getOptionValue('apiKey'), jwt: parent.getOptionValue('jwt') });
    const res = await client.click(sessionId, elementId);
    console.log(JSON.stringify(res, null, 2));
  });

program
  .command('type <sessionId> <elementId> <value>')
  .action(async (sessionId, elementId, value, cmd) => {
    const parent = cmd.parent!;
    const client = new AgentBridge({ endpoint: parent.getOptionValue('endpoint'), apiKey: parent.getOptionValue('apiKey'), jwt: parent.getOptionValue('jwt') });
    const res = await client.type(sessionId, elementId, value);
    console.log(JSON.stringify(res, null, 2));
  });

program.parseAsync().catch(err => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
