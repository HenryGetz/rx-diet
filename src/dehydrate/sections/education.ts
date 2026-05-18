import { htmlToMarkdown } from '../../utils/markdown.js';
import { normalizePeriod } from './helpers.js';
import type { EducationSection } from '../../utils/types.js';

export function serializeEducation(section: EducationSection): string {
  if (section.items.length === 0) return '';

  const lines: string[] = [];
  lines.push(`## ${section.title || 'Education'}`);
  lines.push('');

  for (const item of section.items) {
    if (item.hidden) continue;

    const period = item.period ? normalizePeriod(item.period) : '';
    const headingParts = [(item.school ?? ''), (item.degree ?? ''), period].filter(
      p => (p ?? '').trim().length > 0,
    );
    if (headingParts.length === 0) continue;

    lines.push(`### ${headingParts.join(' | ')}`);
    lines.push(`<!-- id:${item.id} -->`);

    const metaLines: string[] = [];
    if (item.area) metaLines.push(`- **Field of Study**: ${item.area}`);
    if (item.grade) metaLines.push(`- **GPA**: ${item.grade.replace(/^GPA\s+/i, '')}`);
    if (metaLines.length > 0) {
      lines.push(...metaLines);
      lines.push('');
    }

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
