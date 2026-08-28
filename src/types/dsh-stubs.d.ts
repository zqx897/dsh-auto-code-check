/**
 * Minimal type stubs for DSH packages.
 *
 * These are structural stubs — enough for `tsc` to type-check the plugin
 * standalone. At runtime, the DSH host provides the real implementations
 * through its hoisted node_modules.
 */

declare module '@deepseek-ai/cordis' {
  export interface Context {
    on(event: string, handler: (...args: unknown[]) => unknown): () => void
    off?(event: string, handler: (...args: unknown[]) => unknown): void
    get?(name: string): unknown
    config?: unknown
    tools: Tools
  }

  export interface Tools {
    register(definition: unknown): () => void
  }

  export function defineTool(options: DefineToolOptions): unknown

  export interface DefineToolOptions {
    name: string
    description: string
    parameters: Record<string, { type: string; description?: string }>
    output: {
      schema: { type: string; [key: string]: unknown }
      render: (args: unknown, value: unknown) => ContentBlock[]
    }
    execute: (args: unknown, exec: ToolExecution) => Promise<unknown>
  }

  export interface ToolExecution {
    agent?: {
      session: {
        header: {
          cwd?: string
        }
      }
    }
  }

  export interface ContentBlock {
    type: string
    text?: string
  }
}

declare module '@deepseek-ai/dsh-tools' {
  export interface ToolExecution {
    agent?: {
      session: {
        header: {
          cwd?: string
        }
      }
    }
  }

  export function defineTool(options: unknown): unknown
}

declare module '@deepseek-ai/dsh-fs' {
  export interface FsTarget {
    displayPath: string
  }

  export type FsObservation =
    | { kind: 'present'; version: string }
    | { kind: 'absent' }
}

declare module '@deepseek-ai/dsh-agent' {
  // re-exported by dsh-tools
}

declare module '@deepseek-ai/dsh-llm' {
  // re-exported by dsh-tools
}

declare module '@deepseek-ai/dsh-subprocess' {
  // re-exported by dsh-tools
}
