// ─── Languages section serializer ────────────────────────────────────────────
// Serializes the `languages` section to markdown.
//
// Grammar:
//   ## Languages
//
//   - **{language}**: {fluency} (L{level})

import type { LanguagesSection } from '../../utils/types.js';

/**
 * Serialize the `languages` section to markdown.
 *
 * Each language appears on one bullet line with a bold language name, fluency
 * text, and numeric level in parentheses.  Hidden items are skipped.
 * Returns an empty string when no visible items remain.
 */
export function serializeLanguages(section: LanguagesSection): string {
  const visible = section.items.filter((item) => !item.hidden);
  if (visible.length === 0) return '';

  const lines = visible.map(
    (item) => `- **${item.language}**: ${item.fluency} (${item.level}/5)`,
  );

  return `## ${section.title || 'Languages'}\n\n${lines.join('\n')}`;
}
