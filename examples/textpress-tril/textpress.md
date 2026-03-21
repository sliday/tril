---
source: textpress.py
functions: [get_model_choice, get_creativity_level, get_temperature, ai_completion, ell_completion, llama_local_completion, format_detector, generate_structure_prompt, compress_string, ell_compress, compress_strings, calculate_stats, display_stats, replace_strings_in_content_by_positions, extract_strings_with_positions, extract_strings_with_regex, extract_strings_from_javascript, get_absolute_position, is_sentence, extract_strings_from_json, extract_strings_from_yaml, find_strings_in_json, find_strings_in_yaml, decide_to_compress, ell_decide, main]
dependencies: [sys, json5, ell, re, logging, yaml, colorama, os, subprocess, esprima, json, time, itertools]
---
# textpress

## get_model_choice

**Purpose:** Interactively prompt the user to select an AI model from a numbered menu and return its identifier string.

**Inputs:**
- *(none)*

**Behaviour:**
1. Build a colored prompt string using colorama: yellow header "Choose AI model:" followed by white-text numbered options (1. Claude, 2. ChatGPT, 3. Llama).
2. Enter an infinite loop, displaying the prompt and reading user input (stripped of whitespace).
3. If input is empty string or "1", return the Claude model identifier.
4. If input is "2", return the ChatGPT model identifier.
5. If input is "3", return the Llama model identifier.
6. Otherwise, print a red error message instructing the user to enter 1, 2, 3, or press Enter, then loop again.

**Output:** str — the model identifier string corresponding to the user's choice.

**Edge cases:**
- Empty input (just pressing Enter) defaults to Claude, same as choosing "1".
- Any input other than "", "1", "2", "3" triggers an error message and re-prompts indefinitely.
- Leading/trailing whitespace in input is stripped before comparison.
- Loop never exits without a valid selection; there is no timeout or escape mechanism.

**Examples:**
- `""` (Enter key) → `"claude-3-5-sonnet-20240620"`
- `"2"` → `"chatgpt-4o-latest"`
- `"3"` → `"llama3.2"`

## get_creativity_level

**Purpose:** Prompts the user to enter a creativity level between 1 and 5 via the console, returning the chosen level or a default of 2.

**Inputs:**
- None

**Behaviour:**
1. Builds a colored multi-line prompt string using colorama colors (yellow header, light blue description, white input label).
2. Enters an infinite loop waiting for valid input.
3. Reads a line from stdin and strips surrounding whitespace.
4. If the input is empty, returns the default value 2 immediately.
5. Attempts to parse the input as an integer.
6. If the integer is between 1 and 5 inclusive, returns it.
7. If the integer is out of range, prints a red error message and loops again.
8. If parsing as an integer fails (ValueError), prints a red error message and loops again.

**Output:** int — the selected creativity level (1–5), or 2 if the user pressed Enter without input.

**Edge cases:**
- Empty input (Enter key) returns default value 2 without error.
- Non-numeric input (e.g. "high") triggers a ValueError catch and re-prompts.
- Out-of-range integers (e.g. 0, 6, -1, 99) trigger a range error message and re-prompt.
- Whitespace-only input is treated as empty after strip(), returning default 2.

**Examples:**
- `""` (Enter) → `2`
- `"3"` → `3`
- `"abc"` → prints error, re-prompts

## get_temperature

**Purpose:** Maps a creativity level integer (1–5) to a corresponding LLM temperature float.

**Inputs:**
- `creativity_level` (int): A creativity level value between 1 and 5 inclusive.

**Behaviour:**
1. Define a fixed mapping from creativity level integers to temperature floats: 1→0.0, 2→0.2, 3→0.5, 4→0.8, 5→1.0.
2. Look up and return the temperature value corresponding to the given `creativity_level`.

**Output:** float — The LLM temperature value associated with the given creativity level.

**Edge cases:**
- If `creativity_level` is not one of the keys (1–5), a `KeyError` is raised.
- No default fallback is provided for out-of-range or non-integer inputs.

**Examples:**
- `1` → `0.0`
- `3` → `0.5`
- `5` → `1.0`

## ai_completion

**Purpose:** Routes a prompt to either a local Llama model or an ell-managed cloud model and returns the completion result.

**Inputs:**
- prompt (str): The input text prompt to send to the AI model
- model (str): The model identifier string (e.g., "llama3.2", or a cloud model name)
- max_tokens (int): Maximum number of tokens in the response (default: 1000)
- temperature (float): Sampling temperature controlling randomness (default: 0.2)

**Behaviour:**
1. Logs a debug message indicating which model is being queried.
2. Checks if the model is "llama3.2"; if so, calls `llama_local_completion` with the prompt, max_tokens, and temperature.
3. Otherwise, defines an `ell.simple`-decorated inner function `ell_completion` configured with the given model, max_tokens, and temperature, then calls it with the prompt.
4. Logs a debug message with the length of the received response.
5. Returns the result string.
6. If any exception occurs, logs the error and re-raises it.

**Output:** str — The AI-generated completion text returned by the selected model.

**Edge cases:**
- If `model` is exactly "llama3.2", the local path is taken; any other string routes through ell regardless of validity.
- Exceptions from either backend are caught, logged at ERROR level, and re-raised to the caller.
- If the result is an empty string, it is still returned and its length (0) is logged.

