# dsh-auto-code-check

Multi-language auto code review plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Runs language-appropriate linters automatically when you edit or write files, and
exposes a `code_check` tool the model can call to read cached reports or force a
fresh run.

## Supported Languages

| Language | Linter | Extensions | Config File |
|----------|--------|------------|-------------|
| TypeScript | `tsc --noEmit` | `.ts` `.tsx` `.mts` `.cts` | `tsconfig.json` |
| C++ | `clang-tidy` | `.cpp` `.cc` `.cxx` `.h` `.hpp` `.hxx` `.c` | `.clang-tidy` `compile_commands.json` |
| C++ | `cppcheck` | `.cpp` `.cc` `.cxx` `.h` `.hpp` `.hxx` `.c` | `.cppcheck` |
| Python | `ruff check` | `.py` | `pyproject.toml` `ruff.toml` `.ruff.toml` |
| Python | `mypy` | `.py` | `pyproject.toml` `mypy.ini` |

## How It Works

1. **Background**: Subscribes to `fs/observed` (the same event the built-in skill
   filesystem uses). After `edit`/`write` tools succeed, the plugin debounces
   consecutive changes (default 800ms) and runs the matching linter.
2. **Routing**: Picks the linter by file extension, finds the project root by
   walking up for a config file, spawns the binary, and parses output into
   structured diagnostics.
3. **Caching**: Results are cached per project root. The `code_check` tool reads
   the cache or forces a fresh run.
4. **Graceful degradation**: Missing binaries or config files produce a clear
   message instead of crashing.

## Install

```bash
dsh plugin --profile web add "github:<your-repo>/dsh-auto-code-check#main"
```

Then restart `dsh web`.

## Usage

The plugin works automatically — just edit files as usual. To check results:

```
"run code_check"
"run code_check with run: true"
```

Example output:

```
tsc — 2 diagnostics (checked at 2024-01-15T10:30:04)
  /home/cat/project/src/app.ts:12:5  error TS2345  Argument of type 'string' is not assignable to parameter of type 'number'
  /home/cat/project/src/app.ts:40:1  error TS2304  Cannot find name 'foo'
Tip: fix the errors, then call code_check again to verify.
```

## Configuration

All optional. Override via profile patch:

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml
- id: auto-code-check
  config:
    debounceMs: 1500
    maxDiagnostics: 200
    typescript:
      enabled: true
      timeoutMs: 60000
      extraArgs: ['--incremental']
    cpp:
      enabled: true
      timeoutMs: 60000
      extraArgs: []
    python:
      enabled: true
      timeoutMs: 30000
      extraArgs: ['--select=E,F,W']
```

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Master switch for background checking. |
| `debounceMs` | `800` | Debounce window after last file change. |
| `triggerTools` | `['edit', 'write']` | Tool names that trigger a check. |
| `maxDiagnostics` | `120` | Max diagnostics per report. |
| `typescript.enabled` | `true` | Enable TypeScript checking. |
| `typescript.timeoutMs` | `60000` | Timeout for tsc. |
| `typescript.extraArgs` | `[]` | Extra args passed to tsc. |
| `cpp.enabled` | `true` | Enable C++ checking. |
| `cpp.timeoutMs` | `60000` | Timeout for clang-tidy/cppcheck. |
| `cpp.extraArgs` | `[]` | Extra args passed to C++ linters. |
| `python.enabled` | `true` | Enable Python checking. |
| `python.timeoutMs` | `30000` | Timeout for ruff/mypy. |
| `python.extraArgs` | `[]` | Extra args passed to Python linters. |

## Architecture

```
src/
  index.ts        # Plugin entry: apply(), tool registration
  runtime.ts      # fs/observed listener, debounce, scheduling
  diagnostics.ts  # Linter runners + output parsers
  tools.ts        # Shared tool configurations
  settings.ts     # Config schema + defaults
  types.ts        # Shared TypeScript types
```

## Development

```bash
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

## Known Limitations and Deferred Work

- **No LSP integration**: Uses CLI linters, not language servers. Future work could
  route through `vscode-languageserver-protocol` for streaming diagnostics.
- **No custom rule engine**: Cannot express project-specific rules beyond what the
  linters support.
- **No AI semantic review**: Does not spawn subagents for deep code analysis.
  This is a future enhancement for changes above a complexity threshold.

## License

MIT
