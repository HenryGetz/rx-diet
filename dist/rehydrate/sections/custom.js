// ─── Helpers ──────────────────────────────────────────────────────────────
function coerceString(v) {
    if (typeof v === 'string')
        return v;
    if (typeof v === 'number' || typeof v === 'boolean')
        return String(v);
    return '';
}
/** Keys that are internal metadata, never emitted as fields. */
const INTERNAL_KEYS = new Set([
    'description',
    'websiteUrl',
    'websiteLabel',
    'id',
    'hidden',
    'icon',
    'iconColor',
    'columns',
]);
// ─── Custom section normalizer ────────────────────────────────────────────
/**
 * Normalise a custom section entry into a flat record matching the
 * RR schema for `CustomSection.items`.
 *
 * The heading text becomes the first field (keyed as "name" if present),
 * and all definition-list items from the markdown become additional
 * fields. Known internal/metadata keys are excluded.
 */
function normalizeCustomEntry(entry) {
    const item = {};
    // Use the heading as the primary display field
    if (entry.heading) {
        item['name'] = entry.heading;
    }
    // Inherit the identity from the inline comment
    if (entry.identityComment) {
        item['id'] = entry.identityComment;
    }
    // Copy all non-internal fields from the parsed entry
    for (const [key, value] of Object.entries(entry.fields)) {
        if (INTERNAL_KEYS.has(key))
            continue;
        if (value === null || value === undefined)
            continue;
        const str = coerceString(value);
        if (str)
            item[key] = str;
    }
    // Handle description specially (it's markdown content)
    const desc = coerceString(entry.fields['description']);
    if (desc) {
        item['description'] = desc;
    }
    // Handle website fields
    const websiteUrl = coerceString(entry.fields['websiteUrl']);
    if (websiteUrl) {
        item['website'] = {
            url: websiteUrl,
            label: coerceString(entry.fields['websiteLabel']),
        };
    }
    return item;
}
/**
 * Normalise a custom section into an array of flat records matching
 * the RR schema's `CustomSection.items`.
 */
export function normalizeCustomSection(section) {
    return section.entries.map(entry => normalizeCustomEntry(entry));
}
