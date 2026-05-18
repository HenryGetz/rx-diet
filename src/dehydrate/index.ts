import type { ResumeData, RxFrontmatter } from '../utils/types.js';
import type { DehydrateResult, DehydrateOptions } from './types.js';
import { validateResumeLenient, validateResume, SCHEMA_VERSION, GRAMMAR_VERSION } from '../schema/v5/index.js';
import { serializeFrontmatter, buildIdMap } from '../utils/yaml.js';
import { extractAssets } from '../assets/index.js';
import { SECTION_SERIALIZERS } from './sections/index.js';

const SECTION_ORDER = [
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
] as const;

export async function dehydrate(
  data: ResumeData,
  sourcePath: string,
  _options?: DehydrateOptions,
): Promise<DehydrateResult> {
  const warnings: string[] = [];

  const validation = validateResumeLenient(data as unknown);
  if (!validation.valid) {
    throw new Error(
      `Invalid resume JSON:\n${
        validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n')
      }`
    );
  }

  const strictResult = validateResume(data as unknown);
  if (!strictResult.valid && strictResult.errors) {
    for (const err of strictResult.errors.slice(0, 5)) {
      warnings.push(`Schema warning: ${err.path}: ${err.message}`);
    }
    if (strictResult.errors.length > 5) {
      warnings.push(`... and ${strictResult.errors.length - 5} more schema warnings`);
    }
  }

  const [cleanedData, , assetCount] = extractAssets(data);

  // Normalize: fill missing RR-required fields with defaults for JSON Resume format files
  normalizeResume(cleanedData);

  const idMap = buildIdMap(cleanedData);
  const frontmatter: RxFrontmatter = {
    rx_diet_version: GRAMMAR_VERSION,
    rxresume_schema: `v${SCHEMA_VERSION}`,
    source: sourcePath,
    generated: new Date().toISOString(),
  };

  const sections: string[] = [];

  const basicsSerializer = SECTION_SERIALIZERS.basics;
  if (basicsSerializer) {
    sections.push(basicsSerializer(cleanedData.basics));
  }

  const summarySerializer = SECTION_SERIALIZERS.summary;
  if (summarySerializer) {
    const summaryData = cleanedData.summary ?? (cleanedData.sections as unknown as Record<string, unknown>)?.summary;
    if (summaryData) {
      const summaryMd = summarySerializer(summaryData);
      if (summaryMd) {
        sections.push(summaryMd);
      }
    }
  }

  for (const sectionName of SECTION_ORDER) {
    const sectionData = cleanedData.sections[sectionName];
    if (!sectionData) continue;

    if (
      !sectionData.hidden &&
      'items' in sectionData &&
      Array.isArray((sectionData as { items: unknown[] }).items)
    ) {
      const items = (sectionData as { items: unknown[] }).items;
      if (items.length === 0) continue;
    }

    const serializer = SECTION_SERIALIZERS[sectionName];
    if (serializer) {
      const md = serializer(sectionData);
      if (md) sections.push(md);
    }
  }

  if (Array.isArray(cleanedData.customSections)) {
    for (const custom of cleanedData.customSections) {
      if (custom.hidden || !Array.isArray(custom.items) || custom.items.length === 0) {
        continue;
      }
      const serializer = SECTION_SERIALIZERS.custom;
      if (serializer) {
        const md = serializer(custom);
        if (md) sections.push(md);
      }
    }
  }

  const fmYaml = serializeFrontmatter(frontmatter);
  const body = sections.filter(Boolean).map(s => s.trimEnd()).join('\n\n');
  const markdown = fmYaml + body + '\n';

  return { markdown, frontmatter, assetCount, warnings, idMap };
}

export async function dehydrateFile(
  inputPath: string,
  options?: DehydrateOptions,
): Promise<DehydrateResult> {
  const { readJsonFile, writeTextFile, writeJsonFile, derivePaths } = await import('../utils/file.js');
  const { writeAssetStore } = await import('../assets/index.js');

  const data = await readJsonFile<ResumeData>(inputPath);
  const sourceName = inputPath.split('/').pop() ?? 'resume.json';
  const result = await dehydrate(data, sourceName, options);

  const paths = derivePaths(inputPath);
  const mdPath = options?.output ?? paths.md;
  const lockPath = options?.output
    ? options.output.replace(/\.rxresume\.md$/, ".rxresume.lock.json")
    : paths.lock;
  await writeTextFile(mdPath, result.markdown);
  await writeJsonFile(lockPath, { id_map: result.idMap }, true);

  if (result.assetCount > 0) {
    const [, assetStore] = extractAssets(data);
    await writeAssetStore(paths.assets, assetStore);
  }

  return result;
}

function normalizeResume(data: ResumeData): void {
  // Fill missing RR-required fields with sensible defaults
  // This enables JSON Resume format files to round-trip through strict Zod validation

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

  // Fill per-section defaults for missing fields
  const sections = data.sections as unknown as Record<string, Record<string, unknown> | undefined> | undefined;
  if (sections) {
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
        }
      }
    }
  }
}
