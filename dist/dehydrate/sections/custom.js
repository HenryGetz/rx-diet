// ─── Custom section serializer ───────────────────────────────────────────────
// Generic serializer for custom sections whose field schema is unknown until
// runtime.
//
// Grammar:
//   ## {Section Title}
//
//   ### {Item Name / First String Field}
//   <!-- id:{id} -->
//
//   - **{fieldName}**: {fieldValue}
import { htmlToMarkdown } from '../../utils/markdown.js';
/**
 * Set of property names that are never rendered in the markdown output.
 *
 * These are metadata / internal fields used by the Reactive Resume
 * application and carry no value for LLM consumers.
 */
const EXCLUDED_KEYS = new Set(['id', 'hidden', 'icon', 'iconColor', 'columns']);
/**
 * Check whether a string value looks like HTML content.
 */
function isHtmlString(value) {
    return /<[a-z][a-z0-9]*\b[^>]*>/i.test(value);
}
/**
 * Format a single field value for inclusion in the markdown output.
 *
 * - Strings that appear HTML-like are converted via `htmlToMarkdown`.
 * - Numbers and booleans are stringified directly.
 * - Objects / arrays are JSON-stringified.
 * - null / undefined produce an empty string (field is omitted).
 */
function formatValue(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string') {
        if (isHtmlString(value)) {
            return htmlToMarkdown(value).trim();
        }
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        const obj = value;
        if (typeof obj.url === 'string') {
            if (obj.url) {
                const label = typeof obj.label === 'string' && obj.label ? obj.label : obj.url;
                return `[${label}](${obj.url})`;
            }
            return '';
        }
    }
    return JSON.stringify(value);
}
/**
 * Derive an H3 heading for a custom section item.
 *
 * Iterates the item's own enumerable properties and returns the first
 * non-excluded string value that is non-empty.  Falls back to
 * `"Entry {index}"` (1-based) when no suitable field exists.
 */
function getHeadingName(item, index) {
    for (const [key, value] of Object.entries(item)) {
        if (EXCLUDED_KEYS.has(key))
            continue;
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return `Entry ${index + 1}`;
}
/**
 * Serialize a custom section to markdown.
 *
 * Custom sections have a dynamic schema.  Each item is rendered as:
 *
 *   ### {heading}
 *   <!-- id:{id} -->
 *   - **{key}**: {value}
 *
 * Hidden items (item.hidden === true) are skipped.  Fields named `id`,
 * `hidden`, `icon`, `iconColor`, and `columns` are never emitted.
 * Returns an empty string when no visible items remain.
 */
export function serializeCustom(section) {
    const visible = section.items.filter((item) => !item.hidden);
    if (visible.length === 0)
        return '';
    const blocks = [];
    for (let i = 0; i < visible.length; i++) {
        const item = visible[i];
        const name = getHeadingName(item, i);
        const parts = [`### ${name}`];
        if (item.id) {
            parts.push(`<!-- id:${String(item.id)} -->`);
        }
        // Track which field was used as the heading to avoid duplicate emission
        let headingFieldName = null;
        for (const [key, value] of Object.entries(item)) {
            if (EXCLUDED_KEYS.has(key))
                continue;
            if (typeof value === 'string' && value.trim() === name) {
                headingFieldName = key;
                break;
            }
        }
        const fields = [];
        for (const [key, value] of Object.entries(item)) {
            if (EXCLUDED_KEYS.has(key))
                continue;
            if (key === headingFieldName)
                continue;
            const formatted = formatValue(value);
            if (formatted) {
                fields.push(`- **${key}**: ${formatted}`);
            }
        }
        if (fields.length > 0) {
            parts.push(fields.join('\n'));
        }
        blocks.push(parts.join('\n'));
    }
    return `## ${section.title}\n\n${blocks.join('\n\n')}`;
}
//# sourceMappingURL=custom.js.map