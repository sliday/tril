const fs = require('fs');
const path = require('path');
const { t, tAsync } = require('./t');

function extractFunctions(source, filePath) {
  const ext = path.extname(filePath);
  if (ext === '.py') return extractPythonFunctions(source);
  return extractJsFunctions(source);
}

function extractJsFunctions(source) {
  const functions = [];
  const patterns = [
    /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:function\s*)?\(([^)]*)\)\s*(?:=>)?\s*\{?/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const name = match[1];
      const params = match[2].trim();
      const startIdx = match.index;
      const body = extractFunctionBody(source, startIdx);
      functions.push({ name, params, body, startIdx });
    }
  }

  const seen = new Set();
  return functions.filter(f => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });
}

function extractPythonFunctions(source) {
  const functions = [];
  const lines = source.split('\n');
  // Match def name( and async def name(, also class Name(
  const defPattern = /^(\s*)((?:async\s+)?def|class)\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(defPattern);
    if (!match) continue;

    const indent = match[1].length;
    const kind = match[2];
    const name = match[3];

    // Collect the body: all subsequent lines with greater indentation (or blank)
    let bodyLines = [lines[i]];
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.trim() === '') { bodyLines.push(line); continue; }
      const lineIndent = line.match(/^\s*/)[0].length;
      if (lineIndent > indent) {
        bodyLines.push(line);
      } else {
        break;
      }
    }

    functions.push({
      name,
      params: '',
      body: bodyLines.join('\n'),
      startIdx: 0,
    });
  }

  return functions;
}

function extractFunctionBody(source, startIdx) {
  const braceStart = source.indexOf('{', startIdx);
  if (braceStart === -1) {
    const arrowIdx = source.indexOf('=>', startIdx);
    if (arrowIdx === -1) return source.slice(startIdx, startIdx + 200);
    const end = source.indexOf(';', arrowIdx);
    return source.slice(startIdx, end === -1 ? startIdx + 200 : end + 1);
  }

  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
    if (depth === 0) return source.slice(startIdx, i + 1);
  }
  return source.slice(startIdx, Math.min(startIdx + 500, source.length));
}

function detectDependencies(source, filePath) {
  const ext = path.extname(filePath || '');
  const deps = new Set();

  if (ext === '.py') {
    // Python: import X, from X import Y
    const importPattern = /^(?:from\s+(\w+)|import\s+(\w+))/gm;
    let match;
    while ((match = importPattern.exec(source)) !== null) {
      const dep = match[1] || match[2];
      deps.add(dep);
    }
  } else {
    // JS: require('x'), from 'x'
    const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
    const importPattern = /from\s+['"]([^'"]+)['"]/g;
    for (const pattern of [requirePattern, importPattern]) {
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          deps.add(dep.replace(/\/.*$/, ''));
        }
      }
    }
  }
  return [...deps];
}

function detectRoutes(source) {
  const routes = [];
  const routePattern = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = routePattern.exec(source)) !== null) {
    routes.push({ method: match[1].toLowerCase(), path: match[2] });
  }
  return routes;
}

async function parallelMap(items, fn, concurrency = 3) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

function convertFunction(fnObj, sourceContext) {
  const prompt = `Convert this function to a natural language description.

Use this EXACT format:

## ${fnObj.name}

**Contract:**
- input: [param_name] ([type])
- input: [param_name] ([type])
- output: [type]

**Purpose:** [one line description]

**Inputs:**
- [param] ([type]): [description]

**Behaviour:**
1. [step 1]
2. [step 2]
...

**Output:** [type] — [description]

**Edge cases:**
- [case 1]
- [case 2]

**Examples:**
- [input] → [output]
- [input] → [output]
- [input] → [output]

Here is the function source code:

\`\`\`
${fnObj.body}
\`\`\`

${sourceContext ? `Context from the file:\n${sourceContext}` : ''}

Return ONLY the markdown description. No code fences around the whole response.`;

  return tAsync(prompt, { model: 'sonnet' });
}

