const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const rawMeta = match[1];
  const body = match[2];
  const meta = {};

  for (const line of rawMeta.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    // Parse simple YAML arrays: [a, b, c]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    }
    meta[key] = val;
  }

  return { meta, body };
}

function parseContract(text) {
  const contract = { inputs: [], output: null };
  const contractMatch = text.match(/\*\*Contract:\*\*\n([\s\S]*?)(?=\n\*\*|$)/);
  if (!contractMatch) return null;

  for (const line of contractMatch[1].split('\n')) {
    const inputMatch = line.match(/^-\s*input:\s*(\w+)\s*\(([^)]+)\)/);
    if (inputMatch) {
      contract.inputs.push({ name: inputMatch[1], type: inputMatch[2].trim() });
    }
    const outputMatch = line.match(/^-\s*output:\s*(.+)/);
    if (outputMatch) {
      contract.output = outputMatch[1].trim();
    }
  }
  return (contract.inputs.length || contract.output) ? contract : null;
}

function parseFunctions(body) {
  const functions = {};
  const sections = body.split(/\n## /);

  for (const section of sections) {
    if (!section.trim()) continue;
    const lines = section.split('\n');
    const name = lines[0].replace(/^#+\s*/, '').trim();
    if (!name || name.startsWith('#')) continue;
    const description = lines.slice(1).join('\n').trim();
    if (description) {
      const contract = parseContract(description);
      functions[name] = {
        description: `## ${name}\n\n${description}`,
        contract,
      };
    }
  }

  return functions;
}

function parseModule(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(content);
  const functions = parseFunctions(body);
  return { meta, body, functions, filePath };
}

function parseRoutes(serverModule) {
  const routes = [];
  const routePattern = /###\s+(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/gi;
  let match;

  while ((match = routePattern.exec(serverModule.body)) !== null) {
    const method = match[1].toLowerCase();
    const routePath = match[2];
    const startIdx = match.index + match[0].length;
    const nextHeading = serverModule.body.indexOf('\n###', startIdx);
    const description = nextHeading === -1
      ? serverModule.body.slice(startIdx).trim()
      : serverModule.body.slice(startIdx, nextHeading).trim();

    routes.push({ method, path: routePath, description });
  }

  return routes;
}

function loadConfig(dir) {
  const configPath = path.join(dir, 'tril.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`No tril.config.json found in ${dir}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function loadModules(dir, moduleFiles) {
  const modules = {};
  for (const file of moduleFiles) {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      modules[file] = parseModule(filePath);
    }
  }
  return modules;
}

module.exports = {
  parseFrontmatter,
  parseFunctions,
  parseContract,
  parseModule,
  parseRoutes,
  loadConfig,
  loadModules,
};
