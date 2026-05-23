// ─── Profiles section serializer ─────────────────────────────────────────────
// Serializes the `profiles` section to markdown.
//
// Grammar:
//   ## Profiles
//
//   - **{network}**: [@{username}]({url})
//   - **{network}**: @{username}
/**
 * Serialize the `profiles` section to markdown.
 *
 * Each profile produces one bullet line with a bold network name.  When a url
 * is present the username becomes a link; otherwise it is plain text.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export function serializeProfiles(section) {
    const visible = section.items.filter((item) => !item.hidden);
    if (visible.length === 0)
        return '';
    const lines = visible.map((item) => {
        if (item.website?.url) {
            return `- **${item.network}**: [@${item.username}](${item.website.url})`;
        }
        return `- **${item.network}**: @${item.username}`;
    });
    return `## ${section.title || 'Profiles'}\n\n${lines.join('\n')}`;
}
//# sourceMappingURL=profiles.js.map