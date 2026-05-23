import crypto from 'node:crypto';
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
];
export async function dehydrate(data, sourcePath, _options) {
    const warnings = [];
    const validation = validateResumeLenient(data);
    if (!validation.valid) {
        const errorList = validation.errors?.map(e => `  ${e.path}: ${e.message}`).join('\n');
        throw new Error(`Input JSON is not valid Reactive Resume format.\n\n` +
            `Validation errors:\n${errorList}\n\n` +
            `Common causes:\n` +
            `  - Missing required fields (picture, basics, summary, etc.)\n` +
            `  - Wrong data types (expected string, got number)\n` +
            `  - Extra properties not in the schema\n\n` +
            `Tip: JSON Resume format files are accepted with warnings. Only clearly invalid JSON is rejected.`);
    }
    const strictResult = validateResume(data);
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
    const frontmatter = {
        rx_diet_version: GRAMMAR_VERSION,
        rxresume_schema: `v${SCHEMA_VERSION}`,
        source: sourcePath,
        generated: new Date().toISOString(),
    };
    const sections = [];
    const basicsSerializer = SECTION_SERIALIZERS.basics;
    if (basicsSerializer) {
        sections.push(basicsSerializer(cleanedData.basics));
    }
    const summarySerializer = SECTION_SERIALIZERS.summary;
    if (summarySerializer) {
        const summaryData = cleanedData.summary ?? cleanedData.sections?.summary;
        if (summaryData) {
            const summaryMd = summarySerializer(summaryData);
            if (summaryMd) {
                sections.push(summaryMd);
            }
        }
    }
    for (const sectionName of SECTION_ORDER) {
        const sectionData = cleanedData.sections[sectionName];
        if (!sectionData)
            continue;
        if (!sectionData.hidden &&
            'items' in sectionData &&
            Array.isArray(sectionData.items)) {
            const items = sectionData.items;
            if (items.length === 0)
                continue;
        }
        const serializer = SECTION_SERIALIZERS[sectionName];
        if (serializer) {
            const md = serializer(sectionData);
            if (md)
                sections.push(md);
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
                if (md)
                    sections.push(md);
            }
        }
    }
    const fmYaml = serializeFrontmatter(frontmatter);
    const body = sections.filter(Boolean).map(s => s.trimEnd()).join('\n\n');
    const markdown = fmYaml + body + '\n';
    return { markdown, frontmatter, assetCount, warnings, idMap };
}
export async function dehydrateFile(inputPath, options) {
    const { readJsonFile, writeTextFile, writeJsonFile, derivePaths } = await import('../utils/file.js');
    const { writeAssetStore } = await import('../assets/index.js');
    const data = await readJsonFile(inputPath);
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
function normalizeResume(data) {
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
    // Ensure basics.customFields is always an array
    if (data.basics && (!data.basics.customFields || !Array.isArray(data.basics.customFields))) {
        data.basics.customFields = [];
    }
    // Fill missing metadata (required by rx-ruler)
    if (!data.metadata) {
        data.metadata = {
            template: "",
            layout: { sidebarWidth: 35, pages: [{ fullWidth: false, main: [], sidebar: [] }] },
            page: { gapX: 4, gapY: 6, marginX: 14, marginY: 12, format: "", locale: "", hideIcons: false },
            design: { level: { icon: "star", type: "circle" }, colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" } },
            typography: { body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: 11, lineHeight: 1.5 }, heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 } },
            notes: "",
        };
    }
    // Fill per-section defaults for missing fields
    const sections = data.sections;
    if (sections) {
        for (const [key, section] of Object.entries(sections)) {
            if (!section || typeof section !== "object")
                continue;
            if (section.title === undefined)
                section.title = "";
            if (section.hidden === undefined)
                section.hidden = false;
            if (section.columns === undefined)
                section.columns = 1;
            const items = section.items;
            if (items) {
                for (const item of items) {
                    if (item.id === undefined)
                        item.id = crypto.randomUUID();
                    if (item.hidden === undefined)
                        item.hidden = false;
                    if (item.website === undefined) {
                        item.website = { url: "", label: "", inlineLink: false };
                    }
                    if (key === "profiles") {
                        if (item.icon === undefined)
                            item.icon = "";
                        if (item.iconColor === undefined)
                            item.iconColor = "";
                        if (item.network === undefined)
                            item.network = "";
                        if (item.username === undefined)
                            item.username = "";
                    }
                    else if (key === "experience") {
                        if (item.company === undefined)
                            item.company = "";
                        if (item.position === undefined)
                            item.position = "";
                        if (item.location === undefined)
                            item.location = "";
                        if (item.period === undefined)
                            item.period = "";
                        if (item.description === undefined)
                            item.description = "";
                        if (item.roles === undefined)
                            item.roles = [];
                    }
                    else if (key === "education") {
                        if (item.school === undefined)
                            item.school = "";
                        if (item.degree === undefined)
                            item.degree = "";
                        if (item.area === undefined)
                            item.area = "";
                        if (item.grade === undefined)
                            item.grade = "";
                        if (item.location === undefined)
                            item.location = "";
                        if (item.period === undefined)
                            item.period = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "projects") {
                        if (item.name === undefined)
                            item.name = "";
                        if (item.period === undefined)
                            item.period = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "skills") {
                        if (item.icon === undefined)
                            item.icon = "";
                        if (item.iconColor === undefined)
                            item.iconColor = "";
                        if (item.name === undefined)
                            item.name = "";
                        if (item.proficiency === undefined)
                            item.proficiency = "";
                        if (item.level === undefined)
                            item.level = 0;
                        if (item.keywords === undefined)
                            item.keywords = [];
                    }
                    else if (key === "languages") {
                        if (item.language === undefined)
                            item.language = "";
                        if (item.fluency === undefined)
                            item.fluency = "";
                        if (item.level === undefined)
                            item.level = 0;
                    }
                    else if (key === "interests") {
                        if (item.icon === undefined)
                            item.icon = "";
                        if (item.iconColor === undefined)
                            item.iconColor = "";
                        if (item.name === undefined)
                            item.name = "";
                        if (item.keywords === undefined)
                            item.keywords = [];
                    }
                    else if (key === "awards") {
                        if (item.title === undefined)
                            item.title = "";
                        if (item.awarder === undefined)
                            item.awarder = "";
                        if (item.date === undefined)
                            item.date = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "certifications") {
                        if (item.title === undefined)
                            item.title = "";
                        if (item.issuer === undefined)
                            item.issuer = "";
                        if (item.date === undefined)
                            item.date = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "publications") {
                        if (item.title === undefined)
                            item.title = "";
                        if (item.publisher === undefined)
                            item.publisher = "";
                        if (item.date === undefined)
                            item.date = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "volunteer") {
                        if (item.organization === undefined)
                            item.organization = "";
                        if (item.location === undefined)
                            item.location = "";
                        if (item.period === undefined)
                            item.period = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                    else if (key === "references") {
                        if (item.name === undefined)
                            item.name = "";
                        if (item.position === undefined)
                            item.position = "";
                        if (item.phone === undefined)
                            item.phone = "";
                        if (item.description === undefined)
                            item.description = "";
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=index.js.map