import { markdownToHtml } from '../../utils/markdown.js';
import type {
  ExperienceItem,
  EducationItem,
  ProjectItem,
  CertificationItem,
  AwardItem,
  PublicationItem,
  VolunteerItem,
  Website,
} from '../../utils/types.js';
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

/** Convert an entry's description from markdown to HTML. */
function descriptionHtml(entry: ParsedEntry): string {
  const desc = coerceString(entry.fields['description']);
  return desc ? markdownToHtml(desc) : '';
}

// ─── Item builders ────────────────────────────────────────────────────────

function buildExperienceItem(entry: ParsedEntry): ExperienceItem {
  return {
    id: entry.identityComment ?? `exp-${entry.index}`,
    hidden: false,
    company: coerceString(entry.fields['company'] || entry.fields['name']),
    position: coerceString(entry.fields['position']),
    location: coerceString(entry.fields['Location'] ?? ''),
    period: coerceString(entry.fields['period'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildEducationItem(entry: ParsedEntry): EducationItem {
  return {
    id: entry.identityComment ?? `edu-${entry.index}`,
    hidden: false,
    school: coerceString(entry.fields['school'] || entry.fields['name']),
    degree: coerceString(entry.fields['degree'] ?? ''),
    area: coerceString(entry.fields['Area'] ?? ''),
    grade: coerceString(entry.fields['Grade'] ?? ''),
    location: coerceString(entry.fields['Location'] ?? ''),
    period: coerceString(entry.fields['period'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildProjectItem(entry: ParsedEntry): ProjectItem {
  return {
    id: entry.identityComment ?? `proj-${entry.index}`,
    hidden: false,
    name: coerceString(entry.fields['name'] || entry.heading),
    period: coerceString(entry.fields['period'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildCertificationItem(entry: ParsedEntry): CertificationItem {
  return {
    id: entry.identityComment ?? `cert-${entry.index}`,
    hidden: false,
    title: coerceString(entry.fields['title'] || entry.fields['name']),
    issuer: coerceString(entry.fields['issuer'] ?? ''),
    date: coerceString(entry.fields['date'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildAwardItem(entry: ParsedEntry): AwardItem {
  return {
    id: entry.identityComment ?? `award-${entry.index}`,
    hidden: false,
    title: coerceString(entry.fields['title'] || entry.fields['name']),
    awarder: coerceString(entry.fields['awarder'] ?? ''),
    date: coerceString(entry.fields['date'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildPublicationItem(entry: ParsedEntry): PublicationItem {
  return {
    id: entry.identityComment ?? `pub-${entry.index}`,
    hidden: false,
    title: coerceString(entry.fields['title'] || entry.fields['name']),
    publisher: coerceString(entry.fields['publisher'] ?? ''),
    date: coerceString(entry.fields['date'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

function buildVolunteerItem(entry: ParsedEntry): VolunteerItem {
  return {
    id: entry.identityComment ?? `vol-${entry.index}`,
    hidden: false,
    organization: coerceString(entry.fields['organization'] || entry.fields['name']),
    position: coerceString(entry.fields['position'] ?? ''),
    location: coerceString(entry.fields['Location'] ?? ''),
    period: coerceString(entry.fields['period'] ?? ''),
    website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
    description: descriptionHtml(entry),
  };
}

// ─── Builder registry ─────────────────────────────────────────────────────

type ItemBuilder = (entry: ParsedEntry) => Record<string, unknown>;

const BUILDERS: Record<string, ItemBuilder> = {
  experience: buildExperienceItem as unknown as ItemBuilder,
  education: buildEducationItem as unknown as ItemBuilder,
  projects: buildProjectItem as unknown as ItemBuilder,
  certifications: buildCertificationItem as unknown as ItemBuilder,
  awards: buildAwardItem as unknown as ItemBuilder,
  publications: buildPublicationItem as unknown as ItemBuilder,
  volunteer: buildVolunteerItem as unknown as ItemBuilder,
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Normalise all entries in a standard section (experience, education,
 * projects, certifications, awards, publications, volunteer) into typed
 * items matching the RR schema.
 *
 * Returns an array of item objects, or an empty array if the section
 * name is not recognised as a standard section.
 */
export function normalizeStandardSection(section: ParsedSection): Record<string, unknown>[] {
  const builder = BUILDERS[section.name];
  if (!builder) return [];
  return section.entries.map(entry => builder(entry));
}
