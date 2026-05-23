import type { IdentityResolution } from './identity.js';
/**
 * Merge content fields from a markdown entry into a base JSON item.
 *
 * - When `resolution.resolved === true`: only the fields listed in
 *   CONTENT_FIELDS for the given `sectionType` are overwritten on the
 *   base item. All other fields (`id`, `hidden`, `icon`, `iconColor`,
 *   `website` as a whole object, `roles`, etc.) remain untouched.
 * - When `resolution.resolved === false`: the entry is considered new
 *   and the markdown fields are returned as-is (the caller is responsible
 *   for assigning an id).
 *
 * For section types not listed in CONTENT_FIELDS (e.g. custom sections),
 * every key present in `markdownFields` is treated as a content field.
 */
export declare function mergeEntry<T extends Record<string, unknown>>(baseItem: T, markdownFields: Record<string, unknown>, sectionType: string, resolution: IdentityResolution): T;
//# sourceMappingURL=merge.d.ts.map