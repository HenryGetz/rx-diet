import type { ProfilesSection } from '../../utils/types.js';
/**
 * Serialize the `profiles` section to markdown.
 *
 * Each profile produces one bullet line with a bold network name.  When a url
 * is present the username becomes a link; otherwise it is plain text.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export declare function serializeProfiles(section: ProfilesSection): string;
//# sourceMappingURL=profiles.d.ts.map