**Examples:**
- `ai_completion("Say hello", "llama3.2")` → calls local Llama and returns its response string
- `ai_completion("Summarize this", "claude-3-5-sonnet", max_tokens=500)` → calls ell with the specified cloud model and returns the completion
- `ai_completion("List 3 fruits", "gpt-4o", temperature=0.8)` → calls ell with higher temperature and returns a more varied completion

## ell_completion

**Purpose:** Identity function used as an ell-decorated LLM message passthrough that returns the prompt unchanged.

**Inputs:**
- p (str): The prompt or message to pass through.

**Behaviour:**
1. Receives the prompt parameter.
2. Returns it immediately without modification.

**Output:** str — The same prompt string that was passed in.

**Edge cases:**
- When decorated with `@ell.simple`, the actual behaviour is overridden by the ell framework, which uses the return value as the LLM message and returns the model's response instead.
- If `p` is `None`, returns `None`.

**Examples:**
- `"Translate this to French"` → `"Translate this to French"` (bare call, no decorator)
- `"Summarize the following text"` → LLM-generated summary (when invoked via ell decorator)
- `""` → `""` (empty string passthrough)

## llama_local_completion

**Purpose:** Run a prompt through a local Llama 3.2 model via the Ollama CLI and return the text response.

**Inputs:**
- prompt (str): The input text to send to the model
- max_tokens (int): Maximum number of tokens to generate (default: 1000)
- temperature (float): Sampling temperature controlling randomness (default: 0.2)

**Behaviour:**
1. Builds a shell command list: `["ollama", "run", "llama3.2", "-t", str(temperature), prompt]`
2. Executes the command using `subprocess.run` with output capture, text mode, and `check=True`
3. Strips leading/trailing whitespace from stdout and returns it
4. If the subprocess exits with a non-zero code, catches `CalledProcessError`, logs the error, and re-raises

**Output:** str — The model's response text with whitespace stripped

**Edge cases:**
- `max_tokens` is accepted as a parameter but never passed to the Ollama command; it has no effect
- If Ollama is not installed or `llama3.2` model is not pulled, raises `subprocess.CalledProcessError`
- If the model returns empty output, returns an empty string after strip

**Examples:**
- `llama_local_completion("Hello")` → `"Hi there! How can I help you?"`
- `llama_local_completion("2+2=", temperature=0.0)` → `"4"`
- `llama_local_completion("Write a poem", max_tokens=500, temperature=0.9)` → `"Roses are red..."`

## format_detector

**Purpose:** Detects the format of a file based on its extension and returns both the format name and file contents.

**Inputs:**
- `file_path` (str): Path to the file to read and detect format for
- `model` (any): Model parameter (accepted but unused in current implementation)

**Behaviour:**
1. Opens the file at `file_path` with UTF-8 encoding and reads its full contents into `content`.
2. Extracts the file extension from `file_path` using `os.path.splitext`.
3. Looks up the extension in a predefined map covering `.json`, `.yaml`, `.yml`, `.js`, `.jsx`, and `.ts`.
4. If the extension is found in the map, assigns the corresponding format string as `detected_format`.
5. If the extension is not in the map, falls back to `'PlainText'` as the default format.
6. Returns a tuple of `(detected_format, content)`.

**Output:** tuple(str, str) — A pair of `(detected_format, content)` where `detected_format` is the format label and `content` is the raw file text.

**Edge cases:**
- `model` parameter is accepted but completely ignored; it has no effect on output.
- Files with unrecognised extensions (e.g. `.py`, `.md`, `.csv`) all return `'PlainText'` regardless of actual content.
- Files with no extension return `'PlainText'`.
- Both `.yaml` and `.yml` map to the same `'YAML'` format string.
- Both `.js` and `.jsx` map to the same `'JavaScript'` format string.
- If the file does not exist or cannot be opened, an `OSError`/`FileNotFoundError` is raised.
- Non-UTF-8 encoded files will raise a `UnicodeDecodeError`.

**Examples:**
- `format_detector("config.json", None)` → `('JSON', '<file contents>')`
- `format_detector("index.jsx", model)` → `('JavaScript', '<file contents>')`
- `format_detector("notes.txt", model)` → `('PlainText', '<file contents>')`

## generate_structure_prompt

**Purpose:** Builds a prompt string asking an LLM to analyze and describe the structure of a given file's content.

**Inputs:**
- `format_name` (str): The name of the file format being analyzed (e.g., "JSON", "YAML", "JavaScript")
- `content` (str): The raw file content to be analyzed

**Behaviour:**
1. Truncates `content` to a maximum of 200,000 characters using slice `[:200000]`
2. Interpolates `format_name` and the truncated `content` into a multi-line f-string prompt template
3. Instructs the LLM to focus on overall organization, key elements, and recurring patterns
4. Explicitly forbids Python code in the response
5. Demands terse, plain structural output with no commentary, intro, or explanation
6. Returns the fully assembled prompt string

**Output:** str — A formatted prompt ready to be passed to an LLM for structural analysis

**Edge cases:**
- If `content` is shorter than 200,000 characters, the slice has no effect and full content is used
- If `content` is empty string, the prompt is still valid but the LLM receives no content to analyze
- If `format_name` is an empty string or misleading label, the LLM prompt loses context about what format to expect
- Does not validate or sanitize either input before interpolation

