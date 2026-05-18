import { htmlToMarkdown } from '../../utils/markdown.js';
import { normalizePeriod } from './helpers.js';
import type { ExperienceSection } from '../../utils/types.js';

export function serializeExperience(section: ExperienceSection): string {
  if (section.items.length === 0) return '';

  const lines: string[] = [];
  lines.push(`## ${section.title || 'Experience'}`);
  lines.push('');

  for (const item of section.items) {
    if (item.hidden) continue;

    const period = item.period ? normalizePeriod(item.period) : '';
    const headingParts = [item.position, item.company, period].filter(
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

    if (item.roles && item.roles.length > 0) {
      for (const role of item.roles) {
        const rolePeriod = role.period ? normalizePeriod(role.period) : '';
        const roleLabel = rolePeriod
          ? `**${role.position}** (${rolePeriod})`
          : `**${role.position}**`;
        lines.push(roleLabel);
        if (role.description) {
          lines.push(htmlToMarkdown(role.description));
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}
