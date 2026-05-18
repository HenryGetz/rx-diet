import type { ResumeData, RxFrontmatter } from '../utils/types.js';
import type { DehydrateResult, DehydrateOptions } from './types.js';
import { validateResume, SCHEMA_VERSION, GRAMMAR_VERSION } from '../schema/v5/index.js';
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

  const validation = validateResume(data as unknown);
  if (!validation.valid) {
    throw new Error(
      `Invalid resume JSON:\n${
        validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n')
      }`,
    );
  }

  const [cleanedData, , assetCount] = extractAssets(data);

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
  await writeTextFile(mdPath, result.markdown);

  // Write id_map to .rxresume.lock.json sidecar
  await writeJsonFile(paths.lock, { id_map: result.idMap }, true);

  if (result.assetCount > 0) {
    const [, assetStore] = extractAssets(data);
    await writeAssetStore(paths.assets, assetStore);
  }

  return result;
}
