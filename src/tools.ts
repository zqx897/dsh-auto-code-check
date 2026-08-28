/**
 * Shared tool configurations for the auto-code-check plugin.
 *
 * Each ToolConfig describes one linter: which file extensions it handles,
 * how to invoke it, and which config files signal its project root.
 */

import type { ToolConfig } from './types.ts'

/** All supported linter configurations. */
export const TOOL_CONFIGS: ToolConfig[] = [
  {
    name: 'tsc',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    binary: 'node_modules/typescript/bin/tsc',
    extraArgs: ['--noEmit', '--pretty', 'false'],
    configFiles: ['tsconfig.json'],
    timeoutMs: 60_000,
  },
  {
    name: 'clang-tidy',
    extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx', '.c'],
    binary: 'clang-tidy',
    extraArgs: ['--quiet'],
    configFiles: ['.clang-tidy', 'compile_commands.json'],
    timeoutMs: 60_000,
  },
  {
    name: 'cppcheck',
    extensions: ['.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx', '.c'],
    binary: 'cppcheck',
    extraArgs: ['--enable=all', '--inline-suppr', '--quiet'],
    configFiles: ['.cppcheck'],
    timeoutMs: 60_000,
  },
  {
    name: 'ruff',
    extensions: ['.py'],
    binary: 'ruff',
    extraArgs: ['check', '--output-format=concise'],
    configFiles: ['pyproject.toml', 'ruff.toml', '.ruff.toml'],
    timeoutMs: 30_000,
  },
  {
    name: 'mypy',
    extensions: ['.py'],
    binary: 'mypy',
    extraArgs: ['--no-error-summary', '--show-column-numbers'],
    configFiles: ['pyproject.toml', 'mypy.ini'],
    timeoutMs: 60_000,
  },
]

/** Map tool name to its language config key. */
export function languageKey(toolName: string): 'typescript' | 'cpp' | 'python' | undefined {
  if (toolName === 'tsc') return 'typescript'
  if (toolName === 'clang-tidy' || toolName === 'cppcheck') return 'cpp'
  if (toolName === 'ruff' || toolName === 'mypy') return 'python'
  return undefined
}
