import { htmlToMarkdown } from '../../utils/markdown.js';
import { normalizeDate } from './helpers.js';
import type { AwardsSection } from '../../utils/types.js';

export function serializeAwards(section: AwardsSection): string {
  if (section.items.length === 0) return '';

  const lines: string[] = [];
  lines.push(`## ${section.title || 'Awards'}`);
  lines.push('');

  for (const item of section.items) {
    if (item.hidden) continue;

    const date = item.date ? normalizeDate(item.date) : '';
    const headingParts = [item.title, item.awarder, date].filter(
      p => (p ?? '').trim().length > 0,
    );
    if (headingParts.length === 0) continue;

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
