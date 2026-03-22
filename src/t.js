const { execFileSync, execFile } = require('child_process');

const SYSTEM_PROMPT = `You are a precise function executor. You receive a function description in natural language and input values. Execute the function exactly as described and return ONLY the raw result value. No explanation, no markdown, no formatting. Just the value.

If the function returns a number, return only the number.
If the function returns a string, return only the string.
If the function returns JSON, return only valid JSON.`;

function t(prompt, options = {}) {
  const {
    model = 'haiku',
    systemPrompt = SYSTEM_PROMPT,
    timeout = 120000,
    raw = false,
    retries = 1,
  } = options;

  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--model', model,
    '--no-session-persistence',
  ];

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const output = execFileSync('claude', args, {
        timeout,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (raw) return output;

      const parsed = JSON.parse(output);
      if (parsed.is_error) {
        throw new Error(`claude error: ${parsed.result}`);
      }
      return parsed.result;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const wait = (attempt + 1) * 3000;
        console.log(`    Retry ${attempt + 1}/${retries} after ${wait / 1000}s...`);
        execFileSync('sleep', [String(wait / 1000)]);
      }
    }
  }
  if (lastErr.killed) throw new Error(`t() timed out after ${retries + 1} attempts`);
  throw lastErr;
}

function tFunction(description, input) {
  const prompt = `Given this function description:\n\n${description}\n\nExecute with this input: ${JSON.stringify(input)}\n\nReturn ONLY the output value.`;
  return t(prompt);
}

function tAsync(prompt, options = {}) {
  const {
    model = 'haiku',
    systemPrompt = SYSTEM_PROMPT,
    timeout = 120000,
    retries = 1,
  } = options;

  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--model', model,
    '--no-session-persistence',
  ];

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  function attempt(n) {
    return new Promise((resolve, reject) => {
      const child = execFile('claude', args, { timeout, encoding: 'utf-8' }, (err, stdout) => {
        if (err) {
          if (n < retries) {
            const wait = (n + 1) * 3000;
            setTimeout(() => attempt(n + 1).then(resolve, reject), wait);
            return;
          }
          reject(err.killed ? new Error(`tAsync() timed out after ${retries + 1} attempts`) : err);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          if (parsed.is_error) {
            reject(new Error(`claude error: ${parsed.result}`));
            return;
          }
          resolve(parsed.result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  return attempt(0);
}

module.exports = { t, tAsync, tFunction, SYSTEM_PROMPT };
