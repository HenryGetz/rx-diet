import { markdownToHtml } from '../../utils/markdown.js';
// ─── Helpers ──────────────────────────────────────────────────────────────
function coerceString(v) {
    if (typeof v === 'string')
        return v;
    if (typeof v === 'number' || typeof v === 'boolean')
        return String(v);
    return '';
}
function makeWebsite(url, label) {
    return {
        url: coerceString(url),
        label: coerceString(label),
    };
}
// ─── References ───────────────────────────────────────────────────────────
// Grammar:
//   ### {name}
//   <!-- id:{id} -->
//   - **Position**: {position}
//   - **Phone**: {phone}
//   - **Link**: [{label}]({url})
//   {description}
function parseReferenceItem(entry) {
    const name = entry.heading;
    const desc = coerceString(entry.fields['description']);
    return {
        id: entry.identityComment ?? `ref-${entry.index}`,
        hidden: false,
        name,
        position: coerceString(entry.fields['Position'] ?? ''),
        phone: coerceString(entry.fields['Phone'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: desc ? markdownToHtml(desc) : '',
    };
}
// ─── Public API ───────────────────────────────────────────────────────────
/**
 * Normalise a references section into typed `ReferenceItem` objects
 * matching the RR schema.
 */
export function normalizeReferences(section) {
    return section.entries.map(entry => parseReferenceItem(entry));
}
