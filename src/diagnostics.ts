/**
 * Language-aware diagnostic runners.
 *
 * Each runner spawns its linter, parses stdout into structured Diagnostic[],
 * and returns a CheckReport. All runners degrade gracefully: missing binary,
 * missing config, or parse failures produce a degraded report rather than
 * throwing.
 */

import { spawn } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import type { Diagnostic, CheckReport, ToolConfig } from './types.ts'

// ---------------------------------------------------------------------------
// Output parsers
// ---------------------------------------------------------------------------

/**
 * tsc --noEmit (with --pretty false):
 *   src/app.ts(12,5): error TS2345: Argument of type 'string' is not assignable...
 */
function parseTscOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  // Match: path(line,col): error TSxxxx: message
  const re = /^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(\S+):\s*(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const col = match[3]!
    const severity = match[4]!
    const code = match[5]!
    const message = match[6]!
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: parseInt(col, 10),
      severity: severity === 'error' ? 'error' : 'warning',
      code,
      message: message.trim(),
      source: 'tsc',
    })
  }
  return diagnostics
}

/**
 * clang-tidy:
 *   src/main.cpp:10:5: warning: use auto [modernize-use-auto]
 *   src/main.cpp:10:5: error: something [clang-diagnostic-error]
 */
function parseClangTidyOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const re = /^(.+?):(\d+):(\d+):\s*(error|warning|note|remark)\s*:\s*(.+?)(?:\s*\[(.+)\])?$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const col = match[3]!
    const severity = match[4]!
    const message = match[5]!
    const code = match[6] ?? 'clang-diagnostic'
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: parseInt(col, 10),
      severity: severity === 'error' ? 'error' : 'warning',
      code,
      message: message.trim(),
      source: 'clang-tidy',
    })
  }
  return diagnostics
}

/**
 * cppcheck:
 *   src/main.cpp:10:5: error: Memory leak [memleak]
 *   [src/main.cpp:10]: (error) Memory leak
 */
function parseCppcheckOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  // Format 1: path:line:col: severity: message [code]
  const re1 = /^(.+?):(\d+):(\d+):\s*(error|warning|information|style)\s*:\s*(.+?)(?:\s*\[(.+)\])?$/gm
  let match: RegExpExecArray | null
  while ((match = re1.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const col = match[3]!
    const severity = match[4]!
    const message = match[5]!
    const code = match[6] ?? 'cppcheck'
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: parseInt(col, 10),
      severity: severity === 'error' ? 'error' : 'warning',
      code: code ?? 'cppcheck',
      message: message.trim(),
      source: 'cppcheck',
    })
  }
  if (diagnostics.length > 0) return diagnostics

  // Format 2: [path:line]: (severity) message
  const re2 = /^\[(.+?):(\d+)\]:\s*\((error|warning|info)\)\s*(.+)$/gm
  while ((match = re2.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const severity = match[3]!
    const message = match[4]!
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: 1,
      severity: severity === 'error' ? 'error' : 'warning',
      code: 'cppcheck',
      message: message.trim(),
      source: 'cppcheck',
    })
  }
  return diagnostics
}

/**
 * ruff check:
 *   src/app.py:10:5: F401 `os` imported but unused
 *   src/app.py:10:5: E501 Line too long ( > 88 characters)
 */
function parseRuffOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  // Match: path:line:col CODE message
  const re = /^(.+?):(\d+):(\d+)\s+([A-Z]\d+)\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const col = match[3]!
    const code = match[4]!
    const message = match[5]!
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: parseInt(col, 10),
      severity: code.startsWith('E') ? 'error' : 'warning',
      code,
      message: message.trim(),
      source: 'ruff',
    })
  }
  return diagnostics
}

/**
 * mypy:
 *   src/app.py:10: error: Argument 1 has incompatible type "str"; expected "int"
 *   src/app.py:10: note: ...
 */
