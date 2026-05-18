import { describe, it, expect } from 'vitest';
import { serializeBasics } from '../src/dehydrate/sections/basics.js';
import { serializeSummary } from '../src/dehydrate/sections/summary.js';
import { serializeExperience } from '../src/dehydrate/sections/experience.js';
import { serializeEducation } from '../src/dehydrate/sections/education.js';
import { serializeProjects } from '../src/dehydrate/sections/projects.js';
import { serializeSkills } from '../src/dehydrate/sections/skills.js';
import { serializeLanguages } from '../src/dehydrate/sections/languages.js';
import { serializeInterests } from '../src/dehydrate/sections/interests.js';
import { serializeProfiles } from '../src/dehydrate/sections/profiles.js';
import { serializeAwards } from '../src/dehydrate/sections/awards.js';
import { serializeCertifications } from '../src/dehydrate/sections/certifications.js';
import { serializePublications } from '../src/dehydrate/sections/publications.js';
import { serializeVolunteer } from '../src/dehydrate/sections/volunteer.js';
import { serializeReferences } from '../src/dehydrate/sections/references.js';
import { serializeCustom } from '../src/dehydrate/sections/custom.js';
import type {
  Basics,
  SummarySection,
  ExperienceSection,
  EducationSection,
  ProjectsSection,
  SkillsSection,
  LanguagesSection,
  InterestsSection,
  ProfilesSection,
  AwardsSection,
  CertificationsSection,
  PublicationsSection,
  VolunteerSection,
  ReferencesSection,
  CustomSection,
} from '../src/utils/types.js';

// ─── Basics ──────────────────────────────────────────────────────────────

