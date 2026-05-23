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
/** Extract URL from a markdown link `[label](url)`. */
function extractUrl(text) {
    const match = text.match(/\[([^\]]*)\]\(([^)]*)\)/);
    return match?.[2] ?? text;
}
/** Extract label from a markdown link `[label](url)`. */
function extractLabel(text) {
    const match = text.match(/\[([^\]]*)\]\(([^)]*)\)/);
    return match?.[1] ?? text;
}
// ─── Skills ───────────────────────────────────────────────────────────────
// Grammar: - {name} (L{level}) — {keyword1, keyword2}
//          - {name} (L{level})
function parseSkillItem(entry) {
    const text = entry.heading;
    // Extract level: (L{NUMBER}) or ({NUMBER}/5) or ({proficiency}, {NUMBER}/5)
    const levelMatch = text.match(/\(L(\d+)\)/) || text.match(/(\d+)\/5\)/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    const withoutLevel = text.replace(/\([^)]*\)/, '').trim();
    const dashIdx = withoutLevel.indexOf('\u2014'); // em-dash
    let name = withoutLevel;
    let keywords = [];
    if (dashIdx !== -1) {
        name = withoutLevel.slice(0, dashIdx).trim();
        const keywordStr = withoutLevel.slice(dashIdx + 1).trim();
        keywords = keywordStr.split(',').map(k => k.trim()).filter(Boolean);
    }
    return {
        id: entry.identityComment ?? `skill-${entry.index}`,
        hidden: false,
        name,
        proficiency: '',
        level,
        icon: '',
        iconColor: '',
        keywords,
    };
}
// ─── Languages ────────────────────────────────────────────────────────────
// Grammar: - **{language}**: {fluency} (L{level})
function parseLanguageItem(entry) {
    const text = entry.heading;
    // Extract level: (L{NUMBER}) or ({NUMBER}/5)
    const levelMatch = text.match(/\(L(\d+)\)/) || text.match(/(\d+)\/5\)/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    // Extract language (bold part) and fluency (rest)
    const boldMatch = text.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    const language = boldMatch ? boldMatch[1].trim() : text;
    const rest = boldMatch ? boldMatch[2].trim() : '';
    const fluency = rest.replace(/\([^)]*\)/, '').trim();
    return {
        id: entry.identityComment ?? `lang-${entry.index}`,
        hidden: false,
        language,
        fluency,
        level,
    };
}
// ─── Interests ────────────────────────────────────────────────────────────
// Grammar:
//   ### {Name}
//   <!-- id:{id} -->
//   - {keyword1}
//   - {keyword2}
function parseInterestItem(entry) {
    const name = entry.heading;
    // Keywords come from the description bullets
    const desc = coerceString(entry.fields['description']);
    const keywords = [];
    if (desc) {
        // Split by bullet lines
        for (const line of desc.split('\n')) {
            const trimmed = line.replace(/^-\s+/, '').trim();
            if (trimmed)
                keywords.push(trimmed);
        }
    }
    return {
        id: entry.identityComment ?? `interest-${entry.index}`,
        hidden: false,
        name,
        icon: '',
        iconColor: '',
        keywords,
    };
}
// ─── Profiles ─────────────────────────────────────────────────────────────
// Grammar:
//   - **{network}**: [@{username}]({url})
//   - **{network}**: @{username}
//   - **{network}**: [{label}]({url})
function parseProfileItem(entry) {
    const text = entry.heading;
    // Try **{network}**: {value} pattern
    const defMatch = text.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    const network = defMatch ? defMatch[1].trim() : text;
    const value = defMatch ? defMatch[2].trim() : '';
    // The value is either a markdown link [@user](url) or plain text @user
    const linkMatch = value.match(/\[([^\]]*)\]\(([^)]*)\)/);
    let username = '';
    let websiteUrl = '';
    if (linkMatch) {
        username = linkMatch[1].replace(/^@/, '').trim();
        websiteUrl = linkMatch[2];
    }
    else {
        username = value.replace(/^@/, '').trim();
    }
    return {
        id: entry.identityComment ?? `profile-${entry.index}`,
        hidden: false,
        icon: '',
        iconColor: '',
        network,
        username,
        website: makeWebsite(websiteUrl, username ? `@${username}` : ''),
    };
}
const ENTRY_PARSERS = {
    skills: parseSkillItem,
    languages: parseLanguageItem,
    interests: parseInterestItem,
    profiles: parseProfileItem,
};
// ─── Public API ───────────────────────────────────────────────────────────
/**
 * Normalise a list-type section (skills, languages, interests, profiles)
 * into typed items matching the RR schema.
 *
 * Returns an array of item objects, or an empty array if the section name
 * is not recognised as a list-type section.
 */
export function normalizeListSection(section) {
    const parser = ENTRY_PARSERS[section.name];
    if (!parser)
        return [];
    return section.entries.map(entry => parser(entry));
}
//# sourceMappingURL=list.js.map