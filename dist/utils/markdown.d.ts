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
export declare function htmlToMarkdown(html: string): string;
/**
 * Convert Markdown to HTML.
 *
 * If the entire input is a fenced ```html block, the inner HTML is passed
 * through raw (no markdown processing). Otherwise, the input is parsed as
 * standard GFM markdown via marked.
 */
export declare function markdownToHtml(md: string): string;
/**
 * Normalize HTML for comparison (used in round-trip property tests).
 *
 * Strips insignificant whitespace between tags so that semantically
 * equivalent HTML documents can be compared string-for-string.
 */
export declare function normalizeHtml(html: string): string;
//# sourceMappingURL=markdown.d.ts.map