import type { ParsedSection } from '../types.js';
/**
 * Normalise a custom section into an array of flat records matching
 * the RR schema's `CustomSection.items`.
 */
export declare function normalizeCustomSection(section: ParsedSection): Record<string, unknown>[];
