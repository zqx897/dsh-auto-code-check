/**
 * Language-aware diagnostic runners.
 *
 * Each runner spawns its linter, parses stdout into structured Diagnostic[],
 * and returns a CheckReport. All runners degrade gracefully: missing binary,
 * missing config, or parse failures produce a degraded report rather than
 * throwing.
 */
import type { CheckReport, ToolConfig } from './types.ts';
/** Result of a single linter invocation. */
export interface RunResult {
    report: CheckReport;
    /** True when the binary was not found or config was missing. */
    skipped?: boolean;
    /** Error message if the process failed unexpectedly. */
    error?: string;
}
/**
 * Run a single linter against a file.
 *
 * @param filePath    Absolute path to the changed file.
 * @param tool        Tool configuration to use.
 * @param extraArgs   Additional CLI args from user config.
 */
export declare function runTool(filePath: string, tool: ToolConfig, extraArgs: string[]): Promise<RunResult>;
/**
 * Pick the right tool for a file extension.
 *
 * @param filePath  Absolute path to the changed file.
 * @param tools     Available tool configurations.
 */
export declare function selectTool(filePath: string, tools: ToolConfig[]): ToolConfig | undefined;
//# sourceMappingURL=diagnostics.d.ts.map