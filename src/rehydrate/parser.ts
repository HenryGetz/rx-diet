import { markdownToHtml } from '../utils/markdown.js';
import type { ParseResult, ParsedSection, ParsedEntry } from './types.js';

// ─── Section heading normalisation ──────────────────────────────────────

const HEADING_TO_KEY: Record<string, string> = {
  profiles: 'profiles',
  social: 'profiles',
  links: 'profiles',
  experience: 'experience',
  employment: 'experience',
  work: 'experience',
  education: 'education',
  projects: 'projects',
  skills: 'skills',
  languages: 'languages',
  interests: 'interests',
  awards: 'awards',
  certifications: 'certifications',
  publications: 'publications',
  volunteer: 'volunteer',
  service: 'volunteer',
  community: 'volunteer',
  references: 'references',
};

const SECTION_KEYS = new Set(Object.values(HEADING_TO_KEY));

function normaliseSectionName(heading: string): string {
  const lower = heading.trim().toLowerCase().replace(/\s+/g, '');
  return HEADING_TO_KEY[lower] ?? heading.trim();
}

// ─── Markdown helpers ───────────────────────────────────────────────────

const INLINE_ID_RE = /<!--\s*id:\s*([a-zA-Z0-9_-]+)\s*-->/;
const LINK_RE = /- \*\*(?:Link|Website)\*\*:\s*\[([^\]]*)\]\(([^)]*)\)/;

function extractIdentityComment(text: string): string | null {
  const match = text.match(INLINE_ID_RE);
  return match?.[1] ?? null;
}

function extractBasicFields(rawText: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const lines = rawText.split('\n');

  const linkMatch = rawText.match(LINK_RE);
  if (linkMatch) {
    fields.website = { label: linkMatch[1] ?? '', url: linkMatch[2] ?? '' };
  }

  const bodyLines = lines.filter((l) => {
    const t = l.trim();
    return (
      !t.startsWith('<!--') &&
      !t.startsWith('- **Link**:') &&
      !t.startsWith('- **Website**:') &&
      t.length > 0
    );
  });

  if (bodyLines.length > 0) {
    fields.description = bodyLines.join('\n');
  }

  return fields;
}

function extractHeadingParts(headingText: string): string[] {
  return headingText
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
}

// ─── Frontmatter stripping ──────────────────────────────────────────────

function stripFrontmatter(md: string): string {
  if (!md.startsWith('---\n')) return md;
  const end = md.indexOf('\n---', 4);
  if (end === -1) return md;
  const rest = md.slice(end + 4);
  return rest.startsWith('\n') ? rest.slice(1) : rest;
}

// ─── Basics / Summary extraction ────────────────────────────────────────

function extractBasics(body: string): Record<string, unknown> {
  const basics: Record<string, unknown> = {};
  const firstSection = body.search(/\n## /);
  const preamble = firstSection === -1 ? body : body.slice(0, firstSection);

  for (const line of preamble.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key && value) {
      basics[key] = value;
    }
  }

  return basics;
}

function extractSummary(sections: ParsedSection[]): { content: string } | null {
  const summarySection = sections.find(
    (s) => s.name === 'summary' || s.heading.toLowerCase() === 'summary',
  );
  if (!summarySection || summarySection.entries.length === 0) return null;
  const desc = summarySection.entries[0]?.fields.description;
  return desc && typeof desc === 'string' ? { content: desc } : null;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function parseRxMarkdown(mdContent: string): { result: ParseResult } {
  const body = stripFrontmatter(mdContent);
  const sections: ParsedSection[] = [];

  const rawParts = body.split(/\n(?=## )/);

  for (const raw of rawParts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^##\s+(.+)/);
    if (!sectionMatch) continue;

    const rawHeading = sectionMatch[1]!.trim();
    const sectionName = normaliseSectionName(rawHeading);
    const isCustom = !SECTION_KEYS.has(sectionName);
    const rest = trimmed.slice(sectionMatch[0].length).trim();

    const entryParts = rest ? rest.split(/\n(?=### )/) : [];
    const entries: ParsedEntry[] = [];

    for (let i = 0; i < entryParts.length; i++) {
      const text = entryParts[i]!.trim();
      if (!text) continue;

      const headingMatch = text.match(/^###\s+(.+)/m);
      if (!headingMatch) continue;
      
      const heading = headingMatch[1]?.trim() ?? '';
      const headingParts = heading ? extractHeadingParts(heading) : [];

      const fields = extractBasicFields(text);
      if (headingParts.length > 0) {
        fields._headingParts = headingParts;
      }

      entries.push({
        heading,
        identityComment: extractIdentityComment(text),
        rawText: text,
        index: entries.length,
        fields,
      });
    }

    if (entries.length === 0 && rest) {
      const bulletLines = rest
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('- ') || l.startsWith('* '));
      
      for (let i = 0; i < bulletLines.length; i++) {
        const line = bulletLines[i]!;
        const content = line.slice(2);
        const boldMatch = content.match(/^\*\*(.+?)\*\*:\s*(.+)/);
        const restContent = boldMatch ? boldMatch[2] ?? '' : content;
        const levelMatch = restContent.match(/\(L(\d)\)/) || restContent.match(/(\d)\/5\)/);
        
        entries.push({
          heading: content,
          identityComment: null,
          rawText: line,
          index: i,
          fields: { 
            _bulletText: content,
            ...(boldMatch ? { _boldKey: boldMatch[1], _boldValue: restContent } : {}),
            ...(levelMatch ? { _level: parseInt(levelMatch[1]!, 10) } : {}),
          },
        });
      }
    }

    sections.push({
      name: sectionName,
      heading: rawHeading,
      entries,
      isCustom,
    });
  }

  const basics = extractBasics(body);
  const summary = extractSummary(sections);
  const filteredSections = sections.filter(
    (s) => s.name !== 'summary' && s.heading.toLowerCase() !== 'summary',
  );

  return {
    result: {
      basics,
      summary,
      sections: filteredSections,
    },
  };
}

export function convertEntryFieldsToHtml(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const htmlFields = new Set(['description', 'content', 'summary']);

  for (const [key, value] of Object.entries(fields)) {
    if (htmlFields.has(key) && typeof value === 'string' && value.length > 0) {
      try {
        result[key] = markdownToHtml(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
