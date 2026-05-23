// ─── References section serializer ───────────────────────────────────────────
// Serializes the `references` section to markdown.
//
// Grammar:
//   ## References
//
//   ### {name}
//   <!-- id:{id} -->
//
//   - **Position**: {position}
//   - **Phone**: {phone}
//   - **Website**: [link](url)
//
//   {description}
import { htmlToMarkdown } from '../../utils/markdown.js';
/**
 * Serialize the `references` section to markdown.
 *
 * Each reference item produces an H3 heading with the person's name, an
 * identity comment, a definition-list-style block of non-empty contact fields
 * (position, phone, website), and the HTML description converted to markdown.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export function serializeReferences(section) {
    const visible = section.items.filter((item) => !item.hidden);
    if (visible.length === 0)
        return '';
    const blocks = [];
    for (const item of visible) {
        const parts = [`### ${item.name}`, `<!-- id:${item.id} -->`];
        const fields = [];
        if (item.position) {
            fields.push(`- **Position**: ${item.position}`);
        }
        if (item.phone) {
            fields.push(`- **Phone**: ${item.phone}`);
        }
        if (item.website?.url) {
            const label = item.website.label || item.website.url;
            fields.push(`- **Website**: [${label}](${item.website.url})`);
        }
        if (fields.length > 0) {
            parts.push(fields.join('\n'));
        }
        if (item.description) {
            const desc = htmlToMarkdown(item.description);
            if (desc.trim()) {
                parts.push(desc);
            }
        }
        blocks.push(parts.join('\n'));
    }
    return `## ${section.title || 'References'}\n\n${blocks.join('\n\n')}`;
}
//# sourceMappingURL=references.js.map