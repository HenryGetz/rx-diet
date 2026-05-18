import { markdownToHtml } from '../../utils/markdown.js';
import type { ReferenceItem, Website } from '../../utils/types.js';
import type { ParsedSection, ParsedEntry } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function makeWebsite(url: unknown, label: unknown): Website {
  return {
    url: coerceString(url),
    label: coerceString(label),
  };
}

// ─── References ───────────────────────────────────────────────────────────
// Grammar:
//   ### {name}
//   <!-- id:{id} -->
//   - **Position**: {position}
//   - **Phone**: {phone}
//   - **Link**: [{label}]({url})
//   {description}

function parseReferenceItem(entry: ParsedEntry): ReferenceItem {
  const name = entry.heading;
  const desc = coerceString(entry.fields['description']);

  return {
    id: entry.identityComment ?? `ref-${entry.index}`,
    hidden: false,
    name,
    position: coerceString(entry.fields['Position'] ?? ''),
    phone: coerceString(entry.fields['Phone'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: desc ? markdownToHtml(desc) : '',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Normalise a references section into typed `ReferenceItem` objects
 * matching the RR schema.
 */
export function normalizeReferences(section: ParsedSection): ReferenceItem[] {
  return section.entries.map(entry => parseReferenceItem(entry));
}
