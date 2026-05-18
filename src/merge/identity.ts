import type { RxFrontmatter, SectionName } from '../utils/types.js';
import { contentFingerprint, fingerprintMatch } from '../utils/hash.js';

// ─── Identity Resolution Result ─────────────────────────────────────────

export type IdentityResolution =
  | { resolved: true; id: string; tier: 'inline' | 'id_map' | 'fuzzy' }
  | { resolved: false; reason: string };

// ─── Tier 1: Inline Comment ─────────────────────────────────────────────

const INLINE_ID_RE = /<!--\s*id:\s*([a-zA-Z0-9_-]+)\s*-->/;

/**
 * Parse an inline `<!-- id:<uuid> -->` comment from a single line.
 * Returns the UUID or null if no match.
 */
export function parseInlineId(line: string): string | null {
  const match = line.match(INLINE_ID_RE);
  return match?.[1] ?? null;
}

/**
 * Tier 1: Resolve by inline comment.
 * Searches the entire entry text for `<!-- id:UUID -->`.
 */
export function resolveByInline(entryText: string): string | null {
  const match = entryText.match(INLINE_ID_RE);
  return match?.[1] ?? null;
}

// ─── Tier 2: Frontmatter id_map ─────────────────────────────────────────

/**
 * Tier 2: Resolve by frontmatter id_map.
 * Looks up `sections.{sectionName}.{index}` in the frontmatter's id_map.
 */
export function resolveByIdMap(
  fm: RxFrontmatter,
  sectionName: SectionName,
  index: number,
): string | null {
  const path = `sections.${sectionName}.${index}`;
  return fm.id_map?.[path] ?? null;
}

// ─── Tier 3: Content-Hash Fuzzy Match ────────────────────────────────────

/**
 * Extract string-typed (or string-coercible) fields from a base item
 * for fingerprint comparison. Nested objects (e.g. `website`) are
 * skipped because they are not part of the identifying content.
 */
function extractStringFields(item: Record<string, unknown>): Record<string, string | undefined> {
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string') {
      fields[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      fields[key] = String(value);
    }
    // Skip arrays, objects, null, undefined
  }
  return fields;
}

/**
 * Tier 3: Resolve by content-hash fuzzy match.
 *
 * Computes a fingerprint from the markdown entry's fields and compares
 * against fingerprints of each base item. Returns the id of the first
 * exact fingerprint match, or null if none found.
 */
export function resolveByFuzzy<T extends { id: string }>(
  sectionType: string,
  markdownFields: Record<string, string | undefined>,
  baseItems: T[],
): string | null {
  const mdFingerprint = contentFingerprint(markdownFields);

  for (const item of baseItems) {
    const itemFields = extractStringFields(item as unknown as Record<string, unknown>);
    const itemFingerprint = contentFingerprint(itemFields);

    if (fingerprintMatch(mdFingerprint, itemFingerprint)) {
      return item.id;
    }
  }

  return null;
}

// ─── Three-Tier Resolution Orchestrator ─────────────────────────────────

/**
 * Full three-tier identity resolution for a single entry.
 *
 *  1. Inline comment  (`<!-- id:UUID -->`)
 *  2. Frontmatter id_map (`sections.{sectionName}.{index}`)
 *  3. Content-hash fuzzy match
 *
 * Each tier verifies the resolved id exists in baseItems before returning.
 */
export function resolveIdentity<T extends { id: string }>(
  entryText: string,
  fm: RxFrontmatter,
  sectionName: SectionName,
  index: number,
  sectionType: string,
  markdownFields: Record<string, string | undefined>,
  baseItems: T[],
): IdentityResolution {
  // ── Tier 1: inline comment ──────────────────────────────────────────
  const inlineId = resolveByInline(entryText);
  if (inlineId) {
    const found = baseItems.find((item) => item.id === inlineId);
    if (found) {
      return { resolved: true, id: inlineId, tier: 'inline' };
    }
  }

  // ── Tier 2: id_map ──────────────────────────────────────────────────
  const mapId = resolveByIdMap(fm, sectionName, index);
  if (mapId) {
    const found = baseItems.find((item) => item.id === mapId);
    if (found) {
      return { resolved: true, id: mapId, tier: 'id_map' };
    }
  }

  // ── Tier 3: fuzzy match ─────────────────────────────────────────────
  const fuzzyId = resolveByFuzzy(sectionType, markdownFields, baseItems);
  if (fuzzyId) {
    return { resolved: true, id: fuzzyId, tier: 'fuzzy' };
  }

  return { resolved: false, reason: 'No matching entry found in base JSON' };
}
