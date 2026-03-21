---
source: stupid-ai-coder.py
functions: [ColorfulFormatter, format, __init__, spin, __enter__, __exit__, track_progress, get_model_choice, generate_initial_code, improve_code_base, generate_title, generate_readme, get_previous_versions, visualize_diff, improve_code_smart, generate_requirements, summarize_changes, get_diff_stats, run_with_timeout, kill_child_processes, test_solution, read_rfc_from_file, main, extract_and_clean_code, run_iterations]
dependencies: [os, asyncio, logging, typing, difflib, tqdm, concurrent, ell, traceback, colorama, emoji, subprocess, shutil, ast, sys, time, threading, signal, psutil, argparse]
---
# stupid-ai-coder

## ColorfulFormatter

**Purpose:** A custom logging formatter that applies ANSI color codes to log messages based on their severity level.

**Inputs:**
- record (logging.LogRecord): A log record object containing the level, message, timestamp, and other logging metadata.

**Behaviour:**
1. Look up the format string for the record's log level (`levelno`) in the `FORMATS` dictionary.
2. Create a temporary `logging.Formatter` instance using the matched format string.
3. Delegate formatting to that temporary formatter and return the result.

**Output:** str — The formatted log message string with ANSI color codes prepended and a reset sequence appended.

**Edge cases:**
- If the log level does not match any key in `FORMATS` (e.g., a custom level), `FORMATS.get(record.levelno)` returns `None`, and `logging.Formatter(None)` falls back to the default format.
- CRITICAL level uses a red background with white text instead of a colored foreground, making it visually distinct from ERROR.
- Color rendering depends on colorama being initialised (`init(autoreset=True)`) before use; without it, raw ANSI escape codes appear as literal text on some platforms.

**Examples:**
- `logging.DEBUG` record with message "Starting process" → `"\033[36m2026-03-21 12:00:00,000 - DEBUG - Starting process\033[0m"`
- `logging.ERROR` record with message "File not found" → `"\033[31m2026-03-21 12:00:00,000 - ERROR - File not found\033[0m"`
- `logging.CRITICAL` record with message "System failure" → `"\033[41m\033[37m2026-03-21 12:00:00,000 - CRITICAL - System failure\033[0m"`

## format

**Purpose:** Apply a level-specific colored format string to a log record and return the formatted log message.

**Inputs:**
- `record` (logging.LogRecord): The log record to be formatted, containing attributes such as `levelno`, message, timestamp, etc.

**Behaviour:**
1. Look up the format string from `self.FORMATS` dictionary using `record.levelno` as the key.
2. Instantiate a `logging.Formatter` with the retrieved format string.
3. Call the formatter's `format` method on the record to produce the final formatted string.
4. Return the resulting formatted string.

**Output:** `str` — The fully formatted log message string with the level-appropriate format applied.

**Edge cases:**
- If `record.levelno` does not match any key in `self.FORMATS`, `log_fmt` will be `None`, and `logging.Formatter(None)` will fall back to the default format (`%(levelname)s:%(name)s:%(message)s`).
- Each call creates a new `logging.Formatter` instance per record, which is functionally correct but less efficient than caching formatters.

**Examples:**
- `record.levelno = logging.DEBUG (10)` → formatted string using the DEBUG-level ANSI color format defined in `FORMATS`
- `record.levelno = logging.ERROR (40)` → formatted string using the ERROR-level ANSI color format defined in `FORMATS`
- `record.levelno = logging.WARNING (30)` → formatted string using the WARNING-level ANSI color format defined in `FORMATS`

## __init__

**Purpose:** Initializes a spinner animation object with default state and character set.

**Inputs:**
- self: the instance being initialized

