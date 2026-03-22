#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');
const pkg = require('../package.json');

function isRemoteUrl(source) {
  return /^https?:\/\/|^git@|^github\.com\//.test(source);
}

function repoNameFromUrl(url) {
  return url.replace(/\.git$/, '').split('/').pop() || 'repo';
}

program
  .name('tril')
  .description('Convert code repos into natural language programs executable by LLMs')
  .version(pkg.version);

program
  .command('convert <source>')
  .description('Convert a local directory or GitHub URL into natural language .md files')
  .option('-o, --output <dir>', 'Output directory (default: <source>-tril)')
  .option('-m, --model <model>', 'LLM model for conversion', 'sonnet')
  .option('--keep', 'Keep cloned source (when converting a remote repo)')
  .option('-s, --single', 'Convert a single file instead of a whole repo')
  .action((source, opts) => {
    const { convert, convertSingleFile } = require('./convert');

    if (opts.single) {
      const output = opts.output ? path.resolve(opts.output) : undefined;
      convertSingleFile(source, { output });
      return;
    }

    let sourceDir;
    let tmpDir;

    if (isRemoteUrl(source)) {
      const repoName = repoNameFromUrl(source);
      tmpDir = path.join(os.tmpdir(), `tril-${repoName}-${Date.now()}`);
      const url = source.startsWith('github.com/') ? `https://${source}` : source;

      console.log(`Cloning ${url} ...\n`);
      execFileSync('git', ['clone', '--depth', '1', url, tmpDir], { stdio: 'inherit' });
      sourceDir = tmpDir;
    } else {
      sourceDir = path.resolve(source);
    }

    const output = opts.output
      ? path.resolve(opts.output)
      : (tmpDir ? path.resolve(`${repoNameFromUrl(source)}-tril`) : undefined);

    try {
      convert(sourceDir, { output, model: opts.model });
    } finally {
      if (tmpDir && !opts.keep) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        console.log(`\nCleaned up cloned source.`);
      } else if (tmpDir && opts.keep) {
        console.log(`\nKept cloned source at ${tmpDir}`);
      }
    }
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
