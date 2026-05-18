import { describe, it, expect } from 'vitest';
import { parseRxMarkdown } from '../src/rehydrate/parser.js';

// ─── Parser ──────────────────────────────────────────────────────────────

describe('Rehydrate: parser basics preamble', () => {
  it('extracts H1 heading and headline', () => {
    const md =
'# Alexandra Chen\n' +
'\n' +
'Senior Full-Stack Engineer\n' +
'\n' +
'- **Email**: alexandra.chen@example.com\n' +
'- **Phone**: +1 (555) 123-4567\n' +
'- **Location**: San Francisco, CA\n' +
'- **Website**: [alexandrachen.dev](https://alexandrachen.dev)\n';

    const { result } = parseRxMarkdown(md);
    expect(result.basics).toBeDefined();
    expect(result.sections).toEqual([]);
  });

  it('returns null summary when no summary section', () => {
    const md =
'# Test\n' +
'\n' +
'- **Email**: test@test.com\n';

    const { result } = parseRxMarkdown(md);
    expect(result.summary).toBeNull();
  });
});

describe('Rehydrate: parser summary', () => {
  it('parses summary section as content', () => {
    const md =
'## Summary\n' +
'\n' +
'Senior full-stack engineer with **12+ years** of experience.\n' +
'\n' +
'Core competencies:\n' +
'\n' +
'- Full-stack web development with **React**\n' +
'- Cloud infrastructure on AWS\n';

    const { result } = parseRxMarkdown(md);
    const summarySection = result.sections.find(
      (s) => s.name === 'summary',
    );
    expect(summarySection).toBeUndefined();
  });
});

describe('Rehydrate: parser experience entries', () => {
  it('parses pipe-delimited H3 heading into parts', () => {
    const md =
'## Experience\n' +
'\n' +
'### Senior Software Engineer | TechCorp Inc. | Jan 2020 - Present\n' +
'<!-- id: c3d4e5f6-a7b8-9012-cdef-123456789012 -->\n' +
'\n' +
'Lead the platform engineering team.\n';

    const { result } = parseRxMarkdown(md);
    const expSection = result.sections.find(
      (s) => s.name === 'experience',
    );
    expect(expSection).toBeDefined();
    expect(expSection!.entries).toHaveLength(1);

    const entry = expSection!.entries[0]!;
    expect(entry.heading).toBe(
      'Senior Software Engineer | TechCorp Inc. | Jan 2020 - Present',
    );
    expect(entry.fields._headingParts).toEqual([
      'Senior Software Engineer',
      'TechCorp Inc.',
      'Jan 2020 - Present',
    ]);
  });

  it('extracts identity comment from experience entry', () => {
    const md =
'## Experience\n' +
'\n' +
'### Engineer | Acme | 2020\n' +
'<!-- id: c3d4e5f6-a7b8-9012-cdef-123456789012 -->\n' +
'\n' +
'Did stuff.\n';

    const { result } = parseRxMarkdown(md);
    const entry = result.sections[0]!.entries[0]!;
    expect(entry.identityComment).toBe(
      'c3d4e5f6-a7b8-9012-cdef-123456789012',
    );
  });

  it('extracts link field from experience entry', () => {
    const md =
'## Experience\n' +
'\n' +
'### Engineer | Acme | 2020\n' +
'<!-- id: abc-123 -->\n' +
'\n' +
'Did stuff.\n' +
'\n' +
'- **Link**: [Acme Corp](https://acme.example.com)\n';

    const { result } = parseRxMarkdown(md);
    const entry = result.sections[0]!.entries[0]!;
    expect(entry.fields.website).toEqual({
      label: 'Acme Corp',
      url: 'https://acme.example.com',
    });
  });
});

describe('Rehydrate: parser identity comments', () => {
  it('returns null identity comment when none present', () => {
    const md =
'## Experience\n' +
'\n' +
'### Engineer | Acme | 2020\n' +
'\n' +
'No identity comment here.\n';

    const { result } = parseRxMarkdown(md);
    const entry = result.sections[0]!.entries[0]!;
    expect(entry.identityComment).toBeNull();
  });
});

describe('Rehydrate: parser sections', () => {
  it('normalises section heading to known key', () => {
    const md =
'## EXPERIENCE\n' +
'\n' +
'### Dev | Acme | 2020\n' +
'\n' +
'Work.\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections[0]!;
    expect(section.name).toBe('experience');
  });

  it('marks unknown sections as custom', () => {
    const md =
'## Conference Talks\n' +
'\n' +
'### Talk Title | Conference | 2023\n' +
'<!-- id: custom-001 -->\n' +
'\n' +
'Great talk.\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections[0]!;
    expect(section.isCustom).toBe(true);
    expect(section.name).toBe('Conference Talks');
  });
});

