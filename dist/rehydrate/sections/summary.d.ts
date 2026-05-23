import type { SummarySection } from '../../utils/types.js';
/**
 * Normalise a parsed summary into a `SummarySection`.
 *
 * The input `content` is a raw markdown string accumulated from
 * all tokens between `## Summary` and the next H2 heading.
 * This function converts the markdown to HTML and wraps it in
 * the schema-required shape.
 */
export declare function normalizeSummary(parsed: {
    content: string;
} | null, title?: string): SummarySection;
//# sourceMappingURL=summary.d.ts.map