function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

async function convertFile(filePath, outputDir, counters, concurrency = 3) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const basename = path.basename(filePath, path.extname(filePath));
  const functions = extractFunctions(source, filePath);
  const deps = detectDependencies(source, filePath);

  console.log(`  Converting ${path.basename(filePath)}: ${functions.length} functions found`);

  const sourceContext = source.slice(0, 500);
  const sections = await parallelMap(functions, async (fn) => {
    if (counters) counters.done++;
    const elapsed = counters ? formatElapsed(Date.now() - counters.start) : '';
    const progress = counters ? `[${counters.done}/${counters.total}]` : '';
    console.log(`    ${progress} Converting ${fn.name}... (${elapsed})`);
    return convertFunction(fn, sourceContext);
  }, concurrency);

  const meta = [
    '---',
    `source: ${path.basename(filePath)}`,
    `functions: [${functions.map(f => f.name).join(', ')}]`,
    `dependencies: [${deps.join(', ')}]`,
    '---',
  ].join('\n');

  const body = `\n# ${basename}\n\n${sections.join('\n\n')}`;
  const content = meta + body;

  const outputPath = path.join(outputDir, `${basename}.md`);
  fs.writeFileSync(outputPath, content);
  console.log(`    -> ${outputPath}`);

  return { basename, functions: functions.map(f => f.name), deps };
}

async function convertServerFile(filePath, outputDir, allFunctions, concurrency = 3) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const routes = detectRoutes(source);
  const deps = detectDependencies(source, filePath);

  console.log(`  Converting server ${path.basename(filePath)}: ${routes.length} routes found`);

  const routeSections = await parallelMap(routes, async (route) => {
    console.log(`    Describing route ${route.method.toUpperCase()} ${route.path}...`);

    const prompt = `Describe this Express.js route handler in natural language.

Route: ${route.method.toUpperCase()} ${route.path}

Full server source:
\`\`\`javascript
${source}
\`\`\`

Available functions from other modules: ${allFunctions.join(', ')}

Use this format:

### ${route.method.toUpperCase()} ${route.path}

**Purpose:** [description]
**Request:** [what the handler expects]
**Process:** [step by step what it does, referencing function names]
**Response:** [what it returns]

Return ONLY the markdown. No code fences around the whole thing.`;

    return tAsync(prompt, { model: 'sonnet' });
  }, concurrency);

  const meta = [
    '---',
    `source: ${path.basename(filePath)}`,
    `type: server`,
    `routes: [${routes.map(r => `${r.method.toUpperCase()} ${r.path}`).join(', ')}]`,
    `dependencies: [${deps.join(', ')}]`,
    '---',
  ].join('\n');

  const body = `\n# server\n\nHTTP server for the application.\n\n${routeSections.join('\n\n')}`;
  const content = meta + body;

  const outputPath = path.join(outputDir, 'server.md');
  fs.writeFileSync(outputPath, content);
  console.log(`    -> ${outputPath}`);

  return routes;
}

async function convertSingleFile(filePath, options = {}) {
  const { output } = options;
  const resolved = path.resolve(filePath);
  const basename = path.basename(resolved, path.extname(resolved));
  const outputDir = output || path.dirname(resolved);
  const outputPath = path.join(outputDir, `${basename}.md`);

  fs.mkdirSync(outputDir, { recursive: true });

  const source = fs.readFileSync(resolved, 'utf-8');
  const functions = extractFunctions(source, resolved);

  console.log(`Converting ${path.basename(resolved)}: ${functions.length} functions\n`);

  const concurrency = options.concurrency || 3;
  const counters = { done: 0, total: functions.length, start: Date.now() };
  const sourceContext = source.slice(0, 500);
  const sections = await parallelMap(functions, async (fn) => {
    counters.done++;
    const elapsed = formatElapsed(Date.now() - counters.start);
    console.log(`  [${counters.done}/${counters.total}] ${fn.name} (${elapsed})`);
    return convertFunction(fn, sourceContext);
  }, concurrency);

  const deps = detectDependencies(source, resolved);
  const meta = [
    '---',
    `source: ${path.basename(resolved)}`,
    `functions: [${functions.map(f => f.name).join(', ')}]`,
    `dependencies: [${deps.join(', ')}]`,
    '---',
  ].join('\n');

  const content = meta + `\n# ${basename}\n\n${sections.join('\n\n')}`;
  fs.writeFileSync(outputPath, content);

  const elapsed = formatElapsed(Date.now() - counters.start);
  console.log(`\nDone in ${elapsed}. Output: ${outputPath}`);
  return outputPath;
}

