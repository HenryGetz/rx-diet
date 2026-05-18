import { readTextFile, readJsonFile, writeJsonFile, derivePaths } from '../utils/file.js';
import { parseFrontmatter } from '../utils/yaml.js';
import { validateResume, GRAMMAR_VERSION } from '../schema/v5/index.js';
import { restoreAssets, readAssetStore } from '../assets/index.js';
import { parseRxMarkdown, convertEntryFieldsToHtml } from './parser.js';
import { resolveIdentity } from '../merge/identity.js';
import { applyMerge } from '../merge/apply.js';
import { computeDiff } from '../diff/index.js';
import type { ResumeData, SectionName, RxFrontmatter } from '../utils/types.js';
import type { ParseResult, ParsedEntry } from './types.js';
import type { MergeResult, MergeChange } from '../merge/apply.js';
import type { IdentityResolution } from '../merge/identity.js';

export interface RehydrateOptions {
  output?: string;
  base?: string;
  inPlace?: boolean;
  backup?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
  diff?: boolean;
}

export interface RehydrateResult {
  merged: ResumeData;
  changes: MergeChange[];
  warnings: string[];
  fuzzyMatches: number;
  newEntries: number;
  removedEntries: number;
}

// ─── Known section keys ─────────────────────────────────────────────────

const SECTION_KEYS: ReadonlySet<string> = new Set([
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
]);

// ─── Main Pipeline ──────────────────────────────────────────────────────

export async function rehydrate(
  mdPath: string,
  options?: RehydrateOptions,
): Promise<RehydrateResult> {
  const warnings: string[] = [];

  // ── 1. Read and parse markdown ─────────────────────────────────────
  const mdContent = await readTextFile(mdPath);
  const [frontmatter, _body] = parseFrontmatter(mdContent);
  const { result: parsed } = parseRxMarkdown(mdContent);

  // ── 1b. Read id_map from .rxresume.lock.json sidecar ──────────────
  const paths = derivePaths(mdPath);
  let lockIdMap: Record<string, string> | undefined;
  try {
    const lockData = await readJsonFile<{ id_map?: Record<string, string> }>(paths.lock);
    lockIdMap = lockData?.id_map;
  } catch {
    // No lock file is not an error — fall back to frontmatter id_map
  }
  // Merge: lock file takes precedence (forward compat — in future id_map
  // will only live in the lock); frontmatter id_map is fallback for old files.
  const effectiveIdMap: Record<string, string> = lockIdMap ?? frontmatter.id_map ?? {};
  const effectiveFm: RxFrontmatter = { ...frontmatter, id_map: effectiveIdMap };

  // ── 2. Version check ───────────────────────────────────────────────
  if (Number(frontmatter.rx_diet_version) !== GRAMMAR_VERSION) {
    throw new Error(
      `Grammar version mismatch: the .rxresume.md file uses version ${frontmatter.rx_diet_version}, ` +
      `but rx-diet expects version ${GRAMMAR_VERSION}.\n\n` +
      `To fix: re-run 'rx-diet <original.json>' to regenerate the .rxresume.md file with the current grammar.`,
    );
  }

  // ── 3. Read base JSON ──────────────────────────────────────────────
  const basePath = options?.base ?? paths.base;
  let base: ResumeData;
  try {
    base = await readJsonFile<ResumeData>(basePath);
  } catch (cause) {
    throw new Error(
      `Failed to read base JSON from "${basePath}": ` +
      `${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  // ── 4. Read asset sidecar ──────────────────────────────────────────
  let assetStore: Record<string, string> = {};
  try {
    assetStore = await readAssetStore(paths.assets);
  } catch {
    // No assets sidecar is not an error
  }

  // ── 5. Resolve identities and build parsedSections structure ──────
  const parsedSections: Record<
    string,
    Array<{ fields: Record<string, unknown>; resolution: IdentityResolution }>
  > = {};

  let fuzzyMatches = 0;
  let newEntries = 0;

  for (const section of parsed.sections) {
    const sectionName = section.name;
    const isKnownSection = SECTION_KEYS.has(sectionName);

    const entries: Array<{
      fields: Record<string, unknown>;
      resolution: IdentityResolution;
    }> = [];

    for (const entry of section.entries) {
      const mappedFields = mapParsedToSchema(sectionName, entry);

      if (isKnownSection) {
        const resolution = resolveIdentity(
          entry.rawText,
          effectiveFm,
          sectionName as SectionName,
          entry.index,
          sectionName,
          extractStringFields(mappedFields),
          baseItemsForSection(base, sectionName),
        );

        if (resolution.resolved && resolution.tier === 'fuzzy') {
          fuzzyMatches++;
        }
        if (!resolution.resolved) {
          newEntries++;
        }

        entries.push({ fields: mappedFields, resolution });
      } else {
        newEntries++;
        entries.push({
          fields: mappedFields,
          resolution: { resolved: false, reason: 'Unknown section type' },
        });
      }
    }

    parsedSections[sectionName] = entries;
  }

  // ── 6. Require --confirm for fuzzy matches ─────────────────────────
  if (fuzzyMatches > 0 && !options?.confirm) {
    throw new Error(
      `Found ${fuzzyMatches} fuzzy match(es) that require confirmation. ` +
      `Re-run with --confirm to proceed, or add explicit inline IDs ` +
      `(<!-- id:UUID -->) to the relevant entries in the markdown file.`,
    );
  }

  // ── 7. Apply merge ─────────────────────────────────────────────────
  const mergeResult: MergeResult = applyMerge(base, parsedSections);

  // ── 8. Restore assets ──────────────────────────────────────────────
  if (Object.keys(assetStore).length > 0) {
    restoreAssets(mergeResult.merged, assetStore);
  }

  // ── 9. Normalize and validate ──────────────────────────────────────
  normalizeResume(mergeResult.merged);
  const validation = validateResume(mergeResult.merged as unknown);
  if (!validation.valid) {
    const errorLines = validation.errors
      ?.map((e) => {
        const humanPath = e.path
          .replace(/^\//, '')
          .replace(/\//g, ' → ')
          .replace(/~1/g, '/')
          .replace(/~0/g, '~');
        return `  ${humanPath}: ${e.message}`;
      })
      .join('\n');
    throw new Error(
      `Merged resume failed schema validation. The output would not be a valid Reactive Resume file.\n` +
      `Validation errors:\n${errorLines ?? '(unknown)'}\n\n` +
      `Tip: This usually means the markdown parser produced data that doesn't match the expected format. ` +
      `Check that all required fields are present and correctly typed.`,
    );
  }

  warnings.push(...mergeResult.warnings);

  const removedEntries = mergeResult.changes.filter(
    (c) => c.type === 'removed',
  ).length;

  return {
    merged: mergeResult.merged,
    changes: mergeResult.changes,
    warnings,
    fuzzyMatches,
    newEntries,
    removedEntries,
  };
}