**Examples:**
- `("JSON", '{"key": "value"}')` → prompt string containing "Analyze the following JSON content..."
- `("YAML", "name: foo\nage: 42")` → prompt string with YAML content embedded up to 200k chars
- `("JavaScript", "function foo(){}")` → prompt string asking for structural analysis of JavaScript

## compress_string

**Purpose:** Compresses a string using an LLM while preserving meaning, style, and optional quote wrapping.

**Inputs:**
- `original` (str): The original string to compress, may include surrounding quotes and escape sequences.
- `format_name` (str): The file format context (e.g., "Python", "JSON") used to guide compression.
- `expert_field` (str): The domain expertise level to target in the compressed output.
- `style_guide` (str): A custom style instruction the compressed output must follow.
- `use_emojis` (bool): Whether to include relevant emojis in the compressed output.
- `model` (str): The LLM model identifier to use for compression.
- `temperature` (float): Sampling temperature passed to the LLM.

**Behaviour:**
1. Unescapes the `original` string using UTF-8 unicode-escape decoding.
2. Strips surrounding single or double quotes from the unescaped string if present.
3. Builds an emoji instruction string based on `use_emojis`.
4. Constructs a detailed prompt instructing the LLM to compress the text while preserving meaning, using expert-appropriate language, following the style guide, and respecting the character limit.
5. Defines an `ell`-decorated identity function `ell_compress` bound to the specified `model`, `max_tokens=1000`, and `temperature`.
6. Calls `ell_compress(prompt)` and strips whitespace from the result.
7. Re-wraps the compressed result in the same quote style (`'` or `"`) as the original if quotes were present.
8. Returns the compressed (and optionally re-quoted) string.

**Output:** str — The LLM-compressed version of the input string, shorter than the original, preserving quotes if the original had them.

**Edge cases:**
- If the original string is already very short, the LLM may struggle to produce a strictly shorter result.
- Strings with mismatched or nested quotes may not be correctly re-wrapped.
- Malformed unicode escape sequences in `original` will raise a `UnicodeDecodeError` during decoding.
- If the LLM ignores instructions and wraps output in quotes, the result may contain double-wrapped quotes.

**Examples:**
- `original="'Hello, how are you doing today?'"`, `use_emojis=False` → `"'Hi, how are you?'"`
- `original='"Please ensure all fields are completed before submission."'`, `use_emojis=True` → `'"Fill all fields before submitting. ✅"'`
- `original="This function iterates over each element in the list."`, `use_emojis=False` → `"Iterates over each list element."`

## ell_compress

**Purpose:** Identity function that returns its input unchanged, serving as a no-op ell-based compression placeholder.

**Inputs:**
- `p` (any): The value to be passed through.

**Behaviour:**
1. Receives input `p`.
2. Returns `p` immediately without modification.

**Output:** any — The same value as the input, unmodified.

**Edge cases:**
- `None` input → returns `None`
- Empty string `""` → returns `""`
- Any type is accepted and returned as-is.

**Examples:**
- `"hello world"` → `"hello world"`
- `42` → `42`
- `""` → `""`

## compress_strings

**Purpose:** Iteratively compress a list of strings using an LLM, applying multiple compression attempts to achieve maximum reduction.

**Inputs:**
- `strings` (list[str]): List of strings to compress
- `format_name` (str): Format identifier passed to the compression function
- `expert_field` (str): Domain expertise context passed to the compression function
- `style_guide` (str): Style instructions passed to the compression function
- `use_emojis` (bool): Whether to include emojis in compressed output
- `model` (str): LLM model identifier (e.g. `"llama3.2"` or a cloud model name)
- `compression_level` (int): Maximum number of compression attempts per string
- `temperature` (float): LLM sampling temperature

**Behaviour:**
1. Initialises accumulators for compressed results, attempt counts, and total length tracking, plus a CLI spinner cycle.
2. Iterates over each input string, printing its index and a truncated preview.
3. For each string, runs up to `compression_level` compression attempts in a loop.
4. On each attempt, calls either `llama_local_completion` (for `"llama3.2"`) or `compress_string` (for all other models) to produce a compressed candidate.
5. Strips whitespace from the candidate; if it is shorter than the current shortest result, updates both `shortest_compressed` and `current_string` (chaining compression); otherwise breaks out of the loop early.
6. Sleeps 17 ms between attempts for a visual spinner effect.
7. After all attempts for a string, prints compression stats (attempt count, truncated before/after, character count, and percentage reduction).
8. Appends `shortest_compressed` and the attempt count to their respective result lists and accumulates total lengths.
9. Returns all four result values after processing every string.

**Output:** tuple[list[str], list[int], int, int] — `(compressed_strings, compression_attempts, total_original_length, total_compressed_length)` where `compressed_strings` holds the best-compressed version of each input, `compression_attempts` the number of attempts used, and the two integers are aggregate character counts before and after compression.

