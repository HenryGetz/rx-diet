import type { ResumeData, BaseItem, Sections } from '../utils/types.js';
import type { DiffResult, SectionDiff, EntryDiff, ChangeType } from './types.js';
import { DIFF_CHANGES, DIFF_NO_CHANGES } from './types.js';

// ─── Section configuration ─────────────────────────────────────────────────

interface SectionConfig {
  key: keyof Sections;
  label: string;
  getLabel: (item: BaseItem) => string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'profiles', label: 'Profiles', getLabel: (i) => (i as unknown as { network: string }).network },
  { key: 'experience', label: 'Experience', getLabel: (i) => (i as unknown as { company: string }).company },
  { key: 'education', label: 'Education', getLabel: (i) => (i as unknown as { school: string }).school },
  { key: 'projects', label: 'Projects', getLabel: (i) => (i as unknown as { name: string }).name },
  { key: 'skills', label: 'Skills', getLabel: (i) => (i as unknown as { name: string }).name },
  { key: 'languages', label: 'Languages', getLabel: (i) => (i as unknown as { language: string }).language },
  { key: 'interests', label: 'Interests', getLabel: (i) => (i as unknown as { name: string }).name },
  { key: 'awards', label: 'Awards', getLabel: (i) => (i as unknown as { title: string }).title },
  { key: 'certifications', label: 'Certifications', getLabel: (i) => (i as unknown as { title: string }).title },
  { key: 'publications', label: 'Publications', getLabel: (i) => (i as unknown as { title: string }).title },
  { key: 'volunteer', label: 'Volunteer', getLabel: (i) => (i as unknown as { organization: string }).organization },
  { key: 'references', label: 'References', getLabel: (i) => (i as unknown as { name: string }).name },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function countBullets(html: string): number {
  const matches = html.match(/<li[^>]*>/gi);
  return matches ? matches.length : 0;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasDescription(item: BaseItem): item is BaseItem & { description: string } {
  return 'description' in item && typeof (item as Record<string, unknown>).description === 'string';
}

function hasRoles(item: BaseItem): item is BaseItem & { roles: unknown[] } {
  return 'roles' in item && Array.isArray((item as Record<string, unknown>).roles);
}

function itemFingerprint(item: BaseItem): string {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id' || key === 'hidden') continue;
    copy[key] = value;
  }
  return JSON.stringify(copy);
}

function diffItems(
  baseItems: BaseItem[],
  updatedItems: BaseItem[],
  getLabel: (item: BaseItem) => string,
): EntryDiff[] {
  const entries: EntryDiff[] = [];
  const baseMap = new Map<string, BaseItem>();
  const updatedMap = new Map<string, BaseItem>();

  for (const item of baseItems) {
    baseMap.set(item.id, item);
  }
  for (const item of updatedItems) {
    updatedMap.set(item.id, item);
  }

  for (const item of baseItems) {
    if (!updatedMap.has(item.id)) {
      entries.push({
        index: entries.length,
        type: 'removed',
        id: item.id,
        label: getLabel(item),
        details: ['removed'],
      });
    }
  }

  for (const item of updatedItems) {
    const base = baseMap.get(item.id);
    if (!base) {
      entries.push({
        index: entries.length,
        type: 'added',
        id: item.id,
        label: getLabel(item),
        details: ['new entry'],
      });
    } else if (itemFingerprint(base) !== itemFingerprint(item)) {
      entries.push({
        index: entries.length,
        type: 'modified',
        id: item.id,
        label: getLabel(item),
        details: buildModificationDetails(base, item),
      });
    }
  }

  entries.sort((a, b) => {
    const order: Record<ChangeType, number> = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    return order[a.type] - order[b.type];
  });

  for (let i = 0; i < entries.length; i++) {
    entries[i]!.index = i;
  }

  return entries;
}

function buildModificationDetails(base: BaseItem, updated: BaseItem): string[] {
  const details: string[] = [];

  if (hasDescription(base) && hasDescription(updated)) {
    const baseBullets = countBullets(base.description);
    const updatedBullets = countBullets(updated.description);
    const baseWords = countWords(base.description);
    const updatedWords = countWords(updated.description);

    if (baseBullets !== updatedBullets) {
      details.push(`modified description (${baseBullets} → ${updatedBullets} bullets)`);
    } else if (baseWords !== updatedWords) {
      details.push(`modified description (${baseWords} → ${updatedWords} words)`);
    }
  }

  if (hasRoles(base) && hasRoles(updated)) {
    const baseRoles = base.roles.length;
    const updatedRoles = updated.roles.length;
    if (baseRoles !== updatedRoles) {
      details.push(`roles (${baseRoles} → ${updatedRoles})`);
    }
  }

  return details;
}

function diffSummary(base: ResumeData, updated: ResumeData): EntryDiff[] {
  const baseContent = base.summary.content ?? '';
  const updatedContent = updated.summary.content ?? '';
  const baseWc = countWords(baseContent);
  const updatedWc = countWords(updatedContent);

  if (baseWc === updatedWc) {
    return [];
  }

  return [
    {
      index: 0,
      type: 'modified',
      label: 'Summary',
      details: [`modified (${baseWc} → ${updatedWc} words)`],
    },
  ];
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Compute a semantic diff between a base resume and a rehydrated resume.
 * Operates at the section/entry level.
 *
 * For each section:
 *   - Compare item counts and identities
 *   - Detect adds, removes, modifications
 *   - For modifications, identify what specifically changed (description length, bullet count, etc.)
 */
export function computeDiff(base: ResumeData, updated: ResumeData): DiffResult {
  const changes: SectionDiff[] = [];
  let hasChanges = false;

  const summaryEntries = diffSummary(base, updated);
  if (summaryEntries.length > 0) {
    hasChanges = true;
    changes.push({
      section: 'Summary',
      type: 'modified',
      entries: summaryEntries,
    });
  }

  for (const config of SECTION_CONFIGS) {
    const baseSection = base.sections[config.key];
    const updatedSection = updated.sections[config.key];

    if (!baseSection || !updatedSection) continue;

    const baseItems = (baseSection as unknown as { items: BaseItem[] }).items ?? [];
    const updatedItems = (updatedSection as unknown as { items: BaseItem[] }).items ?? [];

    const entries = diffItems(baseItems, updatedItems, config.getLabel);

    if (entries.length > 0) {
      hasChanges = true;
      const allSameType = entries.every((e) => e.type === entries[0]!.type);
      const sectionType: ChangeType = allSameType ? entries[0]!.type : 'modified';
      changes.push({ section: config.label, type: sectionType, entries });
    }
  }

  return { changes, hasChanges };
}

export function getExitCode(result: DiffResult): number {
  if (result.error) return 2;
  return result.hasChanges ? DIFF_CHANGES : DIFF_NO_CHANGES;
}
