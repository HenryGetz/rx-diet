import { htmlToMarkdown } from '../../utils/markdown.js';
export function serializeSummary(summary) {
    if (!summary?.content?.trim()) {
        return '';
    }
    const content = htmlToMarkdown(summary.content);
    if (!content?.trim()) {
        return '';
    }
    return `## Summary\n\n${content}`;
}