**Edge cases:**
- If the first compression attempt produces an equal or longer result, the loop breaks immediately after one attempt, returning the original string unchanged.
- If `compression_level` is 0 or negative, the while loop never executes and every string is returned as-is with 0 attempts.
- Strings longer than 100 characters are truncated with `...` in console output only; full strings are processed.
- If `model == "llama3.2"`, `compress_string` is called only to build the prompt, and the actual LLM call is delegated to `llama_local_completion`.
- A string of length 0 would cause a division-by-zero when computing percentage reduction in the print statement.

**Examples:**
- `(["Hello world"], "plain", "general", "", False, "claude", 3, 0.7)` → `(["Hi world"], [2], 11, 8)`
- `(["A very long sentence that can be shortened"], "plain", "tech", "", True, "llama3.2", 5, 0.5)` → `(["Short sentence"], [3], 42, 14)`
- `(["abc"], "plain", "general", "", False, "claude", 2, 0.7)` → `(["abc"], [1], 3, 3)` *(no shorter result found)*

## calculate_stats

**Purpose:** Computes compression statistics comparing original and compressed content, including size ratios, averages, and timing metrics.

**Inputs:**
- `original_content` (str): The original uncompressed text content.
- `compressed_content` (str): The resulting compressed text content.
- `compression_attempts` (list): A list of per-string attempt counts used during compression.
- `start_time` (float): Unix timestamp marking the start of the compression process.
- `end_time` (float): Unix timestamp marking the end of the compression process.
- `total_original_length` (int): Sum of character lengths of all original strings.
- `total_compressed_length` (int): Sum of character lengths of all compressed strings.

**Behaviour:**
1. Encodes `original_content` and `compressed_content` to UTF-8 bytes and computes their byte sizes.
2. Calculates overall byte-level compression ratio as a percentage reduction from original to compressed size.
3. Calculates text-level compression ratio using `total_original_length` vs `total_compressed_length`; returns 0 if `total_original_length` is 0.
4. Computes average original and compressed character lengths per string by dividing totals by the number of compression attempts.
5. Computes average number of compression attempts per string.
6. Calculates total elapsed time (`end_time - start_time`) and average time per string.
7. Returns all computed values as a dictionary.

**Output:** dict — A dictionary containing `original_size`, `compressed_size`, `compression_ratio`, `text_compression_ratio`, `avg_original_len`, `avg_compressed_len`, `avg_compression_attempts`, `total_time`, `avg_time_per_string`, `total_original_length`, and `total_compressed_length`.

**Edge cases:**
- If `compression_attempts` is empty, all average fields (`avg_original_len`, `avg_compressed_len`, `avg_compression_attempts`, `avg_time_per_string`) are set to `0` to avoid division by zero.
- If `total_original_length` is `0`, `text_compression_ratio` is set to `0` to avoid division by zero.
- If `original_content` is empty, `original_size` will be `0`, causing a division by zero in `compression_ratio` calculation (not guarded).

**Examples:**
- `("hello world", "hi world", [1, 2], 0.0, 1.5, 11, 8)` → `{'original_size': 11, 'compressed_size': 8, 'compression_ratio': 27.27, 'text_compression_ratio': 27.27, 'avg_original_len': 5.5, 'avg_compressed_len': 4.0, 'avg_compression_attempts': 1.5, 'total_time': 1.5, 'avg_time_per_string': 0.75, 'total_original_length': 11, 'total_compressed_length': 8}`
- `("abc", "ab", [], 0.0, 2.0, 0, 0)` → `{'original_size': 3, 'compressed_size': 2, 'compression_ratio': 33.33, 'text_compression_ratio': 0, 'avg_original_len': 0, 'avg_compressed_len': 0, 'avg_compression_attempts': 0, 'total_time': 2.0, 'avg_time_per_string': 0, 'total_original_length': 0, 'total_compressed_length': 0}`
- `("data", "dt", [3], 10.0, 12.0, 4, 2)` → `{'original_size': 4, 'compressed_size': 2, 'compression_ratio': 50.0, 'text_compression_ratio': 50.0, 'avg_original_len': 4.0, 'avg_compressed_len': 2.0, 'avg_compression_attempts': 3.0, 'total_time': 2.0, 'avg_time_per_string': 2.0, 'total_original_length': 4, 'total_compressed_length': 2}`

## display_stats

**Purpose:** Prints a colorized, formatted summary of compression statistics to the terminal.

**Inputs:**
- `stats` (dict): A dictionary containing compression metrics with keys: `original_size`, `compressed_size`, `compression_ratio`, `text_compression_ratio`, `total_original_length`, `total_compressed_length`, `avg_original_len`, `avg_compressed_len`, `total_time`, `avg_time_per_string`.

**Behaviour:**
1. Prints a cyan bold header "Compression Statistics:".
2. Prints a yellow separator line of 40 `=` characters.
3. Prints original and compressed file sizes in green, formatted with thousands separators.
4. Prints file and text compression ratios in magenta, formatted to 2 decimal places.
5. Prints total and average original/compressed character lengths in blue.
6. Prints total processing time (2 decimal places) and average time per string (4 decimal places) in yellow.
7. Prints a closing yellow separator line of 40 `=` characters.

**Output:** None — all output is written directly to stdout via `print()`.

**Edge cases:**
- Missing keys in `stats` will raise a `KeyError` at the corresponding print statement.
- Colorama `autoreset=True` ensures color codes do not bleed into subsequent output.
- Very large numbers in sizes/lengths are formatted with commas for readability.

