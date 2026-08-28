/**
 * Configuration schema for the auto-code-check plugin.
 *
 * Override via profile patch (`cordis.patch.yml`):
 *
 * ```yaml
 * - id: auto-code-check
 *   config:
 *     debounceMs: 1500
 *     triggerTools: ['edit', 'write']
 *     maxDiagnostics: 200
 *     languages:
 *       typescript:
 *         enabled: true
 *       cpp:
 *         enabled: true
 *         binary: 'clang-tidy'
 *       python:
 *         enabled: true
 *         binary: 'ruff'
 * ```
 *
 * Note: patch replacement is whole-config — include every field you want to keep.
 */

import z from '@deepseek-ai/schemastery'

/** Per-language configuration. */
export interface LanguageSettings {
  enabled: boolean
  /** Timeout in ms for each check run. */
  timeoutMs: number
  /** Maximum diagnostics per report. */
  maxDiagnostics: number
  /** Extra args passed to the linter binary. */
  extraArgs: string[]
}

export const LanguageSettings: z<LanguageSettings> = z.object({
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(60_000),
  maxDiagnostics: z.number().default(120),
  extraArgs: z.array(z.string()).default([]),
})

/** Top-level plugin configuration. */
export interface Config {
  /** Master switch — set false to disable all background checking. */
  enabled: boolean
  /** Debounce window in ms after last file change. */
  debounceMs: number
  /** Tool actor names that trigger a check (edit, write). */
  triggerTools: string[]
  /** Maximum diagnostics across all tools in a single report. */
  maxDiagnostics: number
  /** TypeScript / TS-only settings. */
  typescript: LanguageSettings
  /** C++ settings. */
  cpp: LanguageSettings
  /** Python settings. */
  python: LanguageSettings
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  debounceMs: z.number().default(800),
  triggerTools: z.array(z.string()).default(['edit', 'write']),
  maxDiagnostics: z.number().default(120),
  typescript: LanguageSettings,
  cpp: LanguageSettings,
  python: LanguageSettings,
})

/** Resolved config with all defaults filled in. */
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  debounceMs: 800,
  triggerTools: ['edit', 'write'],
  maxDiagnostics: 120,
  typescript: { enabled: true, timeoutMs: 60_000, maxDiagnostics: 120, extraArgs: [] },
  cpp: { enabled: true, timeoutMs: 60_000, maxDiagnostics: 120, extraArgs: [] },
  python: { enabled: true, timeoutMs: 30_000, maxDiagnostics: 120, extraArgs: [] },
}
