# Tril

**Convert any codebase into plain English that an LLM can execute.**

Inspired by the Babel fish from *The Hitchhiker's Guide to the Galaxy*. Website: [tril.cc](https://tril.cc)

---

## The Ship of Theseus, But For Code

You know the paradox: if every plank in a ship is replaced over the years until not a single original molecule remains — is it still the same ship? Philosophers argue. In practice, functionalism wins.

Here's the thought experiment that wouldn't leave my head.

Take an ordinary JS app — a unit converter. The function `celsiusToFahrenheit` is three lines: take a number, multiply by 9/5, add 32. Dense, unambiguous code. A machine understands it. A human understands it — if they know the syntax.

```javascript
function celsiusToFahrenheit(value) {
  const n = Number(value);
  return n * 9 / 5 + 32;
}
```

Tril takes every function in a repository and replaces the dry code with clear, simple English. Not a comment on the code. Not documentation. The code itself gets replaced. As if one person were explaining to another over the phone what should happen.

What happens next is easy to guess. Function by function, like planks in the Ship of Theseus, the entire repository transforms into a possibly unexciting but coherent and detailed story of state changes and functions. After each micro-replacement — automated tests. The application must work after every iteration. The ship's buoyancy must not change after repair.

The output is a `.md` file. Plain markdown. GitHub renders it, a phone displays it, and most importantly — any human can read it:

```markdown
## celsiusToFahrenheit

**Purpose:** Convert temperature from Celsius to Fahrenheit.

**Inputs:**
- `value` (number): Temperature in Celsius

**Behaviour:**
1. Multiply value by 9/5
2. Add 32 to the result

**Output:** number — temperature in Fahrenheit

**Edge cases:**
- Non-numeric input returns NaN
- null coerces to 0, so returns 32
- Handles negative numbers; -40C equals -40F

**Examples:**
- 0 → 32
- 100 → 212
- -40 → -40
```

And then this markdown **runs**. `tril run` starts an HTTP server. When a request arrives, it doesn't call JavaScript. It sends the text description of the function to Claude via `claude -p` and waits for the result. The LLM reads the instruction in human language and executes it.

With the simple Celsius-to-Fahrenheit function, the AI nailed it. Tests confirmed:

| Test | Original (JS) | Tril (LLM) | Match |
|------|---------------|-----------------|-------|
| 100°C → °F | `212` | `212` | YES |
| 32°F → °C | `0` | `0` | YES |
| 1 km → mi | `0.621371` | `0.621371` | YES |
| 1 kg → lbs | `2.20462` | `2.20462` | YES |
| -40°C → °F | `-40` | `-40` | YES |

Sure, it's slow and impractical. Each request is an LLM call — seconds instead of microseconds. But this isn't about performance. It's about why programming languages exist in the first place.

They exist out of necessity. Methodical people invented them so machines could produce exact results through lambda calculus and Turing's primitive operations. Machines used to understand only 0 and 1. Now they speak every human language simultaneously, better than any individual.

We had to invent interfaces because machines couldn't understand our intentions. So we gritted our teeth and invented formal languages to translate thoughts into instructions, into procedures, so silicon could execute them with bit-level precision. High-level languages were a joy for those who'd punched cards, but fundamentally they haven't gone far: JavaScript, Python, Rust — they're all crutches. Bridges across the gap between "I want" and "thank you for the result."

Code is compressed human language with all ambiguity removed. Tril does the reverse: decompresses it, pries open the jaws of determinism, extracts the concentrate, and explains in plain language what's happening. No need to know about that semicolon that haunted you in college, without which the compiler would dump a hundred screens of errors. It turns out LLMs can execute this text *precisely enough*, like an interpreter executing code.

A pull request in a Tril repository isn't an encrypted diff in syntax described in cryptic books with black-and-white animals on the cover. It's an editorial correction of ordinary text, the kind normal people think in. "Code review" becomes just "review": *"It says 'multiply by 9/5' — maybe 'multiply by 1.8' would be clearer?"* The barrier between those who write software and those who use it begins to dissolve.

The ship sails.

---

## How It Works

### Convert

```bash
# Local directory
tril convert ./my-app --output ./my-app-tril

# Remote GitHub repo
tril convert https://github.com/user/repo

# Keep the cloned source for inspection
tril convert https://github.com/user/repo --keep
```

Scans the source (local or remote), extracts every function, sends each to Claude for natural language translation. Outputs `.md` files with YAML frontmatter preserving the project structure. Static files (HTML, CSS) are copied as-is.

Supports JavaScript and Python.

### Run

```bash
tril run ./my-app-tril --port 3000
```

Reads the `.md` files, starts an Express server, and routes every business logic request through `claude -p`. The LLM reads the function description and returns the result. Static files are served directly.

### The `t()` Primitive

The entire runtime rests on one function:

```javascript
function t(prompt) {
  return execFileSync('claude', ['-p', prompt, '--output-format', 'json']).result;
}
```

That's it. One instruction that does everything. The `claude` CLI is the virtual machine. The context window is RAM.

---

## Quick Start

```bash
# Clone
git clone https://github.com/sliday/tril.git
cd tril && npm install

# Run the demo app (original JS)
cd examples/unit-converter && npm install && npm test

# Convert it to natural language
node src/cli.js convert examples/unit-converter --output /tmp/unit-converter-tril

# Run the converted version
node src/cli.js run /tmp/unit-converter-tril --port 3001

# Test it
curl -X POST http://localhost:3001/convert \
  -H 'Content-Type: application/json' \
  -d '{"value": 100, "from": "celsius", "to": "fahrenheit"}'
# → {"value":212,"from":"celsius","to":"fahrenheit"}
```

## Examples

### Source apps (before conversion)
- [`examples/unit-converter/`](examples/unit-converter/) — Simple Express unit converter (JS)

### Converted apps (after conversion)
- [`examples/unit-converter-tril/`](examples/unit-converter-tril/) — Unit converter as natural language
- [`examples/stupid-ai-coder-tril/`](examples/stupid-ai-coder-tril/) — [sliday/stupid-ai-coder](https://github.com/sliday/stupid-ai-coder) (625 lines Python → 705 lines English)
- [`examples/textpress-tril/`](examples/textpress-tril/) — [sliday/textpress](https://github.com/sliday/textpress) (Python → 768 lines English)

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed and authenticated
- Node.js 18+

## License

MIT
