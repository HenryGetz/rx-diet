import type { ResumeData } from '../utils/types.js';
import type { DiffResult } from './types.js';
/**
 * Compute a semantic diff between a base resume and a rehydrated resume.
 * Operates at the section/entry level.
 *
 * For each section:
 *   - Compare item counts and identities
 *   - Detect adds, removes, modifications
 *   - For modifications, identify what specifically changed (description length, bullet count, etc.)
 */
export declare function computeDiff(base: ResumeData, updated: ResumeData): DiffResult;
export declare function getExitCode(result: DiffResult): number;
