// ─── Rehydrate Parser Types ────────────────────────────────────────────────
// Intermediate representation produced by the markdown parser before
// normalization into the Reactive Resume schema types.

/**
 * A single parsed entry within a section.
 *
 * - `heading`:          The H3 heading text (e.g. "Engineer | Google | 2020-01—2024-06")
 * - `identityComment`:  UUID extracted from `<!-- id:... -->` or null
 * - `fields`:           Key-value pairs extracted from the markdown
 * - `rawText`:          Full original text of the entry (for inline ID scanning)
 * - `index`:            0-based position of this entry within its section
 */
export interface ParsedEntry {
  heading: string;
  identityComment: string | null;
  fields: Record<string, unknown>;
  rawText: string;
  index: number;
}

/**
 * A parsed section from the markdown body.
 *
 * - `name`:       Section key (e.g. "experience", "education") — normalised
 *                 from the heading text
 * - `heading`:    The raw H2 heading text
 * - `entries`:    The entries belonging to this section
 * - `isCustom`:   True for custom (non-built-in) sections
 * - `customType`: For custom sections, the type field from the RR schema
 */
export interface ParsedSection {
  name: string;
  heading: string;
  entries: ParsedEntry[];
  isCustom: boolean;
  customType?: string;
}

/**
 * The top-level result of `parseRxMarkdown`.
 */
export interface ParseResult {
  /** Parsed basics fields (name, email, phone, location, website, etc.) */
  basics: Record<string, unknown>;
  /** Parsed summary with markdown content, or null if absent */
  summary: { content: string } | null;
  /** All sections in document order */
  sections: ParsedSection[];
}