describe('Dehydrate: basics', () => {
  const fullBasics: Basics = {
    name: 'Alexandra Chen',
    headline: 'Senior Full-Stack Engineer',
    email: 'alexandra.chen@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    website: { url: 'https://alexandrachen.dev', label: 'alexandrachen.dev' },
    customFields: [
      {
        id: 'cf1',
        icon: 'fab fa-github',
        text: 'github/alexchen',
      },
      {
        id: 'cf2',
        icon: 'fab fa-linkedin',
        text: 'linkedin/in/alexchen',
      },
    ],
  };

  it('serializes basics with all fields', () => {
    const result = serializeBasics(fullBasics);
    expect(result).toContain('# Alexandra Chen');
    expect(result).toContain('Senior Full-Stack Engineer');
    expect(result).toContain('**Email**: alexandra.chen@example.com');
    expect(result).toContain('**Phone**: +1 (555) 123-4567');
    expect(result).toContain('**Location**: San Francisco, CA');
    expect(result).toContain(
      '**Website**: [alexandrachen.dev](https://alexandrachen.dev)',
    );
  });

  it('includes custom fields with icon and link', () => {
    const result = serializeBasics(fullBasics);
    expect(result).toContain('**@alexchen**');
  });

  it('skips empty fields', () => {
    const minimal: Basics = {
      name: 'John Doe',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: { url: '', label: '' },
      customFields: [],
    };
    const result = serializeBasics(minimal);
    expect(result).toBe('# John Doe');
  });

  it('includes custom field without link as plain bold text', () => {
    const basics: Basics = {
      name: 'Test',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: { url: '', label: '' },
      customFields: [
        {
          id: 'cf1',
          icon: 'fas fa-phone',
          text: 'Signal: test.01',
        },
      ],
    };
    const result = serializeBasics(basics);
    expect(result).toContain('**Signal: test.01**');
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────

describe('Dehydrate: summary', () => {
  it('converts HTML to markdown', () => {
    const section: SummarySection = {
      title: 'Summary',
      columns: 1,
      hidden: false,
      content:
        '<p>Senior full-stack engineer with <strong>12+ years</strong> of experience.</p>',
    };
    const result = serializeSummary(section);
    expect(result).toBe(
      '## Summary\n\nSenior full-stack engineer with **12+ years** of experience.',
    );
  });

  it('returns empty string for empty content', () => {
    const section: SummarySection = {
      title: 'Summary',
      columns: 1,
      hidden: false,
      content: '',
    };
    expect(serializeSummary(section)).toBe('');
  });
});

// ─── Experience ──────────────────────────────────────────────────────────

describe('Dehydrate: experience', () => {
  const section: ExperienceSection = {
    title: 'Experience',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        hidden: false,
        company: 'TechCorp Inc.',
        position: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        period: 'Jan 2020 - Present',
        website: {
          url: 'https://techcorp.example.com',
          label: 'TechCorp Inc.',
        },
        description:
          '<p>Lead the platform engineering team building the next-generation API gateway.</p>',
      },
      {
        id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        hidden: false,
        company: 'StartupXYZ',
        position: 'Engineering Lead',
        location: '',
        period: 'Mar 2016 - Dec 2019',
        website: { url: '', label: '' },
        description:
          '<p>Joined as first engineer and grew the team to 15.</p>',
        roles: [
          {
            id: 'role-1111-2222-3333-4444-555555555555',
            position: 'Senior Engineer',
            period: 'Mar 2016 - Dec 2017',
            description:
              '<p>Built the core SaaS platform from the ground up.</p>',
          },
        ],
      },
    ],
  };

  it('formats heading with pipe delimiters', () => {
    const result = serializeExperience(section);
    expect(result).toContain(
      '### Senior Software Engineer | TechCorp Inc. | 2020-01 - Present',
    );
  });

  it('includes identity comment', () => {
    const result = serializeExperience(section);
    expect(result).toContain(
      '<!-- id:c3d4e5f6-a7b8-9012-cdef-123456789012 -->',
    );
  });

  it('converts description HTML to markdown', () => {
    const result = serializeExperience(section);
    expect(result).toContain(
      'Lead the platform engineering team building the next-generation API gateway.',
    );
  });

  it('includes website link when present', () => {
    const result = serializeExperience(section);
    expect(result).toContain(
      '- **Website**: [TechCorp Inc.](https://techcorp.example.com)',
    );
  });

  it('handles roles array', () => {
    const result = serializeExperience(section);
    expect(result).toContain('**Senior Engineer**');
    expect(result).toContain('(2016-03 - 2017-12)');
  });

  it('formats dates in short format', () => {
    const result = serializeExperience(section);
    expect(result).toContain('2020-01 - Present');
    expect(result).toContain('2016-03 - 2017-12');
  });

  it('outputs heading-only when all items are hidden', () => {
    const withHidden: ExperienceSection = {
      ...section,
      items: [
        {
          id: 'hidden-id',
          hidden: true,
          company: 'Hidden Co.',
          position: 'Ghost',
          location: '',
          period: '',
          website: { url: '', label: '' },
          description: '',
        },
      ],
    };
    const result = serializeExperience(withHidden);
    expect(result).toBe('## Experience\n');
  });

  it('returns empty string for empty items', () => {
    const empty: ExperienceSection = { ...section, items: [] };
    expect(serializeExperience(empty)).toBe('');
  });
});

// ─── Education ───────────────────────────────────────────────────────────

describe('Dehydrate: education', () => {
  const section: EducationSection = {
    title: 'Education',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
        hidden: false,
        school: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        area: 'Computer Science & Mathematics',
        grade: 'GPA 3.92',
        location: 'Berkeley, CA',
        period: 'Aug 2010 - May 2014',
        website: { url: 'https://berkeley.edu', label: 'UC Berkeley' },
        description:
          '<p>Graduated with honors. Dean\'s list all semesters.</p>',
      },
    ],
  };

  it('formats heading with school | degree | period', () => {
    const result = serializeEducation(section);
    expect(result).toContain(
      '### University of California, Berkeley | Bachelor of Science | 2010-08 - 2014-05',
    );
  });

  it('includes identity comment', () => {
    const result = serializeEducation(section);
    expect(result).toContain(
      '<!-- id:f6a7b8c9-d0e1-2345-fabc-456789012345 -->',
    );
  });

  it('includes area and grade', () => {
    const result = serializeEducation(section);
    expect(result).toContain('- **Field of Study**: Computer Science & Mathematics');
    expect(result).toContain('- **GPA**: 3.92');
  });

  it('includes website link when present', () => {
    const result = serializeEducation(section);
    expect(result).toContain(
      '- **Website**: [UC Berkeley](https://berkeley.edu)',
    );
  });
});

// ─── Projects ────────────────────────────────────────────────────────────

describe('Dehydrate: projects', () => {
  const section: ProjectsSection = {
    title: 'Projects',
    columns: 2,
    hidden: false,
    items: [
      {
        id: 'b8c9d0e1-f2a3-4567-bcde-678901234567',
        hidden: false,
        name: 'KoaCast',
        period: 'Jan 2023 - Present',
        website: {
          url: 'https://github.com/alexchen/koacast',
          label: 'github.com/alexchen/koacast',
        },
        description:
          '<p>Open-source podcast hosting platform built with <strong>React</strong> and PostgreSQL.</p>',
      },
    ],
  };

  it('formats heading with name | period', () => {
    const result = serializeProjects(section);
    expect(result).toContain('### KoaCast | 2023-01 - Present');
  });

  it('includes identity comment and link', () => {
    const result = serializeProjects(section);
    expect(result).toContain(
      '<!-- id:b8c9d0e1-f2a3-4567-bcde-678901234567 -->',
    );
    expect(result).toContain(
      '- **Website**: [github.com/alexchen/koacast](https://github.com/alexchen/koacast)',
    );
  });
});