function parseMypyOutput(output: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  // Match: path:line: severity: message
  const re = /^(.+?):(\d+):\s*(error|warning|note)\s*:\s*(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(output)) !== null) {
    const file = match[1]!
    const line = match[2]!
    const severity = match[3]!
    const message = match[4]!
    diagnostics.push({
      file: resolve(file),
      line: parseInt(line, 10),
      column: 1,
      severity: severity === 'error' ? 'error' : 'warning',
      code: 'mypy',
      message: message.trim(),
      source: 'mypy',
    })
  }
  return diagnostics
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

/** Map of tool name → parser function. */
const PARSERS: Record<string, (output: string) => Diagnostic[]> = {
  tsc: parseTscOutput,
  'clang-tidy': parseClangTidyOutput,
  cppcheck: parseCppcheckOutput,
  ruff: parseRuffOutput,
  mypy: parseMypyOutput,
}

// ---------------------------------------------------------------------------
// Project root discovery
// ---------------------------------------------------------------------------

/**
 * Walk up from `filePath` looking for a directory containing any of
 * `configFiles`. Returns the directory path, or undefined if none found.
 */
function findProjectRoot(filePath: string, configFiles: string[]): string | undefined {
  let dir = dirname(resolve(filePath))
  const root = dir.split('/')[0] || '/'
  while (dir.length > root.length + 1) {
    for (const cfg of configFiles) {
      if (existsSync(join(dir, cfg))) {
        return dir
      }
    }
    dir = dirname(dir)
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/** Result of a single linter invocation. */
export interface RunResult {
  report: CheckReport
  /** True when the binary was not found or config was missing. */
  skipped?: boolean
  /** Error message if the process failed unexpectedly. */
  error?: string
}

/**
 * Run a single linter against a file.
 *
 * @param filePath    Absolute path to the changed file.
 * @param tool        Tool configuration to use.
 * @param extraArgs   Additional CLI args from user config.
 */
export async function runTool(
  filePath: string,
  tool: ToolConfig,
  extraArgs: string[],
): Promise<RunResult> {
  const projectRoot = findProjectRoot(filePath, tool.configFiles)
  if (!projectRoot) {
    return {
      skipped: true,
      report: {
        projectRoot: dirname(resolve(filePath)),
        tool: tool.name,
        checkedAt: new Date().toISOString(),
        diagnostics: [],
        degraded: `No config file found for ${tool.name} (looked for: ${tool.configFiles.join(', ')})`,
      },
    }
  }

  const args = [...tool.extraArgs, ...extraArgs, filePath]
  const binary = tool.binary

  return new Promise<RunResult>((resolveResult) => {
    let stdout = ''
    let stderr = ''

    const proc = spawn(binary, args, {
      cwd: projectRoot,
      timeout: tool.timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        resolveResult({
          skipped: true,
          report: {
            projectRoot,
            tool: tool.name,
            checkedAt: new Date().toISOString(),
            diagnostics: [],
            degraded: `${binary} not found in PATH`,
          },
        })
      } else {
        resolveResult({
          error: `${binary} failed: ${err.message}`,
          report: {
            projectRoot,
            tool: tool.name,
            checkedAt: new Date().toISOString(),
            diagnostics: [],
            degraded: err.message,
          },
        })
      }
    })

    proc.on('close', (_code) => {
      // tsc returns non-zero when errors are found — that's expected.
      // clang-tidy returns 0 even with warnings.
      const parser = PARSERS[tool.name]
      if (!parser) {
        resolveResult({
          error: `No parser registered for tool: ${tool.name}`,
          report: {
            projectRoot,
            tool: tool.name,
            checkedAt: new Date().toISOString(),
            diagnostics: [],
          },
        })
        return
      }

      const diagnostics = parser(stdout + stderr).slice(0, tool.timeoutMs > 0 ? 999 : 120)
      resolveResult({
        report: {
          projectRoot,
          tool: tool.name,
          checkedAt: new Date().toISOString(),
          diagnostics,
        },
      })
    })
  })
}

/**
 * Pick the right tool for a file extension.
 *
 * @param filePath  Absolute path to the changed file.
 * @param tools     Available tool configurations.
 */
export function selectTool(filePath: string, tools: ToolConfig[]): ToolConfig | undefined {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  return tools.find((t) => t.extensions.includes(ext))
}
