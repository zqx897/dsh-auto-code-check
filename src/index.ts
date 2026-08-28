/**
 * Auto code check plugin for DeepSeek Harness.
 *
 * Subscribes to `fs/observed` and runs language-appropriate linters
 * (tsc, clang-tidy, cppcheck, ruff, mypy) on edited/written files.
 * Exposes a `code_check` tool the model can call to read cached reports
 * or force a fresh run.
 *
 * @module dsh-auto-code-check
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { Config, DEFAULT_CONFIG, type Config as ConfigType } from './settings.ts'
import { startRuntime, getAllCachedReports, clearCache } from './runtime.ts'
import { runTool } from './diagnostics.ts'
import { TOOL_CONFIGS, languageKey } from './tools.ts'
import type { CheckReport } from './types.ts'

export const name = 'auto-code-check'
export const inject = ['tools']

export { Config }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReport(report: CheckReport, maxDiagnostics: number): string {
  if (report.degraded) {
    return `${report.tool}: ${report.degraded}`
  }
  const diags = report.diagnostics.slice(0, maxDiagnostics)
  if (diags.length === 0) {
    return `${report.tool}: no issues found (checked at ${report.checkedAt})`
  }
  const lines = diags.map(
    (d) => `  ${d.file}:${d.line}:${d.column}  ${d.severity} ${d.code}  ${d.message}`,
  )
  const truncated = report.diagnostics.length - diags.length
  const suffix = truncated > 0 ? `\n  ... and ${truncated} more` : ''
  return `${report.tool} — ${report.diagnostics.length} diagnostics (checked at ${report.checkedAt})\n${lines.join('\n')}${suffix}`
}

/** Find a sample file with the given extensions in a directory (shallow). */
function findSampleFile(dir: string, extensions: string[]): string | undefined {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (extensions.some((ext) => entry.endsWith(ext))) {
        return join(dir, entry)
      }
    }
    // Recurse one level
    for (const entry of entries) {
      const subdir = join(dir, entry)
      try {
        const subEntries = readdirSync(subdir)
        for (const sub of subEntries) {
          if (extensions.some((ext) => sub.endsWith(ext))) {
            return join(subdir, sub)
          }
        }
      } catch {
        // Not a directory, skip
      }
    }
  } catch {
    // Cannot read directory
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Tool args schema
// ---------------------------------------------------------------------------

interface CodeCheckArgs {
  run?: boolean
  path?: string
}

const codeCheckArgs = z.object({
  run: z.boolean().default(false),
  path: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx: Context, rawConfig: ConfigType = {}): void {
  const config: ConfigType = { ...DEFAULT_CONFIG, ...rawConfig }

  // Start background runtime (subscribes to fs/observed)
  const stopRuntime = startRuntime(ctx, config)

  // Register the code_check tool
  const disposeTool = ctx.tools.register(
    defineTool({
      name: 'code_check',
      description:
        'Run or read cached multi-language diagnostics (tsc, clang-tidy, cppcheck, ruff, mypy). ' +
        'Returns structured findings with file:line:column, severity, error code, and message. ' +
        'Without `run: true`, returns the latest cached report. ' +
        'With `run: true`, forces a fresh check on the current workspace.',
      parameters: {
        run: {
          type: 'boolean',
          description: 'Force a fresh run instead of reading cache.',
        },
        path: {
          type: 'string',
          description: 'Filter by file path segment (exact match, e.g. "src/app.ts").',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args: CodeCheckArgs, exec: ToolExecution) {
        const parsed = codeCheckArgs.parse(args ?? {})

        // Determine the working directory
        const cwd = exec.agent?.session.header.cwd ?? process.cwd()

        if (parsed.run) {
          // Force a fresh check on all applicable tools
          const results: string[] = []

          for (const tool of TOOL_CONFIGS) {
            const hasConfig = tool.configFiles.some((cfg) => existsSync(join(cwd, cfg)))
            if (!hasConfig) continue

            const sampleFile = findSampleFile(cwd, tool.extensions)
            if (!sampleFile) continue

            const langKey = languageKey(tool.name)
            const extraArgs = langKey ? config[langKey].extraArgs : []
            const timeoutMs = langKey ? config[langKey].timeoutMs : tool.timeoutMs

            const result = await runTool(sampleFile, { ...tool, timeoutMs }, extraArgs)
            if (result.skipped) {
              results.push(`${tool.name}: ${result.report.degraded ?? 'skipped'}`)
            } else if (result.error) {
              results.push(`${tool.name}: error — ${result.error}`)
            } else {
              results.push(formatReport(result.report, config.maxDiagnostics))
            }
          }

          if (results.length === 0) {
            return 'No supported project configuration found (no tsconfig.json, .clang-tidy, pyproject.toml, etc.).'
          }
          return results.join('\n\n')
        }

        // Read from cache
        const allReports = getAllCachedReports(cwd)
        if (!allReports || allReports.size === 0) {
          return 'No cached reports yet. Make some edits first, or call with run: true.'
        }

        const results: string[] = []
        for (const [, report] of allReports) {
          results.push(formatReport(report as CheckReport, config.maxDiagnostics))
        }
        return results.join('\n\n')
      },
    }),
  )

  // Return disposer for cleanup
  return () => {
    stopRuntime()
    disposeTool()
    clearCache()
  }
}