// ─── Skills ──────────────────────────────────────────────────────────────

describe('Dehydrate: skills', () => {
  const section: SkillsSection = {
    title: 'Skills',
    columns: 2,
    hidden: false,
    items: [
      {
        id: 'd0e1f2a3-b4c5-6789-defa-890123456789',
        hidden: false,
        name: 'TypeScript',
        proficiency: 'Expert',
        level: 5,
        icon: 'devicon-typescript-plain',
        iconColor: 'rgba(49, 120, 198, 1)',
        keywords: ['React', 'Node.js', 'Deno', 'Angular'],
      },
      {
        id: 'e1f2a3b4-c5d6-7890-efab-901234567890',
        hidden: false,
        name: 'Python',
        proficiency: 'Advanced',
        level: 4,
        icon: 'devicon-python-plain',
        iconColor: '',
        keywords: [],
      },
      {
        id: 'hidden-skill',
        hidden: true,
        name: 'COBOL',
        proficiency: 'Beginner',
        level: 1,
        icon: '',
        iconColor: '',
        keywords: [],
      },
    ],
  };

  it('renders skill with keywords', () => {
    const result = serializeSkills(section);
    expect(result).toContain(
      '- TypeScript (Expert, 5/5) — React, Node.js, Deno, Angular',
    );
  });

  it('renders skill without keywords', () => {
    const result = serializeSkills(section);
    expect(result).toContain('- Python (Advanced, 4/5)');
  });

  it('skips hidden items', () => {
    const result = serializeSkills(section);
    expect(result).not.toContain('COBOL');
  });

  it('returns empty string when no visible items', () => {
    const emptySection: SkillsSection = { ...section, items: [] };
    expect(serializeSkills(emptySection)).toBe('');
  });
});

// ─── Languages ───────────────────────────────────────────────────────────

describe('Dehydrate: languages', () => {
  const section: LanguagesSection = {
    title: 'Languages',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'a3b4c5d6-e7f8-9012-abcd-123456789012',
        hidden: false,
        language: 'English',
        fluency: 'Native',
        level: 5,
      },
      {
        id: 'b4c5d6e7-f8a9-0123-bcde-234567890123',
        hidden: false,
        language: 'Mandarin Chinese',
        fluency: 'Fluent',
        level: 4,
      },
    ],
  };

  it('renders each language on one line', () => {
    const result = serializeLanguages(section);
    expect(result).toContain('- **English**: Native (5/5)');
    expect(result).toContain('- **Mandarin Chinese**: Fluent (4/5)');
  });

  it('returns empty string when no visible items', () => {
    const empty: LanguagesSection = { ...section, items: [] };
    expect(serializeLanguages(empty)).toBe('');
  });
});

// ─── Interests ───────────────────────────────────────────────────────────

describe('Dehydrate: interests', () => {
  const section: InterestsSection = {
    title: 'Interests',
    columns: 2,
    hidden: false,
    items: [
      {
        id: 'c5d6e7f8-a9b0-1234-cdef-345678901234',
        hidden: false,
        name: 'Hiking & Outdoor Sports',
        icon: 'fas fa-hiking',
        iconColor: 'rgba(34, 197, 94, 1)',
        keywords: ['Trail running', 'Rock climbing', 'Backpacking'],
      },
    ],
  };

  it('renders H3 heading and keyword bullets', () => {
    const result = serializeInterests(section);
    expect(result).toContain('### Hiking & Outdoor Sports');
    expect(result).toContain('- Trail running');
    expect(result).toContain('- Backpacking');
  });

  it('includes identity comment', () => {
    const result = serializeInterests(section);
    expect(result).toContain(
      '<!-- id:c5d6e7f8-a9b0-1234-cdef-345678901234 -->',
    );
  });
});

// ─── Profiles ────────────────────────────────────────────────────────────

