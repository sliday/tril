const { execFileSync } = require('child_process');

const SYSTEM_PROMPT = `You are a precise function executor. You receive a function description in natural language and input values. Execute the function exactly as described and return ONLY the raw result value. No explanation, no markdown, no formatting. Just the value.

If the function returns a number, return only the number.
If the function returns a string, return only the string.
If the function returns JSON, return only valid JSON.`;

function t(prompt, options = {}) {
  const {
    model = 'haiku',
    systemPrompt = SYSTEM_PROMPT,
    timeout = 60000,
    raw = false,
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
    if (err.killed) throw new Error(`t() timed out after ${timeout}ms`);
    throw err;
  }
}

function tFunction(description, input) {
  const prompt = `Given this function description:\n\n${description}\n\nExecute with this input: ${JSON.stringify(input)}\n\nReturn ONLY the output value.`;
  return t(prompt);
}

module.exports = { t, tFunction, SYSTEM_PROMPT };