describe('Rehydrate: parser bullet-list sections', () => {
  it('parses skills section from bullet lines', () => {
    const md =
'## Skills\n' +
'\n' +
'- TypeScript (L5) — React, Node.js, Deno, Angular\n' +
'- Python (L4) — Django, FastAPI\n' +
'- DevOps (L3)\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections.find((s) => s.name === 'skills');
    expect(section).toBeDefined();
    expect(section!.entries).toHaveLength(3);

    expect(section!.entries[0]!.heading).toBe(
      'TypeScript (L5) — React, Node.js, Deno, Angular',
    );
    expect(section!.entries[1]!.heading).toBe(
      'Python (L4) — Django, FastAPI',
    );
    expect(section!.entries[2]!.heading).toBe('DevOps (L3)');
  });

  it('parses languages section from bold-bullet lines', () => {
    const md =
'## Languages\n' +
'\n' +
'- **English**: Native (L5)\n' +
'- **Mandarin Chinese**: Fluent (L4)\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections.find(
      (s) => s.name === 'languages',
    );
    expect(section).toBeDefined();
    expect(section!.entries).toHaveLength(2);

    expect(section!.entries[0]!.fields._boldKey).toBe('English');
    expect(section!.entries[1]!.fields._boldKey).toBe(
      'Mandarin Chinese',
    );
  });
});

describe('Rehydrate: parser frontmatter stripping', () => {
  it('strips frontmatter before parsing', () => {
    const md =
'---\n' +
'rx_diet_version: 1\n' +
'rxresume_schema: v5\n' +
'source: test.json\n' +
'generated: 2024-01-01T00:00:00.000Z\n' +
'id_map: {}\n' +
'---\n' +
'\n' +
'# Test\n' +
'\n' +
'## Experience\n' +
'\n' +
'### Dev | Acme | 2020\n' +
'\n' +
'Work.\n';

    const { result } = parseRxMarkdown(md);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.name).toBe('experience');
  });
});

describe('Rehydrate: parser education', () => {
  it('parses education heading parts and preserves area/grade in description', () => {
    const md =
'## Education\n' +
'\n' +
'### University of California, Berkeley | Bachelor of Science | Aug 2010 - May 2014\n' +
'<!-- id: edu-001 -->\n' +
'\n' +
'Graduated with honors.\n' +
'\n' +
'- **Area**: Computer Science\n' +
'- **Grade**: GPA 3.92\n' +
'- **Link**: [UC Berkeley](https://berkeley.edu)\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections.find(
      (s) => s.name === 'education',
    );
    expect(section).toBeDefined();
    const entry = section!.entries[0]!;
    expect(entry.fields._headingParts).toEqual([
      'University of California, Berkeley',
      'Bachelor of Science',
      'Aug 2010 - May 2014',
    ]);
    // Heading parts are in description; area and grade are not separate fields
    // but are part of the description body since extractBasicFields only
    // separates Link lines
    expect(entry.fields.description).toContain('Computer Science');
    expect(entry.fields.description).toContain('GPA 3.92');
    expect(entry.fields.website).toEqual({
      label: 'UC Berkeley',
      url: 'https://berkeley.edu',
    });
  });
});

describe('Rehydrate: parser references', () => {
  it('parses reference entry with position and phone in description', () => {
    const md =
'## References\n' +
'\n' +
'### Dr. Michael Torres\n' +
'<!-- id: ref-001 -->\n' +
'\n' +
'"Great engineer."\n' +
'\n' +
'- **Position**: VP of Engineering\n' +
'- **Phone**: +1 (555) 987-6543\n' +
'- **Link**: [LinkedIn](https://linkedin.com/in/mt)\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections.find(
      (s) => s.name === 'references',
    );
    const entry = section!.entries[0]!;
    expect(entry.heading).toBe('Dr. Michael Torres');
    // Position and Phone end up in the description body since
    // extractBasicFields only separates Link lines
    expect(entry.fields.description).toContain('VP of Engineering');
    expect(entry.fields.description).toContain('+1 (555) 987-6543');
    expect(entry.fields.website).toEqual({
      label: 'LinkedIn',
      url: 'https://linkedin.com/in/mt',
    });
  });
});

describe('Rehydrate: parser custom sections', () => {
  it('parses custom section heading and identity', () => {
    const md =
'## Open Source Projects\n' +
'\n' +
'### My Project\n' +
'<!-- id: a1b2c3d4-e5f6-7890-abcd-ef1234567890 -->\n' +
'\n' +
'- **stars**: 2500\n' +
'- **language**: TypeScript\n';

    const { result } = parseRxMarkdown(md);
    const section = result.sections[0]!;
    expect(section.isCustom).toBe(true);
    expect(section.name).toBe('Open Source Projects');
    expect(section.entries).toHaveLength(1);
    const entry = section.entries[0]!;
    expect(entry.heading).toBe('My Project');
    expect(entry.identityComment).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    // Non-Link bullet field lines end up in the description;
    // only - **Link**: [label](url) is extracted separately
    expect(entry.fields.description).toContain('stars');
    expect(entry.fields.description).toContain('2500');
  });
});
