import { createHash } from 'node:crypto';

/**
 * Create a content fingerprint for fuzzy identity matching.
 *
 * Takes key identifying fields, normalizes them (lowercase, trimmed,
 * whitespace-collapsed), concatenates in deterministic key-sorted order,
 * and returns the first 12 hex characters of the SHA-256 hash.
 */
export function contentFingerprint(
  fields: Record<string, string | undefined>,
): string {
  const keys = Object.keys(fields).sort();
  const parts: string[] = [];

  for (const key of keys) {
    const value = fields[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      parts.push(value.trim());
    }
  }

  const normalized = parts
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

export function fingerprintMatch(a: string, b: string): boolean {
  return a === b;
}

/**
 * Build a normalized content key for a specific resume section type.
 *
 * Extracts the relevant identifying fields from a section item based on
 * the section type, concatenating them into a single string suitable for
 * matching against external data or detecting duplicate entries.
 */
export function buildContentKey(
  sectionType: string,
  item: Record<string, unknown>,
): string {
  const field = (key: string): string | undefined => {
    const v = item[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return String(v);
    }
    return undefined;
  };

  switch (sectionType) {
    case 'experience': {
      const company = field('company') ?? '';
      const position = field('position') ?? extractPosition(item);
      return `${company} ${position}`.trim();
    }
    case 'education': {
      const school = field('school') ?? '';
      const degree = field('degree') ?? '';
      return `${school} ${degree}`.trim();
    }
    case 'projects':
      return field('name') ?? '';
    case 'certifications': {
      const title = field('title') ?? '';
      const issuer = field('issuer') ?? '';
      return `${title} ${issuer}`.trim();
    }
    case 'awards': {
      const title = field('title') ?? '';
      const awarder = field('awarder') ?? '';
      return `${title} ${awarder}`.trim();
    }
    case 'publications': {
      const title = field('title') ?? '';
      const publisher = field('publisher') ?? '';
      return `${title} ${publisher}`.trim();
    }
    case 'volunteer': {
      const org = field('organization') ?? '';
      const pos = field('position') ?? '';
      return `${org} ${pos}`.trim();
    }
    case 'references':
      return field('name') ?? '';
    case 'skills':
      return field('name') ?? '';
    case 'languages':
      return field('language') ?? '';
    case 'interests':
      return field('name') ?? '';
    case 'profiles': {
      const network = field('network') ?? '';
      const username = field('username') ?? '';
      return `${network} ${username}`.trim();
    }
    default:
      return '';
  }
}

function extractPosition(item: Record<string, unknown>): string {
  const roles = item['roles'];
  if (Array.isArray(roles) && roles.length > 0) {
    const firstRole = roles[0];
    if (firstRole !== null && typeof firstRole === 'object' && !Array.isArray(firstRole)) {
      const position = (firstRole as Record<string, unknown>)['position'];
      if (typeof position === 'string') {
        return position;
      }
    }
  }
  return '';
}
