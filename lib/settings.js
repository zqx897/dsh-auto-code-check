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
import z from '@deepseek-ai/schemastery';
export const LanguageSettings = z.object({
    enabled: z.boolean().default(true),
    timeoutMs: z.number().default(60_000),
    maxDiagnostics: z.number().default(120),
    extraArgs: z.array(z.string()).default([]),
});
export const Config = z.object({
    enabled: z.boolean().default(true),
    debounceMs: z.number().default(800),
    triggerTools: z.array(z.string()).default(['edit', 'write']),
    maxDiagnostics: z.number().default(120),
    typescript: LanguageSettings,
    cpp: LanguageSettings,
    python: LanguageSettings,
});
/** Resolved config with all defaults filled in. */
export const DEFAULT_CONFIG = {
    enabled: true,
    debounceMs: 800,
    triggerTools: ['edit', 'write'],
    maxDiagnostics: 120,
    typescript: { enabled: true, timeoutMs: 60_000, maxDiagnostics: 120, extraArgs: [] },
    cpp: { enabled: true, timeoutMs: 60_000, maxDiagnostics: 120, extraArgs: [] },
    python: { enabled: true, timeoutMs: 30_000, maxDiagnostics: 120, extraArgs: [] },
};
//# sourceMappingURL=settings.js.map