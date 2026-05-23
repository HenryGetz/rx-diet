import type { RxFrontmatter, SectionName } from '../utils/types.js';
export type IdentityResolution = {
    resolved: true;
    id: string;
    tier: 'inline' | 'id_map' | 'fuzzy';
} | {
    resolved: false;
    reason: string;
};
/**
 * Parse an inline `<!-- id:<uuid> -->` comment from a single line.
 * Returns the UUID or null if no match.
 */
export declare function parseInlineId(line: string): string | null;
/**
 * Tier 1: Resolve by inline comment.
 * Searches the entire entry text for `<!-- id:UUID -->`.
 */
export declare function resolveByInline(entryText: string): string | null;
/**
 * Tier 2: Resolve by frontmatter id_map.
 * Looks up `sections.{sectionName}.{index}` in the frontmatter's id_map.
 */
export declare function resolveByIdMap(fm: RxFrontmatter, sectionName: SectionName, index: number): string | null;
/**
 * Tier 3: Resolve by content-hash fuzzy match.
 *
 * Computes a fingerprint from the markdown entry's fields and compares
 * against fingerprints of each base item. Returns the id of the first
 * exact fingerprint match, or null if none found.
 */
export declare function resolveByFuzzy<T extends {
    id: string;
}>(sectionType: string, markdownFields: Record<string, string | undefined>, baseItems: T[]): string | null;
/**
 * Full three-tier identity resolution for a single entry.
 *
 *  1. Inline comment  (`<!-- id:UUID -->`)
 *  2. Frontmatter id_map (`sections.{sectionName}.{index}`)
 *  3. Content-hash fuzzy match
 *
 * Each tier verifies the resolved id exists in baseItems before returning.
 */
export declare function resolveIdentity<T extends {
    id: string;
}>(entryText: string, fm: RxFrontmatter, sectionName: SectionName, index: number, sectionType: string, markdownFields: Record<string, string | undefined>, baseItems: T[]): IdentityResolution;