async function convert(sourceDir, options = {}) {
  const { output } = options;
  const outputDir = output || `${sourceDir}-tril`;

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Converting ${sourceDir} -> ${outputDir}\n`);

  const pkgPath = path.join(sourceDir, 'package.json');
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  }

  const jsFiles = findSourceFiles(sourceDir);
  console.log(`Found ${jsFiles.length} source files: ${jsFiles.map(f => path.basename(f)).join(', ')}\n`);

  // Count total functions across all files for progress
  let totalFunctions = 0;
  const fileFunctions = {};
  for (const file of jsFiles) {
    const source = fs.readFileSync(file, 'utf-8');
    const fns = extractFunctions(source, file);
    fileFunctions[file] = fns;
    totalFunctions += fns.length;
  }
  console.log(`Total: ${totalFunctions} functions to convert\n`);

  const counters = { done: 0, total: totalFunctions, start: Date.now() };

  // Detect server files (Express, Flask, FastAPI)
  const serverFile = jsFiles.find(f => {
    const name = path.basename(f);
    if (['server.js', 'app.js'].includes(name)) return true;
    const content = fs.readFileSync(f, 'utf-8').slice(0, 2000);
    if (/app\.(get|post|put|delete|route)\s*\(/.test(content)) return true;
    if (/Flask\(|FastAPI\(|@app\.route/.test(content)) return true;
    return false;
  });
  const logicFiles = jsFiles.filter(f => f !== serverFile);

  const concurrency = options.concurrency || 3;
  const allFunctions = [];
  const moduleFiles = [];
  for (const file of logicFiles) {
    const result = await convertFile(file, outputDir, counters, concurrency);
    allFunctions.push(...result.functions);
    moduleFiles.push(`${result.basename}.md`);
  }

  let routes = [];
  if (serverFile) {
    routes = await convertServerFile(serverFile, outputDir, allFunctions, concurrency);
    moduleFiles.push('server.md');
  }

  // Copy static files
  const publicDir = path.join(sourceDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, path.join(outputDir, 'public'));
    console.log(`\n  Copied public/ directory`);
  }

  // Generate tril.config.json
  const config = {
    name: pkg.name || path.basename(sourceDir),
    entry: serverFile ? 'server.md' : moduleFiles[0],
    static: fs.existsSync(publicDir) ? ['public/'] : [],
    modules: moduleFiles,
    port: 3000,
  };

  fs.writeFileSync(
    path.join(outputDir, 'tril.config.json'),
    JSON.stringify(config, null, 2)
  );
  console.log(`  Generated tril.config.json`);

  const elapsed = formatElapsed(Date.now() - counters.start);
  console.log(`\nConversion complete in ${elapsed}. Run with: tril run ${outputDir}`);
  return outputDir;
}

function findSourceFiles(dir) {
  const files = [];
  const skipDirs = ['node_modules', 'test', 'tests', 'public', '.git', '__pycache__', 'venv', '.venv', 'logdir', 'versions'];
  for (const entry of fs.readdirSync(dir)) {
    if (skipDirs.includes(entry)) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...findSourceFiles(full));
    } else if (entry.endsWith('.js') || entry.endsWith('.py')) {
      files.push(full);
    }
  }
  return files;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { convert, convertSingleFile, extractFunctions, detectRoutes, detectDependencies };