**Examples:**
- `{'original_size': 1000, 'compressed_size': 800, 'compression_ratio': 20.00, 'text_compression_ratio': 18.50, 'total_original_length': 500, 'total_compressed_length': 400, 'avg_original_len': 50.0, 'avg_compressed_len': 40.0, 'total_time': 1.23, 'avg_time_per_string': 0.1230}` → prints full stats block to stdout
- `{}` → raises `KeyError: 'original_size'`
- `{'original_size': 1000000, ...}` → displays `1,000,000 bytes` with comma formatting

## replace_strings_in_content_by_positions

**Purpose:** Replaces multiple substrings in source code content at known character positions, adjusting for length drift as replacements are applied.

**Inputs:**
- `content` (str): The full source code text to modify.
- `positions` (list of tuples): List of `(start, end)` character index pairs marking each string literal to replace.
- `original_strings` (list of str): The original string values (unused beyond pairing with positions).
- `compressed_strings` (list of str): The replacement string values to substitute in.

**Behaviour:**
1. Initialize `new_content` as a copy of `content` and set `offset` to 0.
2. Iterate over each `(start, end)` position, original string, and compressed string together.
3. Adjust `start` and `end` by the current `offset` to account for prior replacements that shifted character positions.
4. Extract the existing string literal from `new_content` at the adjusted range and detect its quote character (`'` or `"`).
5. Strip leading/trailing whitespace from the compressed string.
6. Escape backslashes and any occurrences of the detected quote character within the compressed string.
7. Reconstruct the replacement literal by wrapping the escaped compressed string in the original quote character.
8. Splice the replacement into `new_content`, replacing the range `[adjusted_start:adjusted_end]`.
9. Update `offset` by the difference between the new replacement's length and the original range's length.
10. Return the fully modified `new_content`.

**Output:** str — The modified source code with all specified string literals replaced by their compressed equivalents, preserving original quote style.

**Edge cases:**
- If a compressed string contains the same quote character used by the original literal, it is escaped to prevent syntax breakage.
- Backslashes in the compressed string are doubled to avoid unintended escape sequences.
- Replacements are applied in order; `offset` must be maintained correctly — out-of-order or overlapping positions would produce incorrect results.
- If `compressed_strings` contains strings with surrounding whitespace, it is stripped before use.

**Examples:**
- `content="x = 'hello world'"`, position `(4, 17)`, compressed `"hi"` → `"x = 'hi'"`
- `content='a = "it\'s fine"'`, position `(4, 15)`, compressed `"it's ok"` → `'a = "it\'s ok"'`
- Multiple replacements with growing offset: each subsequent position is shifted by the cumulative length delta of all prior replacements.

## extract_strings_with_positions

**Purpose:** Extract all strings and their positions from content, then filter down to only those an AI decides should be compressed.

**Inputs:**
- content (str): The source text to extract strings from
- format_name (str): The format/language of the content (e.g. `'JavaScript'`, `'JSON'`, `'YAML'`, or any other)
- model (str): The AI model identifier used for compression decisions
- temperature (float): Sampling temperature passed to the AI model

**Behaviour:**
1. Dispatch to the appropriate extractor based on `format_name`: `extract_strings_from_javascript` for `'JavaScript'`, `extract_strings_from_json` for `'JSON'`, `extract_strings_from_yaml` for `'YAML'`, or `extract_strings_with_regex` for any other format.
2. Save a copy of the full extracted strings and positions as `original_strings` and `original_positions`.
3. Iterate over every `(string, position)` pair and call `decide_to_compress(string, format_name, model, temperature)`.
4. Append each string and its position to `filtered_strings` / `filtered_positions` only when the AI returns a truthy decision.
5. Return all four lists.

**Output:** tuple[list, list, list, list] — `(original_strings, original_positions, filtered_strings, filtered_positions)` where the first two lists are the complete extraction and the last two are the AI-approved subset for compression.

**Edge cases:**
- If no strings are found in `content`, all four returned lists are empty.
- If the AI decides to compress none of the strings, `filtered_strings` and `filtered_positions` are empty while the original lists remain populated.
- If the AI decides to compress all strings, `filtered_*` lists are identical in content to `original_*` lists.
- Unrecognised `format_name` values silently fall through to the regex extractor.

**Examples:**
- `('{"key": "hello"}', 'JSON', 'claude', 0.0)` → `(['hello'], [<pos>], ['hello'], [<pos>])` (AI approves the single string)
- `('var x = "foo"; var y = "bar";', 'JavaScript', 'claude', 0.5)` → `(['foo', 'bar'], [<p1>, <p2>], ['foo'], [<p1>])` (AI approves only `'foo'`)
- `('key: value\n', 'YAML', 'claude', 0.0)` → `(['value'], [<pos>], [], [])` (AI rejects all strings)

## extract_strings_with_regex

**Purpose:** Extracts string literals and their positions from source code content using a regex fallback.

**Inputs:**
- `content` (str): Source code text to scan for string literals.

**Behaviour:**
1. Applies a regex pattern to find all single- or double-quoted string literals in `content`, capturing their full spans.
2. Iterates over each match, extracting the quote character and the inner string content (excluding surrounding quotes).
3. Skips any string whose content consists entirely of digits.
4. Appends the inner string content to `strings` and the match's `(start, end)` span to `positions`.
5. Returns both lists.

