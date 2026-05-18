import yaml from 'js-yaml';
import type { ResumeData, RxFrontmatter } from './types.js';

const FM_START = 0;
const FM_DELIMITER = '---\n';

/**
 * Parse YAML frontmatter from a markdown string.
 * Returns a tuple of [parsed frontmatter, remaining body content].
 */
export function parseFrontmatter(markdown: string): [RxFrontmatter, string] {
  if (!markdown.startsWith(FM_DELIMITER)) {
    throw new Error(
      'No YAML frontmatter found. Expected content to start with "---\\n" followed by YAML and "---\\n".'
    );
  }

  const closingIndex = markdown.indexOf('\n---', FM_DELIMITER.length);
  if (closingIndex === -1) {
    throw new Error(
      'Unterminated YAML frontmatter. Expected closing "---" delimiter after frontmatter content.'
    );
  }

  const yamlContent = markdown.slice(FM_DELIMITER.length, closingIndex);
  const bodyStart = closingIndex + '\n---'.length;
  const body = markdown[bodyStart] === '\n' ? markdown.slice(bodyStart + 1) : markdown.slice(bodyStart);

  let parsed: unknown;
  try {
    parsed = yaml.load(yamlContent);
  } catch (cause) {
    throw new Error(
      `Failed to parse YAML frontmatter: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(
      'YAML frontmatter did not produce an object. Expected a mapping of key-value pairs.'
    );
  }

  return [parsed as RxFrontmatter, body];
}

/**
 * Serialize frontmatter to a YAML string with `---` delimiters.
 * Excludes `id_map` (stored in .rxresume.lock.json sidecar) and
 * shortens `generated` to date-only for a cleaner frontmatter.
 */
export function serializeFrontmatter(fm: RxFrontmatter): string {
  // Clone and strip id_map; shorten generated to date-only
  const cleanFm: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fm)) {
    if (key === 'id_map') continue;
    if (key === 'generated') {
      cleanFm[key] = (value as string).split('T')[0];
    } else {
      cleanFm[key] = value;
    }
  }

  let dumped: string;
  try {
    dumped = yaml.dump(cleanFm, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      // js-yaml forces quotes on strings like "v5" or bare numbers;
      // we strip unnecessary quotes in post-processing below.
      quotingType: "'",
      forceQuotes: false,
    });
  } catch (cause) {
    throw new Error(
      `Failed to serialize frontmatter to YAML: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }

  // Post-process: remove unnecessary single quotes around known values
  dumped = dumped
    .replace(/^generated: '(\d{4}-\d{2}-\d{2})'/gm, 'generated: $1')
    .replace(/^rxresume_schema: 'v(\d+)'/gm, 'rxresume_schema: v$1')
    .replace(/^rx_diet_version: '(\d+)'/gm, 'rx_diet_version: $1');

  return `---\n${dumped.replace(/\n*$/, '')}\n---\n`;
}

function collectSectionIds(
  sectionKey: string,
  items: { id: string }[] | undefined,
  map: Record<string, string>
): void {
  if (!items) return;
  items.forEach((item, index) => {
    map[`sections.${sectionKey}.${index}`] = item.id;
  });
}

/**
 * Build an id_map from a ResumeData object.
 * Maps paths like "sections.experience.0" to the item's UUID.
 */
export function buildIdMap(data: ResumeData): Record<string, string> {
  const map: Record<string, string> = {};

  map['summary'] = '_summary';

  const sectionKeys: (keyof typeof data.sections)[] = [
    'profiles',
    'experience',
    'education',
    'projects',
    'skills',
    'languages',
    'interests',
    'awards',
    'certifications',
    'publications',
    'volunteer',
    'references',
  ];

  for (const key of sectionKeys) {
    const section = data.sections[key];
    if (section && 'items' in section && Array.isArray((section as { items: unknown[] }).items)) {
      collectSectionIds(key, (section as { items: { id: string }[] }).items, map);
    }
  }

  if (Array.isArray(data.customSections)) {
    data.customSections.forEach((cs, csIndex) => {
      if (Array.isArray(cs.items)) {
        cs.items.forEach((item, itemIndex) => {
          const id = (item as { id?: string }).id;
          if (id) {
            map[`customSections.${csIndex}.${itemIndex}`] = id;
          }
        });
      }
    });
  }

  return map;
}
