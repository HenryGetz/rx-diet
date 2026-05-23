import type { ParsedSection } from '../types.js';
/**
 * Normalise all entries in a standard section (experience, education,
 * projects, certifications, awards, publications, volunteer) into typed
 * items matching the RR schema.
 *
 * Returns an array of item objects, or an empty array if the section
 * name is not recognised as a standard section.
 */
export declare function normalizeStandardSection(section: ParsedSection): Record<string, unknown>[];
//# sourceMappingURL=standard.d.ts.map