**Output:** tuple[list[str], list[tuple[int, int]]] — A pair of parallel lists: extracted string contents and their `(start, end)` character positions in `content`.

**Edge cases:**
- Strings containing only digits (e.g. `"123"`) are filtered out and not included.
- Empty strings (`""` or `''`) pass the `isdigit()` check (empty string returns `False`) and are included.
- Escaped quotes inside strings are handled by the regex's backreference pattern.
- Mismatched quotes (e.g. `"hello'`) are not matched by the regex.

**Examples:**
- `'print("hello")'` → `(["hello"], [(6, 13)])`
- `'x = "42"'` → `([], [])` (digits-only string filtered)
- `"a = 'foo'; b = \"bar\""` → `(["foo", "bar"], [(4, 9), (13, 18)])`

## extract_strings_from_javascript

**Purpose:** Extracts all string literals and their character positions from JavaScript source code using the Esprima tokenizer.

**Inputs:**
- content (str): A string containing JavaScript source code to be parsed.

**Behaviour:**
1. Initialize two empty lists: `strings` for string values and `positions` for their locations.
2. Tokenize the JavaScript `content` using `esprima.tokenize()` with location and range tracking enabled.
3. Iterate over each token produced by the tokenizer.
4. For each token whose type is `'String'`, extract the raw value (including surrounding quotes) and the start/end character indices from the token's range.
5. Append the raw string value to `strings` and the `(start, end)` tuple to `positions`.
6. Return both lists.

**Output:** tuple(list[str], list[tuple[int, int]]) — A pair of lists: the first contains raw string literal values (with quotes), the second contains `(start, end)` character index pairs indicating each string's position in the original content.

**Edge cases:**
- Content with no string literals returns two empty lists.
- Template literals (backtick strings) are not of type `'String'` in Esprima and will be skipped.
- Strings inside comments are not tokenized and will be ignored.
- Invalid or unparseable JavaScript will cause `esprima.tokenize()` to raise a parse error.
- String values retain their original quoting style (single or double quotes).

**Examples:**
- `'var x = "hello";'` → `(["\"hello\""], [(8, 15)])`
- `"var a = 'foo'; var b = 'bar';"` → `(["'foo'", "'bar'"], [(8, 13), (23, 28)])`
- `"var x = 1 + 2;"` → `([], [])`

## get_absolute_position

**Purpose:** Converts a line/column position in multi-line text content into a single absolute character offset.

**Inputs:**
- content (str): The full text content to index into
- line_number (int): Zero-based line index
- column_number (int): Zero-based column index within the target line

**Behaviour:**
1. Splits the content into individual lines by newline character.
2. Sums the lengths of all lines before `line_number`, adding 1 per line to account for the newline character.
3. Adds `column_number` to get the final absolute position.

**Output:** int — The absolute character offset from the start of the content corresponding to the given line and column.

**Edge cases:**
- Line and column numbers are assumed to be zero-based; passing 1-based values will produce an off-by-one result.
- If `line_number` is 0, the sum is 0 and the result equals `column_number`.
- Does not validate that `line_number` or `column_number` are within bounds; out-of-range values will cause incorrect results or raise an exception.
- Content using `\r\n` line endings will cause incorrect offsets since only `\n` is used as the split delimiter.

**Examples:**
- `("hello\nworld", 0, 3)` → `3`
- `("hello\nworld", 1, 2)` → `8`
- `("foo\nbar\nbaz", 2, 1)` → `9`

## is_sentence

**Purpose:** Determines whether a given text qualifies as a sentence based on minimum length and word count.

**Inputs:**
- text (str): The text to evaluate.

**Behaviour:**
1. Check if the length of `text` is at least 12 characters.
2. Strip leading/trailing whitespace from `text`, split it into words, and check if the word count is greater than 1.
3. Return `True` only if both conditions are satisfied.

**Output:** bool — `True` if the text is at least 12 characters long and contains more than one word, otherwise `False`.

**Edge cases:**
- A single long word (e.g., `"extraordinary"`) returns `False` because it has only one word.
- A two-word string shorter than 12 characters (e.g., `"hi there"`) returns `False` because it fails the length check.
- Text with only whitespace or empty string returns `False` on both checks.
- Text with multiple spaces between words still splits correctly due to `split()` default behaviour.

**Examples:**
- `"Hello world, how are you"` → `True`
- `"Hi there"` → `False`
- `"extraordinary"` → `False`

## extract_strings_from_json

**Purpose:** Extract sentence-like strings and their positions from JSON content, falling back to regex on parse failure.

**Inputs:**
- content (str): A string containing JSON-formatted data to extract strings from.

**Behaviour:**
1. Initialize empty lists for strings and positions.
2. Attempt to parse `content` as JSON using `json.loads`.
3. Iterate over all strings and their positions found by `find_strings_in_json` in the parsed data.
4. For each string, check if it qualifies as a sentence using `is_sentence`.
5. If it qualifies, append the string to `strings` and its position to `positions`.
6. If a `json.JSONDecodeError` is raised, fall back to `extract_strings_with_regex(content)` and return its result directly.
7. Return the collected strings and positions.

