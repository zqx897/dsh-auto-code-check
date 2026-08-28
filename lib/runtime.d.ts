/**
 * Runtime: subscribes to fs/observed, debounces, routes to linters, caches.
 *
 * Architecture (mirrors dsh-code-check):
 *   fs/observed → filter by extension → debounce → find project root →
 *   spawn linter → parse output → cache report → (tool reads cache)
 *
 * Cordis automatically unregisters ctx.on() listeners when the fiber disposes,
 * so we only need to clean up timers and the tool registration.
 */
import './types/dsh-stubs.d.ts';
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './settings.ts';
export declare function getCachedReport(projectRoot: string, toolName: string): unknown;
export declare function getAllCachedReports(projectRoot: string): Map<string, unknown> | undefined;
export declare function clearCache(): void;
/** Subscribe to fs/observed events. Returns a disposer that clears timers. */
export declare function startRuntime(ctx: Context, config: Config): () => void;
//# sourceMappingURL=runtime.d.ts.map