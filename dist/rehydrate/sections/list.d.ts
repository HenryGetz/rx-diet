import type { ParsedSection } from '../types.js';
/**
 * Normalise a list-type section (skills, languages, interests, profiles)
 * into typed items matching the RR schema.
 *
 * Returns an array of item objects, or an empty array if the section name
 * is not recognised as a list-type section.
 */
export declare function normalizeListSection(section: ParsedSection): Record<string, unknown>[];
//# sourceMappingURL=list.d.ts.map