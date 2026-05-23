/**
 * Create a content fingerprint for fuzzy identity matching.
 *
 * Takes key identifying fields, normalizes them (lowercase, trimmed,
 * whitespace-collapsed), concatenates in deterministic key-sorted order,
 * and returns the first 12 hex characters of the SHA-256 hash.
 */
export declare function contentFingerprint(fields: Record<string, string | undefined>): string;
export declare function fingerprintMatch(a: string, b: string): boolean;
/**
 * Build a normalized content key for a specific resume section type.
 *
 * Extracts the relevant identifying fields from a section item based on
 * the section type, concatenating them into a single string suitable for
 * matching against external data or detecting duplicate entries.
 */
export declare function buildContentKey(sectionType: string, item: Record<string, unknown>): string;
//# sourceMappingURL=hash.d.ts.map