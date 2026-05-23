import { markdownToHtml } from '../utils/markdown.js';
// ─── Section heading normalisation ──────────────────────────────────────
const HEADING_TO_KEY = {
    profiles: 'profiles',
    social: 'profiles',
    links: 'profiles',
    experience: 'experience',
    employment: 'experience',
    work: 'experience',
    education: 'education',
    projects: 'projects',
    skills: 'skills',
    languages: 'languages',
    interests: 'interests',
    awards: 'awards',
    certifications: 'certifications',
    publications: 'publications',
    volunteer: 'volunteer',
    service: 'volunteer',
    community: 'volunteer',
    references: 'references',
};
const SECTION_KEYS = new Set(Object.values(HEADING_TO_KEY));
function normaliseSectionName(heading) {
    const lower = heading.trim().toLowerCase().replace(/\s+/g, '');
    return HEADING_TO_KEY[lower] ?? heading.trim();
}
// ─── Markdown helpers ───────────────────────────────────────────────────
const INLINE_ID_RE = /<!--\s*id:\s*([a-zA-Z0-9_-]+)\s*-->/;
const LINK_RE = /- \*\*(?:Link|Website)\*\*:\s*\[([^\]]*)\]\(([^)]*)\)/;
function extractIdentityComment(text) {
    const match = text.match(INLINE_ID_RE);
    return match?.[1] ?? null;
}
function extractBasicFields(rawText) {
    const fields = {};
    const lines = rawText.split('\n');
    const linkMatch = rawText.match(LINK_RE);
    if (linkMatch) {
        fields.website = { label: linkMatch[1] ?? '', url: linkMatch[2] ?? '' };
    }
    const bodyLines = lines.filter((l) => {
        const t = l.trim();
        return (!t.startsWith('<!--') &&
            !t.startsWith('- **Link**:') &&
            !t.startsWith('- **Website**:') &&
            t.length > 0);
    });
    if (bodyLines.length > 0) {
        fields.description = bodyLines.join('\n');
    }
    return fields;
}
function extractHeadingParts(headingText) {
    return headingText
        .split('|')
        .map((p) => p.trim())
        .filter(Boolean);
}
// ─── Frontmatter stripping ──────────────────────────────────────────────
function stripFrontmatter(md) {
    if (!md.startsWith('---\n'))
        return md;
    const end = md.indexOf('\n---', 4);
    if (end === -1)
        return md;
    const rest = md.slice(end + 4);
    return rest.startsWith('\n') ? rest.slice(1) : rest;
}
// ─── Basics / Summary extraction ────────────────────────────────────────
function extractBasics(body) {
    const basics = {};
    const firstSection = body.search(/\n## /);
    const preamble = firstSection === -1 ? body : body.slice(0, firstSection);
    let headline = null;
    for (const line of preamble.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
            basics.name = trimmed.slice(2).trim();
            continue;
        }
        if (trimmed.startsWith('#'))
            continue;
        if (!headline && !trimmed.startsWith('-') && !trimmed.startsWith('<!--')) {
            headline = trimmed;
            basics.headline = trimmed;
            continue;
        }
        // Parse definition list: - **Key**: value
        const dlMatch = trimmed.match(/^-\s+\*\*(.+?)\*\*:\s*(.+)/);
        if (dlMatch) {
            const key = dlMatch[1].toLowerCase();
            const value = dlMatch[2];
            basics[key] = value;
        }
    }
    return basics;
}
function extractSummary(sections) {
    const summarySection = sections.find((s) => s.name === 'summary' || s.heading.toLowerCase() === 'summary');
    if (!summarySection || summarySection.entries.length === 0)
        return null;
    const desc = summarySection.entries[0]?.fields.description;
    return desc && typeof desc === 'string' ? { content: desc } : null;
}
// ─── Public API ─────────────────────────────────────────────────────────
export function parseRxMarkdown(mdContent) {
    const body = stripFrontmatter(mdContent);
    const sections = [];
    const rawParts = body.split(/\n(?=## )/);
    for (const raw of rawParts) {
        const trimmed = raw.trim();
        if (!trimmed)
            continue;
        const sectionMatch = trimmed.match(/^##\s+(.+)/);
        if (!sectionMatch)
            continue;
        const rawHeading = sectionMatch[1].trim();
        const sectionName = normaliseSectionName(rawHeading);
        const isCustom = !SECTION_KEYS.has(sectionName);
        const rest = trimmed.slice(sectionMatch[0].length).trim();
        const entryParts = rest ? rest.split(/\n(?=### )/) : [];
        const entries = [];
        for (let i = 0; i < entryParts.length; i++) {
            const text = entryParts[i].trim();
            if (!text)
                continue;
            const headingMatch = text.match(/^###\s+(.+)/m);
            if (!headingMatch)
                continue;
            const heading = headingMatch[1]?.trim() ?? '';
            const headingParts = heading ? extractHeadingParts(heading) : [];
            const fields = extractBasicFields(text);
            if (headingParts.length > 0) {
                fields._headingParts = headingParts;
            }
            entries.push({
                heading,
                identityComment: extractIdentityComment(text),
                rawText: text,
                index: entries.length,
                fields,
            });
        }
        if (entries.length === 0 && rest) {
            const bulletLines = rest
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('- ') || l.startsWith('* '));
            for (let i = 0; i < bulletLines.length; i++) {
                const line = bulletLines[i];
                const content = line.slice(2);
                const boldMatch = content.match(/^\*\*(.+?)\*\*:\s*(.+)/);
                const restContent = boldMatch ? boldMatch[2] ?? '' : content;
                const levelMatch = restContent.match(/\(L(\d)\)/) || restContent.match(/(\d)\/5\)/);
                entries.push({
                    heading: content,
                    identityComment: null,
                    rawText: line,
                    index: i,
                    fields: {
                        _bulletText: content,
                        ...(boldMatch ? { _boldKey: boldMatch[1], _boldValue: restContent } : {}),
                        ...(levelMatch ? { _level: parseInt(levelMatch[1], 10) } : {}),
                    },
                });
            }
        }
        sections.push({
            name: sectionName,
            heading: rawHeading,
            entries,
            isCustom,
        });
    }
    const basics = extractBasics(body);
    const summary = extractSummary(sections);
    const filteredSections = sections.filter((s) => s.name !== 'summary' && s.heading.toLowerCase() !== 'summary');
    return {
        result: {
            basics,
            summary,
            sections: filteredSections,
        },
    };
}
export function convertEntryFieldsToHtml(fields) {
    const result = {};
    const htmlFields = new Set(['description', 'content', 'summary']);
    for (const [key, value] of Object.entries(fields)) {
        if (htmlFields.has(key) && typeof value === 'string' && value.length > 0) {
            try {
                result[key] = markdownToHtml(value);
            }
            catch {
                result[key] = value;
            }
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
//# sourceMappingURL=parser.js.map