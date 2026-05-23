// ─── Skills section serializer ──────────────────────────────────────────────
// Serializes the `skills` section to markdown.
//
// Grammar:
//   ## Skills
//
//   - {name} (L{level})
//   - {name} (L{level}) — {keyword1, keyword2}
/**
 * Serialize the `skills` section to markdown.
 *
 * Each skill is emitted on one bullet line.  If `keywords` is non-empty,
 * a spaced em-dash separates the level from the keywords list.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export function serializeSkills(section) {
    const visible = section.items.filter((item) => !item.hidden);
    if (visible.length === 0)
        return '';
    const lines = [];
    for (const item of visible) {
        const levelStr = item.proficiency
            ? `(${item.proficiency}, ${item.level}/5)`
            : `(${item.level}/5)`;
        let line = `- ${item.name} ${levelStr}`;
        if (item.keywords.length > 0) {
            line += ` — ${item.keywords.join(', ')}`;
        }
        lines.push(line);
    }
    return `## ${section.title || 'Skills'}\n\n${lines.join('\n')}`;
}
//# sourceMappingURL=skills.js.map