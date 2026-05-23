import type { DiffResult } from './types.js';
/**
 * Format a DiffResult as a human-readable string (for --diff output).
 * Matches the sample format from the spec.
 */
export declare function formatDiff(result: DiffResult): string;
