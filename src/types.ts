/** Shared types for the auto-code-check plugin. */

/** A single diagnostic finding. */
export interface Diagnostic {
  /** Absolute file path. */
  file: string
  /** 1-based line number. */
  line: number
  /** 1-based column number. */
  column: number
  /** Severity level. */
  severity: 'error' | 'warning' | 'info'
  /** Tool-specific error code, e.g. "TS2345", "modernize-use-auto". */
  code: string
  /** Human-readable message. */
  message: string
  /** The linter that produced this diagnostic. */
  source: string
}

/** A completed check run, cached per project root. */
export interface CheckReport {
  /** Project root the check was run against. */
  projectRoot: string
  /** Which linter ran. */
  tool: string
  /** Timestamp the check completed. */
  checkedAt: string
  /** Structured findings. */
  diagnostics: Diagnostic[]
  /** True when the project/tool combination is unsupported (no config, no binary). */
  degraded?: string
}

/** Map of project root → its latest report, keyed by tool. */
export type ReportCache = Map<string, Map<string, CheckReport>>

/** Per-tool config: which extensions it handles and how it's invoked. */
export interface ToolConfig {
  /** Linter display name. */
  name: string
  /** File extensions this tool covers (e.g. ['.ts', '.tsx']). */
  extensions: string[]
  /** Binary to invoke (resolved from PATH or node_modules). */
  binary: string
  /** Extra args always passed. */
  extraArgs: string[]
  /** Config file names to search for (e.g. ['tsconfig.json', '.eslintrc.json']). */
  configFiles: string[]
  /** Timeout in milliseconds. */
  timeoutMs: number
}

/** Per-language routing table. */
export interface LanguageRoute {
  /** Extensions this route handles. */
  extensions: string[]
  /** Ordered list of tools to try (first available wins). */
  tools: ToolConfig[]
}
