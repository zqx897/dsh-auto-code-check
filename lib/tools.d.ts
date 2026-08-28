/**
 * Shared tool configurations for the auto-code-check plugin.
 *
 * Each ToolConfig describes one linter: which file extensions it handles,
 * how to invoke it, and which config files signal its project root.
 */
import type { ToolConfig } from './types.ts';
/** All supported linter configurations. */
export declare const TOOL_CONFIGS: ToolConfig[];
/** Map tool name to its language config key. */
export declare function languageKey(toolName: string): 'typescript' | 'cpp' | 'python' | undefined;
//# sourceMappingURL=tools.d.ts.map