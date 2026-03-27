const express = require('express');
const path = require('path');
const fs = require('fs');
const { t } = require('./t');
const { loadConfig, loadModules, parseRoutes } = require('./parser');

function buildFunctionRegistry(modules) {
  const registry = {};
  for (const [file, mod] of Object.entries(modules)) {
    for (const [name, fnData] of Object.entries(mod.functions)) {
      const description = typeof fnData === 'string' ? fnData : fnData.description;
      const contract = typeof fnData === 'object' ? fnData.contract : null;
      registry[name] = { description, contract, file };
    }
  }
  return registry;
}

function run(dir, options = {}) {
  const { port = 3000, model = 'haiku' } = options;
  const config = loadConfig(dir);
  const modules = loadModules(dir, config.modules || []);
  const registry = buildFunctionRegistry(modules);

  const app = express();
  app.use(express.json());

  for (const staticDir of (config.static || [])) {
    const staticPath = path.join(dir, staticDir);
    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
    }
  }

  const serverMd = modules[config.entry];
  if (!serverMd) {
    throw new Error(`Entry module ${config.entry} not found`);
  }

  const routes = parseRoutes(serverMd);
  console.log(`Loaded ${Object.keys(registry).length} functions from ${Object.keys(modules).length} modules`);
  console.log(`Found ${routes.length} routes`);

  for (const route of routes) {
    console.log(`  ${route.method.toUpperCase()} ${route.path}`);

    app[route.method](route.path, async (req, res) => {
      try {
        const functionDescriptions = Object.entries(registry)
          .map(([name, { description, contract }]) => {
            let section = description;
            if (contract) {
              const contractLines = [];
              for (const inp of contract.inputs) {
                contractLines.push(`  input: ${inp.name} (${inp.type})`);
              }
              if (contract.output) {
                contractLines.push(`  output: ${contract.output}`);
              }
              section += `\n\nContract:\n${contractLines.join('\n')}`;
            }
            return section;
          })
          .join('\n\n');

        const input = {
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query,
        };

        const prompt = `You are executing a web server route handler.\n\n` +
          `Route: ${route.method.toUpperCase()} ${route.path}\n` +
          `Route description:\n${route.description}\n\n` +
          `Available functions:\n\n${functionDescriptions}\n\n` +
          `Request data: ${JSON.stringify(input)}\n\n` +
          `Execute this route handler. Call the appropriate function(s) as described.\n` +
          `Return the response matching the output contracts. Valid JSON only, nothing else.`;

        const result = t(prompt);

        let cleaned = result.trim();
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

        try {
          const json = JSON.parse(cleaned);
          res.json(json);
        } catch {
          res.send(cleaned);
        }
      } catch (err) {
        console.error(`Error handling ${route.method.toUpperCase()} ${route.path}:`, err.message);
        res.status(500).json({ error: err.message });
      }
    });
  }

  const actualPort = port || config.port || 3000;
  app.listen(actualPort, () => {
    console.log(`\nTrillian runtime serving ${config.name || dir} on http://localhost:${actualPort}`);
    console.log(`Business logic executed by LLM via claude -p`);
  });

  return app;
}

module.exports = { run };