// ─── File-to-File Rehydrate ─────────────────────────────────────────────

export async function rehydrateFile(
  inputPath: string,
  options?: RehydrateOptions,
): Promise<RehydrateResult> {
  const result = await rehydrate(inputPath, options);
  const paths = derivePaths(inputPath);
  const defaultOutput = paths.base.replace(/\.json$/, '') + '_updated.json';
  const outputPath = options?.output ?? defaultOutput;

  if (options?.diff) {
    let base: ResumeData;
    const basePath = options?.base ?? paths.base;
    try {
      base = await readJsonFile<ResumeData>(basePath);
    } catch (cause) {
      throw new Error(
        `Cannot compute diff: failed to read base JSON "${basePath}": ` +
        `${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    const diff = computeDiff(base, result.merged);
    const { formatDiff } = await import('../diff/format.js');
    console.log(formatDiff(diff));
    process.exit(diff.hasChanges ? 1 : 0);
  }

  if (options?.dryRun) {
    console.log(JSON.stringify(result.merged, null, 2));
    return result;
  }

  if (options?.inPlace) {
    const inPlacePath = options?.base ?? paths.base;
    if (options?.backup) {
      const { copyFile } = await import('node:fs/promises');
      try {
        await copyFile(inPlacePath, `${inPlacePath}.bak`);
      } catch (cause) {
        throw new Error(
          `Failed to create backup at "${inPlacePath}.bak": ` +
          `${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    }
    await writeJsonFile(inPlacePath, result.merged, true);
    return result;
  }

  await writeJsonFile(outputPath, result.merged, true);
  return result;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function baseItemsForSection(
  base: ResumeData,
  sectionName: string,
): Array<{ id: string } & Record<string, unknown>> {
  const sections = base.sections as unknown as Record<string, { items: Array<{ id: string } & Record<string, unknown>> }>;
  const section = sections[sectionName];
  if (section && typeof section === 'object' && 'items' in section) {
    const items = section.items;
    if (Array.isArray(items)) {
      return items as Array<{ id: string } & Record<string, unknown>>;
    }
  }
  return [];
}

function extractStringFields(
  fields: Record<string, unknown>,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = String(value);
    }
  }
  return result;
}

function mapParsedToSchema(
  sectionName: string,
  entry: ParsedEntry,
): Record<string, unknown> {
  const fields = convertEntryFieldsToHtml(entry.fields);

  const parts = fields._headingParts as string[] | undefined;
  delete fields._headingParts;

  if (parts && parts.length > 0) {
    mapHeadingParts(sectionName, fields, parts);
  }

  const bulletText = fields._bulletText as string | undefined;
  const boldKey = fields._boldKey as string | undefined;
  const boldValue = fields._boldValue as string | undefined;
  const level = fields._level as number | undefined;
  delete fields._bulletText;
  delete fields._boldKey;
  delete fields._boldValue;
  delete fields._level;

  if (bulletText) {
    mapBulletFields(sectionName, fields, bulletText, boldKey, boldValue, level);
  }

  return fields;
}

function mapBulletFields(
  sectionName: string,
  fields: Record<string, unknown>,
  bulletText: string,
  boldKey: string | undefined,
  boldValue: string | undefined,
  level: number | undefined,
): void {
  switch (sectionName) {
    case 'skills': {
      const withoutLevel = bulletText.replace(/\(L\d+\)/, '').trim();
      const emDash = withoutLevel.indexOf('\u2014');
      if (emDash !== -1) {
        fields.name = withoutLevel.slice(0, emDash).trim();
        fields.keywords = withoutLevel.slice(emDash + 1).split(',').map(k => k.trim()).filter(Boolean);
      } else {
        fields.name = withoutLevel;
      }
      fields.level = level ?? 0;
      break;
    }
    case 'languages': {
      const boldMatch = bulletText.match(/^\*\*(.+?)\*\*:\s*(.+)/);
      if (boldMatch) {
        fields.language = boldMatch[1]!.trim();
        fields.fluency = boldMatch[2]!.replace(/\(L\d+\)/, '').trim();
      } else if (boldKey) {
        fields.language = boldKey;
        fields.fluency = (boldValue ?? '').replace(/\(L\d+\)/, '').trim();
      }
      fields.level = level ?? 0;
      break;
    }
    case 'profiles': {
      const boldMatch = bulletText.match(/^\*\*(.+?)\*\*:\s*(.+)/);
      if (boldMatch) {
        fields.network = boldMatch[1]!.trim();
        const rest = boldMatch[2]!.trim();
        const linkMatch = rest.match(/\[@?(.+?)\]\((.+?)\)/);
        if (linkMatch) {
          fields.username = linkMatch[1]!;
          fields.website = { url: linkMatch[2]!, label: linkMatch[1]! };
        } else {
          fields.username = rest.replace(/^@/, '');
        }
      } else if (boldKey) {
        fields.network = boldKey;
        fields.username = (boldValue ?? '').replace(/^@/, '');
      }
      break;
    }
  }
}

function mapHeadingParts(
  sectionName: string,
  fields: Record<string, unknown>,
  parts: string[],
): void {
  switch (sectionName) {
    case 'experience':
      if (parts.length >= 1 && !fields.position) fields.position = parts[0]!;
      if (parts.length >= 2 && !fields.company) fields.company = parts[1]!;
      if (parts.length >= 3 && !fields.period) fields.period = parts[2]!;
      break;

    case 'education':
      if (parts.length >= 1 && !fields.degree) fields.degree = parts[0]!;
      if (parts.length >= 2 && !fields.school) fields.school = parts[1]!;
      if (parts.length >= 3 && !fields.period) fields.period = parts[2]!;
      break;

    case 'projects':
      if (!fields.name) fields.name = parts[0] ?? '';
      if (parts.length >= 2 && !fields.period) fields.period = parts[1]!;
      break;

    case 'skills':
      if (!fields.name) fields.name = parts[0] ?? '';
      if (parts.length >= 2 && !fields.proficiency) fields.proficiency = parts[1]!;
      break;

    case 'languages':
      if (!fields.language) fields.language = parts[0] ?? '';
      if (parts.length >= 2 && !fields.fluency) fields.fluency = parts[1]!;
      break;

    case 'interests':
      if (!fields.name) fields.name = parts[0] ?? '';
      break;

    case 'certifications':
      if (!fields.title) fields.title = parts[0] ?? '';
      if (parts.length >= 2 && !fields.issuer) fields.issuer = parts[1]!;
      if (parts.length >= 3 && !fields.date) fields.date = parts[2]!;
      break;

    case 'awards':
      if (!fields.title) fields.title = parts[0] ?? '';
      if (parts.length >= 2 && !fields.awarder) fields.awarder = parts[1]!;
      if (parts.length >= 3 && !fields.date) fields.date = parts[2]!;
      break;

    case 'publications':
      if (!fields.title) fields.title = parts[0] ?? '';
      if (parts.length >= 2 && !fields.publisher) fields.publisher = parts[1]!;
      if (parts.length >= 3 && !fields.date) fields.date = parts[2]!;
      break;

    case 'volunteer':
      if (parts.length >= 1 && !fields.organization) fields.organization = parts[0]!;
      if (parts.length >= 2 && !fields.position) fields.position = parts[1]!;
      if (parts.length >= 3 && !fields.period) fields.period = parts[2]!;
      break;

    case 'references':
      if (parts.length >= 1 && !fields.name) fields.name = parts[0]!;
      if (parts.length >= 2 && !fields.position) fields.position = parts[1]!;
      break;

    case 'profiles':
      if (parts.length >= 1 && !fields.network) fields.network = parts[0]!;
      if (parts.length >= 2 && !fields.username) fields.username = parts[1]!;
      break;

    default:
      break;
  }
}

function normalizeResume(data: ResumeData): void {
  if (!data.picture) {
    data.picture = {
      hidden: false, url: "", size: 80, rotation: 0, aspectRatio: 1,
      borderRadius: 0, borderColor: "rgba(0,0,0,0.5)", borderWidth: 0,
      shadowColor: "rgba(0,0,0,0.5)", shadowWidth: 0,
    };
  }
  if (!data.summary) {
    data.summary = { title: "Summary", columns: 1, hidden: false, content: "" };
  }
  if (data.basics && !data.basics.website) {
    data.basics.website = { url: "", label: "" };
  }
  if (!data.customSections) {
    data.customSections = [];
  }
  const sections = data.sections as unknown as Record<string, Record<string, unknown> | undefined> | undefined;
  if (sections) {
    const allSectionKeys = ["profiles","experience","education","projects","skills","languages","interests","awards","certifications","publications","volunteer","references"];
    for (const key of allSectionKeys) {
      if (!sections[key]) {
        sections[key] = { title: "", columns: 1, hidden: false, items: [] };
      }
    }
    for (const [key, section] of Object.entries(sections)) {
      if (!section || typeof section !== "object") continue;
      if (section.title === undefined) section.title = "";
      if (section.hidden === undefined) section.hidden = false;
      if (section.columns === undefined) section.columns = 1;
      const items = section.items as Record<string, unknown>[] | undefined;
      if (items) {
        for (const item of items) {
          if (item.hidden === undefined) item.hidden = false;
          if (key === "skills" || key === "languages") {
            if (item.icon === undefined) item.icon = "";
            if (item.proficiency === undefined) item.proficiency = "";
          }
          if (key === "profiles" && item.icon === undefined) {
            item.icon = "";
            item.iconColor = "";
          }
          if (item.website === undefined) {
            item.website = { url: "", label: "" };
          }
          // Fill required string fields with empty defaults
          if (key === "experience" || key === "education" || key === "projects" || key === "volunteer") {
            if (item.period === undefined) item.period = "";
          }
          if (key === "education") {
            if (item.grade === undefined) item.grade = "";
            if (item.location === undefined) item.location = "";
          }
          if (key === "references") {
            if (item.position === undefined) item.position = "";
            if (item.phone === undefined) item.phone = "";
          }
        }
      }
    }
  }
  // Normalize metadata for JSON Resume format
  if (data.metadata) {
    const m = data.metadata as unknown as Record<string, unknown>;
    if (Array.isArray(m.layout)) {
      m.layout = { sidebarWidth: 35, pages: [{ fullWidth: false, main: [], sidebar: [] }] };
    }
    if (!m.design) {
      m.design = { level: { icon: "star", type: "circle" }, colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" } };
    }
    if (m.typography && typeof m.typography === "object") {
      const t = m.typography as Record<string, unknown>;
      if (!t.body) t.body = { fontFamily: "Inter", fontWeights: ["400"], fontSize: 11, lineHeight: 1.5 };
      if (!t.heading) t.heading = { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 };
    }
    if (m.page && typeof m.page === "object") {
      const p = m.page as Record<string, unknown>;
      if (p.gapX === undefined) p.gapX = 4;
      if (p.gapY === undefined) p.gapY = 6;
      if (p.marginX === undefined) p.marginX = 14;
      if (p.marginY === undefined) p.marginY = 12;
    }
  }
}
