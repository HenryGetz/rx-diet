import { htmlToMarkdown } from '../../utils/markdown.js';
import type { SummarySection } from '../../utils/types.js';

export function serializeSummary(summary: SummarySection): string {
  if (!summary?.content?.trim()) {
    return '';
  }

  const content = htmlToMarkdown(summary.content);
  if (!content?.trim()) {
    return '';
  }

  return `## Summary\n\n${content}`;
}