describe('Dehydrate: profiles', () => {
  const section: ProfilesSection = {
    title: 'Profiles',
    columns: 2,
    hidden: false,
    items: [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        hidden: false,
        icon: 'fab fa-github',
        iconColor: 'rgba(36, 41, 46, 1)',
        network: 'GitHub',
        username: 'alexchen',
        website: {
          url: 'https://github.com/alexchen',
          label: 'github.com/alexchen',
        },
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        hidden: false,
        icon: 'fab fa-linkedin',
        iconColor: '',
        network: 'LinkedIn',
        username: 'alexandrachen',
        website: { url: '', label: '' },
      },
    ],
  };

  it('renders profile with link as markdown link', () => {
    const result = serializeProfiles(section);
    expect(result).toContain(
      '- **GitHub**: [@alexchen](https://github.com/alexchen)',
    );
  });

  it('renders profile without link as plain text', () => {
    const result = serializeProfiles(section);
    expect(result).toContain('- **LinkedIn**: @alexandrachen');
  });
});

// ─── Awards ──────────────────────────────────────────────────────────────

describe('Dehydrate: awards', () => {
  const section: AwardsSection = {
    title: 'Awards',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'e7f8a9b0-c1d2-3456-efab-567890123456',
        hidden: false,
        title: 'Engineering Excellence Award',
        awarder: 'TechCorp Inc.',
        date: '2023-06',
        website: { url: '', label: '' },
        description:
          '<p>Recognized for achieving <strong>99.99% uptime</strong>.</p>',
      },
    ],
  };

  it('formats heading with title | awarder | date', () => {
    const result = serializeAwards(section);
    expect(result).toContain(
      '### Engineering Excellence Award | TechCorp Inc. | 2023-06',
    );
  });

  it('includes identity comment', () => {
    const result = serializeAwards(section);
    expect(result).toContain(
      '<!-- id:e7f8a9b0-c1d2-3456-efab-567890123456 -->',
    );
  });

  it('converts description HTML to markdown', () => {
    const result = serializeAwards(section);
    expect(result).toContain('Recognized for achieving **99.99% uptime**.');
  });
});

// ─── Certifications ──────────────────────────────────────────────────────

describe('Dehydrate: certifications', () => {
  const section: CertificationsSection = {
    title: 'Certifications',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'a9b0c1d2-e3f4-5678-abcd-789012345678',
        hidden: false,
        title: 'AWS Solutions Architect - Professional',
        issuer: 'Amazon Web Services',
        date: '2023-03',
        website: {
          url: 'https://aws.amazon.com/certification',
          label: 'AWS Certification',
        },
        description:
          '<p>Professional-level certification validating advanced skills.</p>',
      },
    ],
  };

  it('formats heading with title | issuer | date', () => {
    const result = serializeCertifications(section);
    expect(result).toContain(
      '### AWS Solutions Architect - Professional | Amazon Web Services | 2023-03',
    );
  });

  it('includes website link when present', () => {
    const result = serializeCertifications(section);
    expect(result).toContain(
      '- **Website**: [AWS Certification](https://aws.amazon.com/certification)',
    );
  });
});

// ─── Publications ────────────────────────────────────────────────────────

describe('Dehydrate: publications', () => {
  const section: PublicationsSection = {
    title: 'Publications',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'c1d2e3f4-a5b6-7890-cdef-901234567890',
        hidden: false,
        title:
          'Scaling Event-Driven Architectures with Conflict-Free Replicated Data Types',
        publisher:
          'ACM International Conference on Distributed Systems (SysConf 2022)',
        date: '2022-10',
        website: {
          url: 'https://doi.org/10.1234/example',
          label: 'DOI: 10.1234/example',
        },
        description:
          '<p>Published paper presenting a novel approach to <strong>conflict resolution</strong>.</p>',
      },
    ],
  };

  it('formats heading with title | publisher | date', () => {
    const result = serializePublications(section);
    expect(result).toContain(
      '### Scaling Event-Driven Architectures with Conflict-Free Replicated Data Types | ACM International Conference on Distributed Systems (SysConf 2022) | 2022-10',
    );
  });

  it('includes link and description', () => {
    const result = serializePublications(section);
    expect(result).toContain(
      '- **Website**: [DOI: 10.1234/example](https://doi.org/10.1234/example)',
    );
    expect(result).toContain('novel approach to **conflict resolution**.');
  });
});

// ─── Volunteer ───────────────────────────────────────────────────────────

