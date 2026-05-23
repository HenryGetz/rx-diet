import type { InterestsSection } from '../../utils/types.js';
/**
 * Serialize the `interests` section to markdown.
 *
 * Each interest item produces an H3 heading with its name, an identity
 * comment, and a bullet list of keywords.  Hidden items are skipped.
 * Returns an empty string when no visible items remain.
 */
export declare function serializeInterests(section: InterestsSection): string;
