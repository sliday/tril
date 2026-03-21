#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const pkg = require('../package.json');

program
  .name('tril')
  .description('Convert code repos into natural language programs executable by LLMs')
  .version(pkg.version);

program
  .command('convert <source>')
  .description('Convert a code repository into natural language .md files')
  .option('-o, --output <dir>', 'Output directory (default: <source>-tril)')
  .option('-m, --model <model>', 'LLM model for conversion', 'sonnet')
  .action((source, opts) => {
    const { convert } = require('./convert');
    const sourceDir = path.resolve(source);
    const output = opts.output ? path.resolve(opts.output) : undefined;
    convert(sourceDir, { output, model: opts.model });
  });

program
  .command('run <dir>')
  .description('Run a natural language program via LLM')
  .option('-p, --port <port>', 'Port to serve on', '3000')
  .option('-m, --model <model>', 'LLM model for execution', 'haiku')
  .action((dir, opts) => {
    const { run } = require('./run');
    const resolvedDir = path.resolve(dir);
    run(resolvedDir, { port: parseInt(opts.port), model: opts.model });
  });

program.parse();
