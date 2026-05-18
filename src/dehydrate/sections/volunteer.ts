import { htmlToMarkdown } from '../../utils/markdown.js';
import { normalizePeriod } from './helpers.js';
import type { VolunteerSection } from '../../utils/types.js';

export function serializeVolunteer(section: VolunteerSection): string {
  if (section.items.length === 0) return '';

  const lines: string[] = [];
  lines.push(`## ${section.title || 'Volunteer'}`);
  lines.push('');

  for (const item of section.items) {
    if (item.hidden) continue;

    const period = item.period ? normalizePeriod(item.period) : '';
    const headingParts = [item.organization, item.position, period].filter(
      p => (p ?? '').trim().length > 0,
    );
    if (headingParts.length === 0) continue;

    lines.push(`### ${headingParts.join(' | ')}`);
    lines.push(`<!-- id:${item.id} -->`);

    if (item.description) {
      lines.push(htmlToMarkdown(item.description));
      lines.push('');
    }

    if (item.location) {
      lines.push(`- **Location**: ${item.location}`);
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
