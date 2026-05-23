import type { ResumeData, RxFrontmatter } from './types.js';
/**
 * Parse YAML frontmatter from a markdown string.
 * Returns a tuple of [parsed frontmatter, remaining body content].
 */
export declare function parseFrontmatter(markdown: string): [RxFrontmatter, string];
/**
 * Serialize frontmatter to a YAML string with `---` delimiters.
 * Excludes `id_map` (stored in .rxresume.lock.json sidecar) and
 * shortens `generated` to date-only for a cleaner frontmatter.
 */
export declare function serializeFrontmatter(fm: RxFrontmatter): string;
/**
 * Build an id_map from a ResumeData object.
 * Maps paths like "sections.experience.0" to the item's UUID.
 */
export declare function buildIdMap(data: ResumeData): Record<string, string>;
//# sourceMappingURL=yaml.d.ts.map