**Output:** tuple(list[str], list[tuple]) — A tuple of two lists: sentence-like strings found in the JSON, and their corresponding positions within the original content. On parse failure, returns whatever `extract_strings_with_regex` returns.

**Edge cases:**
- Invalid JSON triggers the fallback to regex-based extraction instead of raising an error.
- Strings that do not pass `is_sentence` are silently skipped.
- Empty JSON objects or arrays return two empty lists.
- JSON with no string values returns two empty lists.

**Examples:**
- `'{"title": "The quick brown fox jumps"}'` → `(["The quick brown fox jumps"], [(10, 35)])`
- `'{"x": 1, "y": 2}'` → `([], [])`
- `'not valid json at all!!!'` → result of `extract_strings_with_regex("not valid json at all!!!")`

## extract_strings_from_yaml

**Purpose:** Extract sentence-like strings and their positions from YAML content.

**Inputs:**
- `content` (str): Raw YAML content as a string.

**Behaviour:**
1. Initialize empty lists for strings and positions.
2. Attempt to parse `content` using `yaml.safe_load`.
3. Iterate over string/position pairs returned by `find_strings_in_yaml(data, content)`.
4. For each string, check if it qualifies as a sentence using `is_sentence`.
5. If it does, append the string to `strings` and its position to `positions`.
6. If a `yaml.YAMLError` is raised during parsing, fall back to `extract_strings_with_regex(content)` and return its result directly.
7. Return the collected `strings` and `positions` lists.

**Output:** tuple(list[str], list[Any]) — A tuple of (strings, positions) for all sentence-like strings found; or the return value of `extract_strings_with_regex` if the YAML is invalid.

**Edge cases:**
- Invalid YAML triggers the regex fallback, bypassing the normal return path entirely.
- Valid YAML with no sentence-like strings returns two empty lists.
- Strings found in YAML that do not pass `is_sentence` are silently skipped.

**Examples:**
- `"title: Hello world from YAML"` → `(["Hello world from YAML"], [<position>])`
- `"key: hi"` → `([], [])` (too short to be a sentence)
- `"key: ][invalid yaml"` → result of `extract_strings_with_regex("key: ][invalid yaml")`

## find_strings_in_json

**Purpose:** Recursively traverses a parsed JSON data structure and yields each string value along with its character position in the original raw content string.

**Inputs:**
- data (str | dict | list): The parsed JSON data to traverse (or a node within it during recursion)
- content (str): The original raw JSON content string used to locate character positions
- path (str): Dot-notation path tracking the current position in the structure (default: `""`)

**Behaviour:**
1. If `data` is a string, serialize it with `json.dumps`, find its start index in `content`, compute the end index, and yield the string along with the `(start, end)` tuple.
2. If `data` is a dict, iterate over each key-value pair and recursively call `find_strings_in_json` on each value, appending `.key` to the current path.
3. If `data` is a list, iterate over each index-item pair and recursively call `find_strings_in_json` on each item, appending `[i]` to the current path.
4. Non-string scalar values (numbers, booleans, null) are silently skipped as none of the conditions match.

**Output:** Generator[tuple[str, tuple[int, int]]] — yields `(string_value, (start_char_index, end_char_index))` for every string found in the structure

**Edge cases:**
- If the same string value appears multiple times in `content`, `str.index` always finds the first occurrence, which may return incorrect positions for duplicate strings.
- Nested structures recurse deeply; very deeply nested JSON may hit Python's recursion limit.
- The `path` parameter is tracked but never included in the yielded output, making it unused for the caller.
- If `data` is a string that cannot be found in `content` (e.g., content was modified after parsing), `str.index` raises a `ValueError`.
- Empty dicts, empty lists, and empty strings are handled without errors but yield nothing (or yield the empty string with its position).

**Examples:**
- `find_strings_in_json("hello", '"hello"')` → `("hello", (0, 7))`
- `find_strings_in_json({"key": "val"}, '{"key": "val"}')` → `("val", (8, 13))`
- `find_strings_in_json([1, "text", 2], '[1, "text", 2]')` → `("text", (4, 10))`

## find_strings_in_yaml

**Purpose:** Recursively traverses parsed YAML data to yield all string values along with their character positions in the original content string.

**Inputs:**
- data (str | dict | list): The parsed YAML data structure to traverse
- content (str): The original raw YAML content string used for position lookup
- path (str): Dot-notation path tracking current traversal location (default: "")

**Behaviour:**
1. If `data` is a string, find its starting index in `content` using `str.index()`, compute the end index as start + length, and yield the string along with the `(start, end)` tuple.
2. If `data` is a dict, iterate over all key-value pairs and recursively call `find_strings_in_yaml` on each value, extending the path with `.key`.
3. If `data` is a list, iterate over all items with their indices and recursively call `find_strings_in_yaml` on each item, extending the path with `[i]`.
4. Non-string, non-dict, non-list values (e.g. integers, booleans, None) are silently skipped — no yield occurs.

**Output:** Generator[tuple[str, tuple[int, int]]] — yields `(string_value, (start_index, end_index))` pairs for every string found in the data structure

