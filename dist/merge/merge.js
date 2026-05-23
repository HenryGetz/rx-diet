// ─── Content Field Definitions ───────────────────────────────────────────
//
// These are the fields that markdown can edit per section type.
// All fields NOT listed here (id, hidden, icon, iconColor, website as an
// object, roles, customFields, etc.) are NEVER touched during merge.
const CONTENT_FIELDS = {
    experience: [
        'company',
        'position',
        'location',
        'period',
        'description',
        'website',
    ],
    education: [
        'school',
        'degree',
        'area',
        'grade',
        'location',
        'period',
        'description',
        'website',
    ],
    projects: ['name', 'period', 'description', 'website'],
    skills: ['name', 'proficiency', 'level', 'keywords'],
    languages: ['language', 'fluency', 'level'],
    profiles: ['network', 'username', 'website'],
    certifications: ['title', 'issuer', 'date', 'description', 'website'],
    awards: ['title', 'awarder', 'date', 'description', 'website'],
    publications: ['title', 'publisher', 'date', 'description', 'website'],
    volunteer: [
        'organization',
        'position',
        'location',
        'period',
        'description',
        'website',
    ],
    references: ['name', 'position', 'phone', 'description', 'website'],
    interests: ['name', 'keywords'],
};
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
export function mergeEntry(baseItem, markdownFields, sectionType, resolution) {
    // New entry — return markdown fields as the item
    if (!resolution.resolved) {
        return markdownFields;
    }
    // Resolved entry — merge only content fields, preserve everything else
    const fields = CONTENT_FIELDS[sectionType] ?? Object.keys(markdownFields);
    const result = { ...baseItem };
    for (const field of fields) {
        if (field in markdownFields && markdownFields[field] !== undefined) {
            result[field] = markdownFields[field];
        }
    }
    return result;
}
