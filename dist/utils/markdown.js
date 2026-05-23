import TurndownService from 'turndown';
import { marked } from 'marked';
const turndown = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
});
/**
 * Convert HTML to Markdown.
 *
 * The common HTML subset that converts cleanly:
 * <p>, <strong>/<b>, <em>/<i>, <a href>, <ul>/<ol>/<li>, <br>
 *
 * When exotic HTML (div, span, table, img, or any tag with style/class/data-
 * attributes) remains after conversion, the original HTML is wrapped in a
 * fenced ```html block as an escape hatch.
 */
export function htmlToMarkdown(html) {
    if (!html.trim())
        return '';
    const md = turndown.turndown(html);
    // After conversion, detect non-trivial HTML tags that turndown preserved
    // as raw HTML (i.e. tags not covered by turndown's built-in rules).
    const exoticTagRegex = /<(div|span|table|thead|tbody|tr|th|td|img|video|audio|canvas|svg|figure|figcaption|details|summary|nav|header|footer|section|article|aside)\b[^>]*>/i;
    const styledTagRegex = /<[a-z][a-z0-9]*\b[^>]*(?:style|class|data-)\s*=/i;
    // Normalize bullet spacing: turndown sometimes produces "-   " (3 spaces)
    // for nested lists. Collapse to single space.
    const normalized = md.replace(/^(\s*[-*+])\s{2,}/gm, '$1 ');
    if (exoticTagRegex.test(normalized) || styledTagRegex.test(normalized)) {
        return `\`\`\`html\n${html}\n\`\`\``;
    }
    return normalized;
}
/**
 * Convert Markdown to HTML.
 *
 * If the entire input is a fenced ```html block, the inner HTML is passed
 * through raw (no markdown processing). Otherwise, the input is parsed as
 * standard GFM markdown via marked.
 */
export function markdownToHtml(md) {
    const trimmed = md.trim();
    const entireHtmlBlock = /^```html\n([\s\S]*?)```$/;
    const match = trimmed.match(entireHtmlBlock);
    if (match) {
        return match[1].trim();
    }
    return marked.parse(md, { gfm: true, breaks: false, async: false });
}
/**
 * Normalize HTML for comparison (used in round-trip property tests).
 *
 * Strips insignificant whitespace between tags so that semantically
 * equivalent HTML documents can be compared string-for-string.
 */
export function normalizeHtml(html) {
    return html
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .replace(/>\s+/g, '>')
        .replace(/\s+</g, '<')
        .trim();
}
//# sourceMappingURL=markdown.js.map