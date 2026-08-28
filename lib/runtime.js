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
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { runTool, selectTool } from './diagnostics.js';
import { TOOL_CONFIGS, languageKey } from './tools.js';
/** Debounce timers keyed by project root + tool name. */
const debounceTimers = new Map();
/** Cached reports: projectRoot → toolName → report. */
const reportCache = new Map();
function debounceKey(projectRoot, toolName) {
    return `${projectRoot}::${toolName}`;
}
/** Walk up from filePath looking for a directory containing any configFiles. */
function findProjectRoot(filePath, configFiles) {
    let dir = dirname(resolve(filePath));
    const root = dir.split('/')[0] || '/';
    while (dir.length > root.length + 1) {
        for (const cfg of configFiles) {
            if (existsSync(`${dir}/${cfg}`)) {
                return dir;
            }
        }
        dir = dirname(dir);
    }
    return undefined;
}
function scheduleCheck(filePath, config) {
    const tool = selectTool(filePath, TOOL_CONFIGS);
    if (!tool)
        return;
    const langKey = languageKey(tool.name);
    if (langKey) {
        const langConfig = config[langKey];
        if (langConfig && !langConfig.enabled)
            return;
    }
    const projectRoot = findProjectRoot(filePath, tool.configFiles);
    if (!projectRoot)
        return;
    const key = debounceKey(projectRoot, tool.name);
    const existing = debounceTimers.get(key);
    if (existing)
        clearTimeout(existing);
    const timer = setTimeout(() => {
        debounceTimers.delete(key);
        void runCheck(filePath, tool, config, projectRoot);
    }, config.debounceMs);
    debounceTimers.set(key, timer);
}
async function runCheck(filePath, tool, config, projectRoot) {
    const langKey = languageKey(tool.name);
    const extraArgs = langKey ? config[langKey].extraArgs : [];
    const timeoutMs = langKey ? config[langKey].timeoutMs : tool.timeoutMs;
    const result = await runTool(filePath, { ...tool, timeoutMs }, extraArgs);
    if (result.skipped || result.error)
        return;
    let projectCache = reportCache.get(projectRoot);
    if (!projectCache) {
        projectCache = new Map();
        reportCache.set(projectRoot, projectCache);
    }
    projectCache.set(tool.name, result.report);
}
export function getCachedReport(projectRoot, toolName) {
    return reportCache.get(projectRoot)?.get(toolName);
}
export function getAllCachedReports(projectRoot) {
    return reportCache.get(projectRoot);
}
export function clearCache() {
    reportCache.clear();
    for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
    }
    debounceTimers.clear();
}
/** Subscribe to fs/observed events. Returns a disposer that clears timers. */
export function startRuntime(ctx, config) {
    if (!config.enabled)
        return () => { };
    const handler = (target, observation) => {
        const t = target;
        const o = observation;
        if (o.kind !== 'present')
            return;
        scheduleCheck(t.displayPath, config);
    };
    ctx.on('fs/observed', handler);
    // Return a disposer that clears timers (ctx.on is auto-disposed by Cordis)
    return () => {
        for (const timer of debounceTimers.values()) {
            clearTimeout(timer);
        }
        debounceTimers.clear();
    };
}
//# sourceMappingURL=runtime.js.map