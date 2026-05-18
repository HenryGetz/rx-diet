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

    const raw = item as unknown as Record<string, unknown>;
    const school = raw.institution as string ?? item.school ?? '';
    const degree = raw.studyType as string ?? item.degree ?? '';
    const area = raw.area as string ?? item.area ?? '';
    const grade = raw.gpa as string ?? item.grade ?? '';

    const period = item.period ? normalizePeriod(item.period) : '';
    const headingParts = [school, degree, period].filter(
      p => (p ?? '').trim().length > 0,
    );
    if (headingParts.length === 0) continue;

    lines.push(`### ${headingParts.join(' | ')}`);
    lines.push(`<!-- id:${item.id} -->`);

    const metaLines: string[] = [];
    if (area) metaLines.push(`- **Field of Study**: ${area}`);
    if (grade) metaLines.push(`- **GPA**: ${grade.replace(/^GPA\s+/i, '')}`);
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
