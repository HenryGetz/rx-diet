import type { ReferencesSection } from '../../utils/types.js';
/**
 * Serialize the `references` section to markdown.
 *
 * Each reference item produces an H3 heading with the person's name, an
 * identity comment, a definition-list-style block of non-empty contact fields
 * (position, phone, website), and the HTML description converted to markdown.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export declare function serializeReferences(section: ReferencesSection): string;
