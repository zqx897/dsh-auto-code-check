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
import './types/dsh-stubs.d.ts';
import type { Context } from '@deepseek-ai/cordis';
import { Config, type Config as ConfigType } from './settings.ts';
export declare const name = "auto-code-check";
export declare const inject: string[];
export { Config };
export declare function apply(ctx: Context, rawConfig?: Partial<ConfigType>): void;
//# sourceMappingURL=index.d.ts.map