**Edge cases:**
- If a string value appears multiple times in `content`, `str.index()` always finds the first occurrence, potentially returning incorrect positions for duplicate strings
- If `data` is `None` or a numeric/boolean type, the function yields nothing
- An empty dict or empty list produces no yields
- If the string value is not found in `content` at all, `str.index()` raises a `ValueError`
- The `path` parameter is tracked but never included in the yielded output

**Examples:**
- `{"greeting": "hello"}`, `"greeting: hello"` → `("hello", (10, 15))`
- `["yes", "no"]`, `"- yes\n- no"` → `("yes", (2, 5))`, `("no", (8, 10))`
- `{"a": {"b": "deep"}}`, `"a:\n  b: deep"` → `("deep", (7, 11))`

## decide_to_compress

**Purpose:** Asks an AI model to determine whether a given string from a structured file should be compressed.

**Inputs:**
- `string` (str): The string value to evaluate for compression
- `format_name` (str): The file format context (e.g., "JSON", "YAML") used to frame the AI prompt
- `model` (str): The AI model identifier to use for the decision
- `temperature` (float): Sampling temperature controlling randomness of the AI response

**Behaviour:**
1. Constructs a prompt that sets the AI's role as an analyzer of strings within a file of the given `format_name`
2. Passes the `string` content as part of the prompt context
3. Invokes the AI model (via `ell`) with the specified `model` and `temperature` parameters
4. Parses the AI's response to extract a boolean compression decision

**Output:** bool — `True` if the AI determines the string should be compressed, `False` otherwise

**Edge cases:**
- If the AI response is ambiguous or malformed, the function may default to a conservative value (no compression)
- Very short strings may be judged as not worth compressing
- Strings that are already minimal or non-natural-language (e.g., identifiers, codes) are likely to receive a `False` decision

**Examples:**
- `("Buy now and save 50% on all items!", "JSON", "claude-3", 0.0)` → `True`
- `("en_US", "YAML", "claude-3", 0.0)` → `False`
- `("This is a long descriptive product summary with many details.", "JSON", "claude-3", 0.2)` → `True`

## ell_decide

**Purpose:** Identity function that returns its input unchanged, serving as an ell-decorated LLM prompt passthrough.

**Inputs:**
- p (any): The prompt or value to pass through.

**Behaviour:**
1. Receives input `p`.
2. Returns `p` unchanged.

**Output:** any — The same value as the input, unmodified.

**Edge cases:**
- If `p` is `None`, returns `None`.
- If `p` is an empty string, returns an empty string.

**Examples:**
- `"Hello, world!"` → `"Hello, world!"`
- `42` → `42`
- `None` → `None`

## main

**Purpose:** Entry point for the AI Text Copy Compressor CLI tool — orchestrates user prompts, file detection, string extraction, compression, and output.

**Inputs:**
- *(none)*: Reads configuration from `sys.argv` and interactive `input()` calls at runtime

**Behaviour:**
1. Logs startup message and prints a welcome banner.
2. Validates that `sys.argv` contains exactly 1 or 2 arguments (input file, optional output file); exits with code 1 if not.
3. Sets `input_file` from `sys.argv[1]`.
4. Sets `output_file` from `sys.argv[2]` if provided; otherwise derives it as `<input_name>_output<input_ext>`.
5. Calls `get_model_choice()` interactively to select an AI model.
6. Calls `get_creativity_level()` and `get_temperature()` to determine the LLM temperature.
7. Prompts the user for a compression level (1–5, default 3); validates and clamps to default on invalid input.
8. Calls `format_detector()` to detect the file format (e.g., JSON, YAML, plain text) and load its content.
9. If the format is JSON or YAML, calls `generate_structure_prompt()` and `ai_completion()` to analyze the file structure.
10. Prompts the user for a domain expertise field (e.g., psychology, law).
11. Prompts the user for optional style guidelines (e.g., formal, casual).
12. Prompts the user whether to include emojis in the compressed output.
13. Calls `extract_strings_with_positions()` to identify all strings and the subset eligible for compression.
14. Records `start_time`, then calls `compress_strings()` to compress eligible strings using the chosen model and settings.
15. Records `end_time`.
16. Calls `replace_strings_in_content_by_positions()` to substitute compressed strings back into the original content.
17. Writes the modified content to `output_file`.
18. Calls `calculate_stats()` and `display_stats()` to report compression metrics.
19. Prints a side-by-side sample comparison of the first 100 characters before and after compression.
20. Logs successful completion.

**Output:** `None` — results are written to `output_file` on disk; statistics and samples are printed to stdout.

**Edge cases:**
- Fewer than 1 or more than 2 CLI arguments → prints usage message and exits with code 1.
- No output file specified → auto-generates output filename using `_output` suffix before the extension.
- Compression level input is empty → defaults to 3.
- Compression level input is non-integer or out of range (1–5) → prints warning and defaults to 3.
- Style guide input is empty → skips style guide and notifies user.
- Format is not JSON or YAML → skips structure analysis step.
- `num_strings_to_compress` may be less than `num_strings` if AI filtering excludes non-compressible strings.

**Examples:**
- `python psycho.py report.yaml` → compresses strings in `report.yaml`, writes result to `report_output.yaml`
- `python psycho.py input.json output.json` → compresses strings in `input.json`, writes result to `output.json`
- `python psycho.py` *(no args)* → prints error and usage, exits with code 1