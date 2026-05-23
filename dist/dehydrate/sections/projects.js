import { htmlToMarkdown } from '../../utils/markdown.js';
import { normalizePeriod } from './helpers.js';
export function serializeProjects(section) {
    if (section.items.length === 0)
        return '';
    const lines = [];
    lines.push(`## ${section.title || 'Projects'}`);
    lines.push('');
    for (const item of section.items) {
        if (item.hidden)
            continue;
        const period = item.period ? normalizePeriod(item.period) : '';
        const headingParts = [item.name, period].filter(p => (p ?? '').trim().length > 0);
        if (headingParts.length === 0)
            continue;
        lines.push(`### ${headingParts.join(' | ')}`);
        lines.push(`<!-- id:${item.id} -->`);
        if (item.description) {
            lines.push(htmlToMarkdown(item.description));
            lines.push('');
        }
        if (item.website?.url) {
            const label = item.website.label || item.website.url;
            lines.push(`- **Website**: [${label}](${item.website.url})`);
            lines.push('');
        }
    }
    return lines.join('\n').trimEnd() + '\n';
}
//# sourceMappingURL=projects.js.map