import type { LanguagesSection } from '../../utils/types.js';
/**
 * Serialize the `languages` section to markdown.
 *
 * Each language appears on one bullet line with a bold language name, fluency
 * text, and numeric level in parentheses.  Hidden items are skipped.
 * Returns an empty string when no visible items remain.
 */
export declare function serializeLanguages(section: LanguagesSection): string;
//# sourceMappingURL=languages.d.ts.map