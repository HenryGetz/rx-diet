import type { SkillsSection } from '../../utils/types.js';
/**
 * Serialize the `skills` section to markdown.
 *
 * Each skill is emitted on one bullet line.  If `keywords` is non-empty,
 * a spaced em-dash separates the level from the keywords list.
 * Hidden items are skipped.  Returns an empty string when no visible items
 * remain.
 */
export declare function serializeSkills(section: SkillsSection): string;
//# sourceMappingURL=skills.d.ts.map