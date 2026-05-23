// ─── Interests section serializer ────────────────────────────────────────────
// Serializes the `interests` section to markdown.
//
// Grammar:
//   ## Interests
//
//   ### {Name}
//   <!-- id:{id} -->
//
//   - {keyword1}
//   - {keyword2}
/**
 * Serialize the `interests` section to markdown.
 *
 * Each interest item produces an H3 heading with its name, an identity
 * comment, and a bullet list of keywords.  Hidden items are skipped.
 * Returns an empty string when no visible items remain.
 */
export function serializeInterests(section) {
    const visible = section.items.filter((item) => !item.hidden);
    if (visible.length === 0)
        return '';
    const blocks = [];
    for (const item of visible) {
        const parts = [`### ${item.name}`, `<!-- id:${item.id} -->`];
        if (item.keywords.length > 0) {
            parts.push(item.keywords.map((kw) => `- ${kw}`).join('\n'));
        }
        blocks.push(parts.join('\n'));
    }
    return `## ${section.title || 'Interests'}\n\n${blocks.join('\n\n')}`;
}
