import { describe, it, expect } from 'vitest';
import { dehydrate } from '../src/dehydrate/index.js';
import { rehydrate } from '../src/rehydrate/index.js';
import { readJsonFile, readTextFile } from '../src/utils/file.js';
import type { ResumeData } from '../src/utils/types.js';

function decodeEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(html: string): string {
  return decodeEntities(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize whitespace differences between actual and expected markdown. */
function normalizeMarkdown(md: string): string {
  return md
    .replace(/^generated: .+$/m, 'generated: IGNORED')
    .replace(/---\n+/g, '---\n')
    .replace(/^- {3,}/gm, '- ')
    .trimEnd() + '\n';
}

function getItems(section: unknown): { id: string; hidden?: boolean }[] {
  return (section as { items: { id: string; hidden?: boolean }[] }).items ?? [];
}

describe('Round-trip: maximal fixture', () => {
  it('dehydrate produces expected markdown', async () => {
    const data = await readJsonFile('tests/fixtures/maximal.json');
    const result = await dehydrate(data, 'maximal.json');
    const expected = await readTextFile('tests/fixtures/maximal.rxresume.md');

    const actualNormalized = normalizeMarkdown(result.markdown);
    const expectedNormalized = normalizeMarkdown(expected);

    expect(actualNormalized).toBe(expectedNormalized);
  });

  it('rehydrate preserves non-content fields (picture, metadata)', async () => {
    const orig = await readJsonFile<ResumeData>('tests/fixtures/maximal.json');
    const result = await rehydrate('tests/fixtures/maximal.rxresume.md', {
      base: 'tests/fixtures/maximal.json',
    });

    expect(result.merged.picture).toEqual(orig.picture);
    expect(result.merged.metadata).toEqual(orig.metadata);
  });

  it('rehydrate preserves IDs and item counts (minus hidden)', async () => {
    const orig = await readJsonFile<ResumeData>('tests/fixtures/maximal.json');
    const result = await rehydrate('tests/fixtures/maximal.rxresume.md', {
      base: 'tests/fixtures/maximal.json',
    });

    const sectionKeys = [
      'profiles', 'experience', 'education', 'projects', 'skills',
      'languages', 'interests', 'awards', 'certifications', 'publications',
      'volunteer', 'references',
    ] as const;

    for (const key of sectionKeys) {
      const origSection = orig.sections[key];
      const mergedSection = result.merged.sections[key];
      const origItems = getItems(origSection).filter((i) => !i.hidden);
      const mergedItems = getItems(mergedSection);

      expect(mergedItems.length).toBe(origItems.length);
      for (let i = 0; i < mergedItems.length; i++) {
        expect(mergedItems[i]!.id).toBe(origItems[i]!.id);
      }
    }
  });

  it('rehydrate preserves content fields semantically', async () => {
    const orig = await readJsonFile<ResumeData>('tests/fixtures/maximal.json');
    const result = await rehydrate('tests/fixtures/maximal.rxresume.md', {
      base: 'tests/fixtures/maximal.json',
    });

    const origExpDesc = orig.sections.experience.items[0]!.description;
    const mergedExpItem = (
      result.merged.sections.experience as unknown as {
        items: { description: string }[];
      }
    ).items[0]!;
    expect(stripHtml(mergedExpItem.description)).toContain(stripHtml(origExpDesc));

    const origEduDesc = orig.sections.education.items[0]!.description;
    const origEduArea = orig.sections.education.items[0]!.area;
    const mergedEduItem = (
      result.merged.sections.education as unknown as {
        items: { description: string; area: string }[];
      }
    ).items[0]!;
    expect(stripHtml(mergedEduItem.description)).toContain(stripHtml(origEduDesc));
    expect(mergedEduItem.area).toBe(origEduArea);

    const mergedProfileItem = (
      result.merged.sections.profiles as unknown as {
        items: { network: string; website: { url: string } }[];
      }
    ).items[0]!;
    expect(mergedProfileItem.network).toBe('GitHub');
    expect(mergedProfileItem.website.url).toBe('https://github.com/alexchen');
  });

  it('all expected sections are present after rehydration', async () => {
    const result = await rehydrate('tests/fixtures/maximal.rxresume.md', {
      base: 'tests/fixtures/maximal.json',
    });

    const expectedSections = [
      'profiles', 'experience', 'education', 'projects', 'skills',
      'languages', 'interests', 'awards', 'certifications', 'publications',
      'volunteer', 'references',
    ];

    for (const key of expectedSections) {
      expect(result.merged.sections).toHaveProperty(key);
    }
  });
});