**Behaviour:**
1. Sets `spinning` flag to `False`, indicating the spinner is not currently active.
2. Assigns a list of four ASCII characters (`|`, `/`, `-`, `\`) to `spinner_chars` for the rotation animation sequence.
3. Sets `current` index to `0`, pointing to the first character in the spinner sequence.

**Output:** None — constructor initializes instance state in place.

**Edge cases:**
- No arguments are accepted; the spinner always starts in a stopped state.
- The backslash character is escaped as `\\` in source but represents a single `\` at runtime.

**Examples:**
- `Spinner()` → instance with `spinning=False`, `spinner_chars=['|', '/', '-', '\\']`, `current=0`
- Calling `__init__` again on an existing instance → resets all fields to defaults
- Multiple instances created → each maintains independent `spinning`, `spinner_chars`, and `current` state

## spin

**Purpose:** Animate a spinning progress indicator in the terminal while a background process is running.

**Inputs:**
- self: the Spinner instance containing `spinning` flag, `spinner_chars` list, and `current` index

**Behaviour:**
1. Enter a loop that continues as long as `self.spinning` is `True`.
2. Write a carriage return followed by the current spinner character and the text " Processing..." to stdout, overwriting the current terminal line.
3. Flush stdout immediately to ensure the output is displayed without buffering delay.
4. Advance `self.current` to the next index, wrapping around to 0 when the end of `self.spinner_chars` is reached.
5. Sleep for 0.1 seconds before rendering the next frame.

**Output:** None — runs until `self.spinning` is set to `False` by another thread.

**Edge cases:**
- If `self.spinning` is `False` before the method is called, the loop body never executes and the method returns immediately.
- Must be run in a separate thread; calling it on the main thread will block execution indefinitely until `self.spinning` is cleared externally.
- If `self.spinner_chars` is empty, a `ZeroDivisionError` will occur on the modulo operation.
- The carriage return (`\r`) technique only works correctly on terminals that support it; output may appear garbled in environments that do not.

**Examples:**
- `self.spinning = True`, chars = `['|','/','-','\\']` → terminal shows cycling `| Processing...`, `/ Processing...`, etc. until stopped
- `self.spinning = False` (before call) → method returns immediately, nothing printed
- `self.spinning` set to `False` from another thread after 0.3 s → approximately 3 frames rendered, then exits

## __enter__

**Purpose:** Starts the spinner animation as a daemon thread and returns the context manager instance.

**Inputs:**
- self (Spinner): The spinner instance being used as a context manager.

**Behaviour:**
1. Sets `self.spinning` to `True` to signal the spin loop to run.
2. Creates and starts a new daemon thread targeting `self.spin`.

**Output:** None — implicitly returns `self` for use in a `with` block.

**Edge cases:**
- Because the thread is a daemon, it will be abruptly killed if the main program exits before `__exit__` is called.
- If `self.spinning` is already `True` from a previous call, a second thread will be spawned, causing overlapping spinner output.

**Examples:**
- `with Spinner(): ...` → spinner animation begins on entry, runs concurrently with the body.
- Calling `__enter__` directly without `__exit__` → thread runs indefinitely until program exits.
- Nested `with Spinner()` blocks → multiple concurrent spinner threads writing to stdout simultaneously.

## __exit__

**Purpose:** Exit the context manager by stopping the spinner and clearing the current line.

**Inputs:**
- exc_type (type): The exception type, if an exception occurred; otherwise None
- exc_val (Exception): The exception instance, if an exception occurred; otherwise None
- exc_tb (traceback): The traceback object, if an exception occurred; otherwise None

**Behaviour:**
1. Set `self.spinning` to False, signaling the spinner thread to stop.
2. Write a carriage return (`\r`) to stdout to move the cursor to the beginning of the current line, effectively clearing the spinner character.
3. Flush stdout to ensure the carriage return is immediately written to the terminal.

**Output:** None — implicitly returns None, allowing any exception to propagate normally.

**Edge cases:**
- If no exception occurred, all three parameters are None and the method behaves identically.
- The spinner background thread may still be running briefly after `self.spinning` is set to False; the carriage return ensures the line appears clean regardless.
- Does not suppress exceptions — returns None (falsy), so any exception raised in the `with` block will propagate.

**Examples:**
- Normal exit (no exception) → spinner stops, line cleared, None returned
- Exit with exception (e.g., KeyboardInterrupt) → spinner stops, line cleared, exception propagates
- Nested context manager exit → spinner stops independently, no interference with outer context

## track_progress

**Purpose:** Display a colorful green progress bar showing how far along the current operation is.

**Inputs:**
- current (int): The number of units already completed
- total (int): The total number of units in the operation

**Behaviour:**
1. Opens a tqdm progress bar context manager configured with a green-coloured bar using colorama's `Fore.GREEN` and `Fore.RESET`
2. Immediately updates the progress bar by `current` units, reflecting the current completion state
3. Exits the context manager, closing the progress bar

**Output:** None — displays a progress bar to stdout as a side effect

**Edge cases:**
- If `current` equals `total`, the bar will appear fully complete
- If `current` is 0, the bar displays at 0% with no progress
- If `current` exceeds `total`, tqdm may display >100% progress without raising an error
- The bar is shown and immediately closed (not animated over time); it is a snapshot display

**Examples:**
- `track_progress(0, 100)` → prints a 0% green progress bar to stdout
- `track_progress(50, 100)` → prints a 50% green progress bar to stdout
- `track_progress(100, 100)` → prints a fully complete green progress bar to stdout

## get_model_choice

**Purpose:** Display a formatted AI model selection menu and prompt the user to choose a model.

**Inputs:**
- None

**Behaviour:**
1. Define a list of 3 available models: `claude-3-5-sonnet-20240620` (Default), `gpt-4o-mini` (Alternative), and `llama3.2` (Local Ollama).
2. Print a coloured header with a robot emoji and a separator line.
3. Iterate over the model list and print each entry with its number, model name, and description label, each in distinct colours.
4. Print a closing separator line.
5. Enter an infinite loop prompting the user to enter a choice (1–3) or press Enter for the default.
6. If the user presses Enter or enters `"1"`, return `"claude-3-5-sonnet-20240620"`.
7. If the user enters `"2"`, return `"gpt-4o-mini"`.
8. If the user enters `"3"`, return `"llama3.2"`.
9. For any other input, print a warning message and repeat the prompt.

**Output:** `str` — The model identifier string corresponding to the user's selection.

**Edge cases:**
- Empty input (just Enter) is treated as selecting the default model (`"claude-3-5-sonnet-20240620"`), same as entering `"1"`.
- Any input other than `""`, `"1"`, `"2"`, or `"3"` is rejected with an error message and the prompt repeats.
- The loop runs indefinitely until a valid choice is made — there is no exit or cancellation path built in.

**Examples:**
- User presses Enter → `"claude-3-5-sonnet-20240620"`
- User enters `"2"` → `"gpt-4o-mini"`
- User enters `"3"` → `"llama3.2"`

## generate_initial_code

**Purpose:** Constructs a prompt string instructing an LLM to generate boilerplate Python code for a given task.

**Inputs:**
- task (str): Description of the programming task to generate code for
- model (str): The LLM model identifier to use (accepted but unused in current implementation)

**Behaviour:**
1. Constructs a prompt string that establishes the LLM persona as a Google L5-level Python engineer
2. Embeds the `task` string inside `<task>` XML tags within the prompt
3. Appends instructions to produce well-structured boilerplate with comments and best practices
4. Returns the constructed prompt string directly without invoking any LLM

**Output:** str — A formatted prompt string intended to be passed to an LLM for code generation

**Edge cases:**
- `model` parameter is accepted but never used — the function does not call any LLM itself
- If `task` is an empty string, the prompt is still returned with empty `<task>` tags
- If `task` contains special characters or XML-like tags, they are embedded as-is with no escaping
- The function does not validate or sanitise the `task` input

**Examples:**
- `"build a REST API"`, `"gpt-4"` → prompt string with `<task>build a REST API</task>` embedded
- `""`, `"claude-3"` → prompt string with empty `<task></task>` tags
- `"<script>alert(1)</script>"`, `"any-model"` → prompt string with the raw string injected unescaped

## improve_code_base

**Purpose:** Builds and returns an LLM prompt string to iteratively improve Python code with creativity, readability, and one new feature per iteration.

**Inputs:**
- `code` (str): The current Python source code to be improved
- `iteration` (int): The current improvement iteration number
- `previous_versions` (str): Stringified context of prior code versions
- `model` (str): The LLM model identifier (referenced for context, not used in prompt construction)
- `error` (Optional[str]): An error message from the previous code execution, if any

**Behaviour:**
1. If `error` is provided, constructs an error addendum string instructing the LLM to fix the error; otherwise sets it to an empty string
2. Builds a multi-section prompt that casts the LLM as a Google L5 full-stack expert
3. Injects `code` inside `<code>` tags
4. Injects `iteration` as a numeric label
5. Injects `previous_versions` inside `<context>` tags for historical awareness
6. Injects the error addendum inside `<error>` tags
7. Appends three improvement directives: prioritise creativity, optimise readability/maintainability, and add exactly one new "mega ultra cool" feature absent from prior versions
8. Appends a detailed `<methodology>` block instructing the LLM to use `<thinking>`, `<step>`, `<count>`, `<reflection>`, and `<reward>` tags, with budget tracking and backtracking logic
9. Instructs the LLM to wrap its final answer in `<answer>` tags with no markdown code fences
10. Returns the fully assembled prompt string

**Output:** str — A fully constructed prompt ready to be sent to an LLM for code improvement

**Edge cases:**
- `error=None` (default): the error section is injected as an empty string, producing a `<error></error>` block with no content
- `model` parameter is accepted but never used in prompt construction
- If `previous_versions` is empty or minimal, the context section will be sparse, potentially reducing iteration-awareness
- No validation is performed on `code` or `iteration` values

**Examples:**
- `improve_code_base("print('hi')", 1, "", "claude-3")` → prompt string with no error section and iteration labeled `1`
- `improve_code_base("x=1/0", 2, "<v1>...</v1>", "gpt-4", error="ZeroDivisionError")` → prompt string with error fix instruction and previous version context
- `improve_code_base("", 5, "many versions...", "claude-3")` → valid prompt with empty `<code>` tags and full methodology block

## generate_title

**Purpose:** Generates a concise 2-word title for a given task by constructing a prompt string for an LLM.

**Inputs:**
- task (str): A description of the task to generate a title for.

**Behaviour:**
1. Constructs a prompt string instructing an LLM to generate a 2-word title for the provided task.
2. Appends constraints to the prompt: no comments, no markdown, no code blocks, no XML tags — just the plain title.
3. Returns the constructed prompt string.

**Output:** str — A prompt string intended to be passed to an LLM, which will respond with a 2-word title.

**Edge cases:**
- If `task` is an empty string, the prompt is still constructed and returned but the LLM may produce an arbitrary or nonsensical 2-word title.
- If `task` contains special characters or newlines, they are embedded directly into the prompt without sanitization.
- The function itself does not call any LLM — it only returns a prompt string; the actual title generation depends on the caller passing this to an LLM.

**Examples:**
- `"Build a REST API for user authentication"` → `"Generate a concise 2-word title for the following task: Build a REST API for user authentication. No comments, no markdown, no code, no \`\`\`python, no <answer>, simply the title"`
- `"Fix memory leak in background worker"` → `"Generate a concise 2-word title for the following task: Fix memory leak in background worker. No comments, no markdown, no code, no \`\`\`python, no <answer>, simply the title"`
- `"Design onboarding UI for mobile app"` → `"Generate a concise 2-word title for the following task: Design onboarding UI for mobile app. No comments, no markdown, no code, no \`\`\`python, no <answer>, simply the title"`

## generate_readme

**Purpose:** Builds a prompt string instructing an LLM to generate a README.md file for a Python project.

**Inputs:**
- `task` (str): A description of what the project does
- `title` (str): The project title to use as the README heading
- `filename` (str): The name of the project's main Python file

**Behaviour:**
1. Interpolates `title`, `task`, and `filename` into a structured prompt template
2. Instructs the LLM to produce a README with five sections: project description, how to run, dependencies, code explanation, and additional notes
3. Explicitly forbids the LLM from wrapping output in markdown code fences or adding extra commentary
4. Returns the assembled prompt string without calling any LLM itself

**Output:** str — A prompt string ready to be passed to an LLM to generate README.md content

**Edge cases:**
- If `task`, `title`, or `filename` are empty strings, the prompt is still returned but the LLM will have no meaningful content to work with
- The function does not validate inputs or call any external service — it only constructs and returns a string
- Special characters in any input (e.g. backticks, curly braces) could interfere with the f-string or the LLM's interpretation of the prompt

**Examples:**
- `task="Sorts a list of files by date", title="FileSorter", filename="sort_files.py"` → a prompt string asking the LLM to write a README for FileSorter
- `task="", title="", filename=""` → a prompt string with empty placeholders, likely producing a generic or incomplete README when executed
- `task="Trains a neural net on MNIST", title="MNISTTrainer", filename="train.py"` → a prompt string referencing MNISTTrainer and train.py with the training task as context

## get_previous_versions

**Purpose:** Reads sequential versioned Python files and builds a concatenated unified diff history up to the given iteration.

**Inputs:**
- `current_iteration` (int): The current version number; diffs are collected for all previous versions from 1 up to (but not including) this value.

**Behaviour:**
1. Initialize an empty `diffs` string and an empty `previous_content` string.
2. Iterate `i` from 1 to `current_iteration - 1` (inclusive).
3. For each `i`, construct the filename `monolyth{i}.py`.
4. If the file exists, read its contents asynchronously using `asyncio.to_thread` within an `asyncio.Lock`.
5. If `previous_content` is non-empty, compute a unified diff between the previous file's lines and the current file's lines, labelled `monolyth{i-1}.py` → `monolyth{i}.py`.
6. Append the diff block, prefixed with `===Diff v{i-1} to v{i}===`, to `diffs`.
7. Update `previous_content` to the current file's contents.
8. Log any exceptions via `logger.error` with a full traceback, then continue (no re-raise).
9. Return the accumulated `diffs` string.

**Output:** `str` — A concatenated string of unified diffs between each consecutive pair of versioned files, or an empty string if no diffs could be produced.

**Edge cases:**
- If `current_iteration` is 1 or less, the loop does not execute and an empty string is returned.
- If a versioned file (e.g. `monolyth2.py`) is missing from disk, that iteration is skipped entirely and no diff is generated for it.
- The first existing file encountered sets `previous_content` but produces no diff (there is no prior version to compare against).
- Any filesystem or I/O exception is caught, logged, and swallowed; partial results accumulated before the error are still returned.
- Files are read relative to the current working directory; no path prefix is applied.

**Examples:**
- `current_iteration=1` → `""` (loop range is empty)
- `current_iteration=3`, only `monolyth1.py` and `monolyth2.py` exist → `"===Diff v1 to v2===\n<unified diff>\n\n"`
- `current_iteration=3`, `monolyth2.py` is missing → `""` (first file sets baseline, second file absent, no diff emitted)

## visualize_diff

**Purpose:** Generate a unified diff string showing line-by-line changes between two versions of code.

**Inputs:**
- old_code (str): The original/previous version of the code
- new_code (str): The updated/new version of the code

**Behaviour:**
1. Log a debug message indicating diff generation has started
2. Split both `old_code` and `new_code` into lines, preserving line endings
3. Call `unified_diff` with 3 lines of context, labelling the sources as `'Previous Version'` and `'New Version'`
4. Join the resulting diff iterator into a single string and return it
5. If any exception occurs, log the error and full traceback, then return an error message string

**Output:** str — A unified diff string showing added, removed, and context lines between the two versions; or an error message string if an exception was raised

**Edge cases:**
- If `old_code` and `new_code` are identical, `unified_diff` produces no output and an empty string is returned
- If either input is an empty string, the diff reflects a fully added or fully removed file
- Any exception during diffing (e.g. unexpected type) is caught, logged, and returned as a formatted error string rather than being raised

**Examples:**
- `old_code="x = 1\n"`, `new_code="x = 2\n"` → unified diff showing `-x = 1` / `+x = 2`
- `old_code="hello\n"`, `new_code="hello\n"` → `""` (empty string, no differences)
- `old_code=""`, `new_code="line1\nline2\n"` → unified diff showing both lines as additions

## improve_code_smart

**Purpose:** Improve code using AI with optional parallel processing via a subprocess executor.

**Inputs:**
- `code` (str): The source code to be improved.
- `iteration` (int): The current improvement iteration number.
- `previous_versions` (str): Stringified diff history of prior code versions.
- `model` (str): The AI model identifier to use for improvement.
- `error` (Optional[str]): An optional error message from a previous run to guide improvement.
- `use_parallel` (bool): If True, runs improvement in a separate process; defaults to False.

**Behaviour:**
1. Starts a visual spinner for the duration of the improvement operation.
2. If `use_parallel` is True, logs the start of parallel processing and submits `improve_code_base` to a `ProcessPoolExecutor`, then awaits its result via `asyncio.to_thread`.
3. If `use_parallel` is False, logs the start of sequential processing and calls `improve_code_base` directly in the current thread.
4. Logs completion of the improvement step (parallel or sequential).
5. Returns the result string produced by `improve_code_base`.
6. On any exception, logs the error message and full traceback, then returns a formatted error string.

**Output:** str — The improved code returned by `improve_code_base`, or an `<answer>Error in execution: ...</answer>` string if an exception occurs.

**Edge cases:**
- If `use_parallel` is True but the subprocess raises an exception, the outer try/except catches it and returns the error string.
- If `error` is None, it is passed as-is to `improve_code_base`, which must handle the absence of error context.
- An empty or invalid `code` string is passed through without validation; behaviour depends on `improve_code_base`.

**Examples:**
- `improve_code_smart("print('hi')", 1, "", "gpt-4")` → improved code string from `improve_code_base`
- `improve_code_smart("def f(): pass", 2, "--- v1\n+++ v2\n...", "gpt-4", error="NameError: x")` → improved code string incorporating error feedback
- `improve_code_smart("bad code", 1, "", "gpt-4", use_parallel=True)` → improved code string produced in a subprocess, or `<answer>Error in execution: ...</answer>` on failure

## generate_requirements

**Purpose:** Scans all Python files in a folder, extracts their import statements, and writes a `requirements.txt` file with the discovered third-party dependencies.

**Inputs:**
- `folder_name` (str): Path to the project folder to scan for Python files.

**Behaviour:**
1. Lists all `.py` files in `folder_name`.
2. If no Python files are found, logs a warning and returns early.
3. Iterates over each Python file, reads its content, and parses it into an AST.
4. Walks the AST collecting all imported module names from both `import X` and `from X import Y` statements into a set.
5. Filters out standard library built-in modules using `sys.builtin_module_names`.
6. Writes the remaining (third-party) imports sorted alphabetically to `requirements.txt` in `folder_name`, one module per line.
7. Logs an info message with a memo emoji confirming the file was generated.

**Output:** None — writes `requirements.txt` to disk as a side effect.

**Edge cases:**
- If no `.py` files exist in `folder_name`, logs a warning and exits without creating `requirements.txt`.
- `sys.builtin_module_names` only covers C-extension built-ins, so pure-stdlib modules (e.g., `os`, `json`) are NOT filtered out and may appear in `requirements.txt`.
- `from X import Y` with a `None` module (e.g., relative imports like `from . import foo`) will raise an error or insert `None` into the imports set.
- Duplicate imports across multiple files are deduplicated via the `set`.
- Files with syntax errors will cause `ast.parse` to raise a `SyntaxError`, crashing the function.

**Examples:**
- `folder_name` contains `main.py` importing `requests` and `os` → `requirements.txt` contains `os\nrequests\n` (stdlib filtering is incomplete)
- `folder_name` contains no `.py` files → logs warning, no `requirements.txt` created
- `folder_name` contains two files both importing `flask` → `requirements.txt` lists `flask` once

## summarize_changes

**Purpose:** Generates a prompt string instructing an LLM to summarize the key changes in a given code diff.

**Inputs:**
- `diff` (str): A code diff string to be summarized.

**Behaviour:**
1. Embeds the provided `diff` into a prompt string prefixed with "Summarize the following code changes:".
2. Returns the formatted prompt string for use as an LLM input (decorated with `@ell` for LLM invocation).

**Output:** str — A prompt string containing the diff, intended to be passed to an LLM which will return a concise summary of the changes.

**Edge cases:**
- Empty `diff` string produces a prompt with no diff content, likely resulting in an empty or trivial LLM response.
- Very large diffs may exceed LLM context window limits.

**Examples:**
- `"- foo = 1\n+ foo = 2"` → `"Summarize the following code changes:\n\n- foo = 1\n+ foo = 2"`
- `""` → `"Summarize the following code changes:\n\n"`
- `"+ def new_function(): pass"` → `"Summarize the following code changes:\n\n+ def new_function(): pass"`

## get_diff_stats

**Purpose:** Parse a unified diff string and count the number of added and deleted lines.

**Inputs:**
- `diff` (str): A unified diff string containing lines prefixed with `+` or `-`.

**Behaviour:**
1. Split the diff string into individual lines by newline character.
2. Count additions: lines starting with `+` but not `+++` (which are diff headers).
3. Count deletions: lines starting with `-` but not `---` (which are diff headers).
4. Return a dictionary with total changes, additions, and deletions.

**Output:** dict — A dictionary with keys `total_changes` (int), `additions` (int), and `deletions` (int).

**Edge cases:**
- Lines starting with `+++` or `---` (unified diff file headers) are excluded from counts.
- An empty string input returns `{"total_changes": 0, "additions": 0, "deletions": 0}`.
- A diff with no added or deleted lines (e.g., context-only) returns all zeros.

**Examples:**
- `"+foo\n-bar\n context"` → `{"total_changes": 2, "additions": 1, "deletions": 1}`
- `"--- a/file.py\n+++ b/file.py\n+new line"` → `{"total_changes": 1, "additions": 1, "deletions": 0}`
- `""` → `{"total_changes": 0, "additions": 0, "deletions": 0}`

## run_with_timeout

**Purpose:** Run a shell command with a timeout, returning its stdout, stderr, and return code.

**Inputs:**
- cmd (list): The command and its arguments to execute as a list of strings
- timeout (int): Maximum number of seconds to allow the process to run (default: 10)

**Behaviour:**
1. Spawn the command as a subprocess in a new process group, capturing stdout and stderr as text
2. Record the start time and poll the process in a loop every 0.1 seconds
3. If the elapsed time exceeds `timeout`, send SIGTERM to the entire process group
4. Wait 0.1 seconds for graceful termination; if the process is still running, send SIGKILL
5. Return immediately with `(None, "Execution timed out and was forcefully terminated", -1)`
6. If the process exits within the timeout, call `communicate()` to collect stdout and stderr
7. Return the captured stdout, stderr, and the process's return code

**Output:** Tuple[Optional[str], Optional[str], int] — a 3-tuple of (stdout, stderr, return code)

**Edge cases:**
- If the timeout is reached, stdout is `None` and return code is `-1`
- If any exception occurs during process creation or execution, stdout is `None`, stderr contains the error message, and return code is `-1`
- A process that ignores SIGTERM will be forcefully killed with SIGKILL after 0.1 seconds
- The entire process group is killed, not just the direct child, preventing orphaned subprocesses

**Examples:**
- `(["echo", "hello"], 10)` → `("hello\n", "", 0)`
- `(["sleep", "30"], 5)` → `(None, "Execution timed out and was forcefully terminated", -1)`
- `(["cat", "/nonexistent"], 10)` → `("", "cat: /nonexistent: No such file or directory\n", 1)`

## kill_child_processes

**Purpose:** Terminate all child processes of a given parent process, forcefully killing any that don't stop gracefully.

**Inputs:**
- parent_pid (int): The PID of the parent process whose children should be terminated.

**Behaviour:**
1. Attempt to get the `psutil.Process` object for the given `parent_pid`.
2. If the parent process no longer exists, return immediately.
3. Retrieve all child processes recursively using `parent.children(recursive=True)`.
4. Send `SIGTERM` to each child process; skip any that have already exited.
5. Wait up to 3 seconds for all children to terminate using `psutil.wait_procs`.
6. For any processes still alive after the timeout, send `SIGKILL`; skip any that have already exited.

**Output:** None — terminates child processes as a side effect; returns nothing.

**Edge cases:**
- Parent PID does not exist: returns immediately without error.
- A child process exits between discovery and termination: `psutil.NoSuchProcess` is caught and skipped.
- A child process survives `SIGTERM` but exits before `SIGKILL` is sent: caught and skipped silently.
- No child processes exist: loops execute over empty lists with no effect.

**Examples:**
- `kill_child_processes(1234)` where PID 1234 has 3 children → all 3 children are terminated
- `kill_child_processes(9999)` where PID 9999 does not exist → returns immediately, no error
- `kill_child_processes(5678)` where a child ignores SIGTERM → child is forcefully killed after 3-second timeout

## test_solution

**Purpose:** Run a Python file as a subprocess, capture its output, and return an error message if any failure or error pattern is detected.

**Inputs:**
- `filename` (str): Path to the Python file to execute and test.

**Behaviour:**
1. Run `python3 <filename>` using `run_with_timeout`, capturing stdout, stderr, and return code.
2. Write stdout and stderr to `output.txt` with labelled sections.
3. If the return code is non-zero, return an error message containing the return code and stderr.
4. Search the combined stdout+stderr for common error patterns: `Exception`, `Error:`, `Traceback`, `ERROR`, `error`, `SyntaxError`, `NameError`, `TypeError`.
5. If any error pattern is found, return a warning message pointing to `output.txt`.
6. If `"Execution timed out"` appears in stderr, return a message indicating a possible infinite loop.
7. If no issues are detected, return `None`.
8. On any unexpected exception, log the error and return an error message string.
9. In all cases (finally block), call `kill_child_processes` on the current PID to clean up child processes.

**Output:** `Optional[str]` — `None` if the solution ran cleanly; an error/warning message string if any problem was detected or an exception occurred.

**Edge cases:**
- Non-zero return code returns immediately without checking error patterns.
- `"error"` (lowercase) is in the pattern list, which may produce false positives on benign output containing that substring.
- `"Execution timed out"` check only runs if return code is 0 and no other error patterns matched, since a timed-out process likely has a non-zero return code already.
- Both stdout and stderr may be `None`; guarded with `or ""` before concatenation.
- Any exception thrown by `run_with_timeout` or file I/O is caught and returned as a string rather than re-raised.

**Examples:**
- `"solution.py"` (clean run, exit 0, no error keywords) → `None`
- `"solution.py"` (exit code 1, stderr `"SyntaxError: invalid syntax"`) → `"Execution failed with return code 1. Error: SyntaxError: invalid syntax"`
- `"solution.py"` (exit 0, stdout contains `"Traceback"`) → `"Potential error detected: 'Traceback'. Check output.txt for details."`

## read_rfc_from_file

**Purpose:** Read and return the contents of an RFC (Request for Code) text file.

**Inputs:**
- `file_path` (str): Path to the RFC text file to read.

**Behaviour:**
1. Attempt to open the file at `file_path` in read mode.
2. Read the entire file contents and strip leading/trailing whitespace.
3. Return the stripped string.
4. If the file is not found, print a red ❌ error message indicating the file was not found and return an empty string.
5. If any other exception occurs, print a red ❌ error message with the exception details and return an empty string.

**Output:** str — The full contents of the RFC file with leading/trailing whitespace removed, or an empty string if an error occurred.

**Edge cases:**
- File does not exist at `file_path` → prints a "file not found" error and returns `""`.
- File exists but cannot be read (e.g. permission error, encoding issue) → prints a generic error message with the exception and returns `""`.
- File exists but is empty or contains only whitespace → returns `""` after stripping.

**Examples:**
- `"rfc.txt"` (valid file with content `"  Build a CLI tool  "`) → `"Build a CLI tool"`
- `"missing.txt"` (file does not exist) → `""`
- `"broken.txt"` (unreadable due to permissions) → `""`

## main

**Purpose:** Orchestrates the full AI-driven code generation pipeline: reads a task, configures options interactively, generates and iteratively improves code, optionally auto-tests it, and packages the final output.

**Inputs:**
- *(none)*: All inputs are gathered interactively at runtime via CLI arguments and `input()` prompts

**Behaviour:**
1. Parses CLI arguments, accepting an optional `-f`/`--file` flag pointing to an RFC text file
2. Prints a welcome banner with emoji/color formatting
3. If `--file` is provided, reads the task from that file via `read_rfc_from_file()`; otherwise prompts the user to type a task description
4. Prompts the user for a number of iterations (must be between 1 and 20, raises `ValueError` otherwise)
5. Calls `get_model_choice()` to let the user select the AI model
6. Prompts whether to enable auto-testing (`y/N`)
7. Overrides the model attribute on all LMP functions (`generate_initial_code`, `improve_code_base`, `generate_title`, `generate_readme`)
8. Generates a 2-word project title via `generate_title(task)`, converts it to a folder name with underscores, and creates the folder
9. Generates the initial code via `generate_initial_code(task, model)`
10. Runs an iterative loop from 1 to `iterations`:
    - Retrieves previous versions via `get_previous_versions(i)`
    - Improves the code via `improve_code_smart()`, using parallel mode when `i > 5`
    - Extracts and cleans the code via `extract_and_clean_code()`
    - Saves the result to `{folder_name}/{title}_{i}.py`
    - If auto-testing is enabled and this is the final iteration, runs `test_solution()` and retries improvement up to 3 times on failure
    - If not the final iteration or auto-testing is disabled, skips the test phase
    - If `i > 1`, generates a diff via `visualize_diff()`, computes stats via `get_diff_stats()`, and prints an AI summary via `summarize_changes()`
    - Updates `initial_code` with the latest extracted code for the next iteration
11. After the loop, moves all intermediate version files (iterations 1 through N-1) into a `versions/` subfolder using `shutil.move()`
12. Creates a `.gitignore` file in the project folder

**Output:** `None` — all side effects are file writes and terminal output

**Edge cases:**
- If `--file` is provided but `read_rfc_from_file()` returns falsy, the function returns early without generating any code
- If `iterations` is less than 1 or greater than 20, a `ValueError` is raised and the function stops
- If `extract_and_clean_code()` returns falsy in any iteration, an error message is printed and that iteration is skipped
- During the final iteration's auto-test retry loop, if 3 attempts are exhausted with errors still present, a failure message is printed and the loop exits
- If `extract_and_clean_code()` returns falsy during a retry attempt, the retry loop breaks immediately
- Parallel code improvement is only used when `i > 5`
- Diff visualization is skipped on the first iteration (`i == 1`)

**Examples:**
- `python script.py` → prompts for task, iterations, model, auto-test flag interactively; generates and saves code files
- `python script.py -f spec.txt` → reads task from `spec.txt`, then prompts for remaining options; generates and saves code files
- `python script.py -f missing.txt` (file not found) → `read_rfc_from_file()` returns `None`, function exits early with no output

## extract_and_clean_code

**Purpose:** Extracts and sanitizes Python code from an AI response string by stripping XML tags and markdown code fences.

**Inputs:**
- `code` (str): Raw AI response text that may contain `<answer>` tags and/or markdown code fences

**Behaviour:**
1. Search for `<answer>` and `</answer>` tags in the input string
2. If both tags are found, slice the string to extract only the content between them and strip surrounding whitespace
3. Remove any ```` ```python ```` markers from the resulting string
4. Remove any ```` ``` ```` markers from the resulting string and strip surrounding whitespace
5. Check if the cleaned string is empty; if so, log a warning and return `None`
6. Return the cleaned code string
7. If any exception occurs at any step, log the error and traceback and return `None`

**Output:** `Optional[str]` — The cleaned code string, or `None` if extraction failed or resulted in empty content

**Edge cases:**
- Only one of `<answer>`/`</answer>` is present — tags are ignored, raw input is cleaned of code fences instead
- Input contains neither tags nor code fences — returned as-is after stripping
- Cleaning produces an empty string — logs a warning and returns `None`
- Any unexpected exception — caught, logged with traceback, returns `None`

**Examples:**
- `"<answer>print('hi')</answer>"` → `"print('hi')"`
- `"` `` `python\nprint('hi')\n` `` `"` → `"print('hi')"`
- `"<answer></answer>"` → `None`

## run_iterations

**Purpose:** Run a specified number of iterations and collect their completion results into a list.

**Inputs:**
- num_iterations (int): Number of iterations to execute, clamped to range 1–20 (default: 4)

**Behaviour:**
1. Clamp `num_iterations` to the valid range [1, 20] using `max(1, min(20, num_iterations))`.
2. Initialize an empty `results` list.
3. Loop from 0 to `num_iterations - 1`, building a completion string `"Iteration {i+1} completed"` for each index.
4. Append each completion string to `results` and print it to stdout.
5. Return the completed `results` list.

**Output:** list — A list of strings, one per iteration, each in the format `"Iteration N completed"`.

**Edge cases:**
- If `num_iterations` is less than 1, it is clamped to 1 (always runs at least once).
- If `num_iterations` exceeds 20, it is clamped to 20 (never runs more than 20 iterations).
- If `num_iterations` is exactly 0 or negative, only 1 iteration runs.

**Examples:**
- `run_iterations(3)` → `["Iteration 1 completed", "Iteration 2 completed", "Iteration 3 completed"]`
- `run_iterations(1)` → `["Iteration 1 completed"]`
- `run_iterations(25)` → list of 20 strings from `"Iteration 1 completed"` to `"Iteration 20 completed"`