describe('Dehydrate: volunteer', () => {
  const section: VolunteerSection = {
    title: 'Volunteer',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'e3f4a5b6-c7d8-9012-efab-123456789012',
        hidden: false,
        organization: 'CodeBridge Foundation',
        position: 'Mentor & Curriculum Developer',
        location: 'San Francisco, CA',
        period: 'Jan 2021 - Present',
        website: {
          url: 'https://codebridge.example.org',
          label: 'CodeBridge Foundation',
        },
        description:
          '<p>Teach <strong>web development</strong> to underrepresented groups.</p>',
      },
    ],
  };

  it('formats heading with organization | position | period', () => {
    const result = serializeVolunteer(section);
    expect(result).toContain(
      '### CodeBridge Foundation | Mentor & Curriculum Developer | 2021-01 - Present',
    );
  });

  it('includes identity comment and link', () => {
    const result = serializeVolunteer(section);
    expect(result).toContain(
      '<!-- id:e3f4a5b6-c7d8-9012-efab-123456789012 -->',
    );
    expect(result).toContain(
      '- **Website**: [CodeBridge Foundation](https://codebridge.example.org)',
    );
  });
});

// ─── References ──────────────────────────────────────────────────────────

describe('Dehydrate: references', () => {
  const section: ReferencesSection = {
    title: 'References',
    columns: 1,
    hidden: false,
    items: [
      {
        id: 'f4a5b6c7-d8e9-0123-fabc-234567890123',
        hidden: false,
        name: 'Dr. Michael Torres',
        position: 'VP of Engineering, TechCorp Inc.',
        phone: '+1 (555) 987-6543',
        website: {
          url: 'https://linkedin.com/in/michaeltorres',
          label: 'Michael Torres on LinkedIn',
        },
        description:
          '<p>"Alexandra is one of the most talented engineers..."</p>',
      },
    ],
  };

  it('renders H3 heading with name and identity comment', () => {
    const result = serializeReferences(section);
    expect(result).toContain('### Dr. Michael Torres');
    expect(result).toContain(
      '<!-- id:f4a5b6c7-d8e9-0123-fabc-234567890123 -->',
    );
  });

  it('renders position, phone, and website fields', () => {
    const result = serializeReferences(section);
    expect(result).toContain('- **Position**: VP of Engineering, TechCorp Inc.');
    expect(result).toContain('- **Phone**: +1 (555) 987-6543');
    expect(result).toContain(
      '- **Website**: [Michael Torres on LinkedIn](https://linkedin.com/in/michaeltorres)',
    );
  });

  it('skips empty contact fields', () => {
    const minimal: ReferencesSection = {
      title: 'References',
      columns: 1,
      hidden: false,
      items: [
        {
          id: 'ref-1',
          hidden: false,
          name: 'Jane Doe',
          position: '',
          phone: '',
          website: { url: '', label: '' },
          description: '',
        },
      ],
    };
    const result = serializeReferences(minimal);
    expect(result).toContain('### Jane Doe');
    expect(result).not.toContain('**Position**');
    expect(result).not.toContain('**Phone**');
    expect(result).not.toContain('**Website**');
  });
});

// ─── Custom Sections ─────────────────────────────────────────────────────

describe('Dehydrate: custom', () => {
  const section: CustomSection = {
    id: 'a1b2c3d4-e5f6-7890-abcd-customsection01',
    title: 'Conference Talks',
    columns: 2,
    hidden: false,
    type: 'awards',
    items: [
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-customitem001',
        hidden: false,
        title:
          'Reacting to the Future: Server Components in Production',
        awarder: 'ReactConf 2023',
        date: '2023-05',
        website: {
          url: 'https://reactconf.example.com/talks/server-components',
          label: 'Talk Recording',
        },
        description:
          '<p>Delivered a talk on migrating to <strong>React Server Components</strong>.</p>',
      },
    ],
  };

  it('renders section title and heading from first string field', () => {
    const result = serializeCustom(section);
    expect(result).toContain('## Conference Talks');
    expect(result).toContain(
      '### Reacting to the Future: Server Components in Production',
    );
  });

  it('includes identity comment', () => {
    const result = serializeCustom(section);
    expect(result).toContain(
      '<!-- id:b2c3d4e5-f6a7-8901-bcde-customitem001 -->',
    );
  });

  it('renders non-excluded fields as definition list', () => {
    const result = serializeCustom(section);
    expect(result).toContain('- **awarder**: ReactConf 2023');
    expect(result).toContain('- **date**: 2023-05');
  });

  it('skips hidden items within a section', () => {
    const sectionWithHidden: CustomSection = {
      ...section,
      items: [
        ...section.items,
        {
          id: 'hidden-item',
          hidden: true,
          title: 'Hidden Talk',
          awarder: 'Secret Conf',
          date: '2020-01',
        },
      ],
    };
    const result = serializeCustom(sectionWithHidden);
    expect(result).not.toContain('Hidden Talk');
    expect(result).toContain('Reacting to the Future');
  });
});
