import crypto from 'node:crypto';
import { readTextFile, readJsonFile, writeJsonFile, derivePaths } from '../utils/file.js';
import { parseFrontmatter } from '../utils/yaml.js';
import { validateResume, GRAMMAR_VERSION } from '../schema/v5/index.js';
import { restoreAssets, readAssetStore } from '../assets/index.js';
import { parseRxMarkdown, convertEntryFieldsToHtml } from './parser.js';
import { resolveIdentity } from '../merge/identity.js';
import { applyMerge } from '../merge/apply.js';
import { computeDiff } from '../diff/index.js';
// ─── Known section keys ─────────────────────────────────────────────────
const SECTION_KEYS = new Set([
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
// ─── Validation Error Formatting ────────────────────────────────────────
function formatValidationError(errors) {
    const lines = [];
    lines.push('Your .rxresume.md rehydrated to JSON that failed schema validation.');
    lines.push('');
    const bySection = {};
    for (const err of errors) {
        const section = err.path.replace(/^\//, '').split('/')[0] || '/';
        if (!bySection[section])
            bySection[section] = [];
        bySection[section].push(err);
    }
    for (const [section, sectionErrors] of Object.entries(bySection)) {
        lines.push(`  ${section}:`);
        for (const err of sectionErrors.slice(0, 5)) {
            const field = err.path.split('/').pop() || err.path;
            if (err.message.includes('missing') || err.message.includes("is required")) {
                lines.push(`    Missing required field: ${field} — add this field to the .rxresume.md or the base JSON`);
            }
            else if (err.message.includes('expected') || err.message.includes('must be')) {
                lines.push(`    Wrong type for ${field}: ${err.message}`);
            }
            else {
                lines.push(`    ${field}: ${err.message}`);
            }
        }
        if (sectionErrors.length > 5) {
            lines.push(`    ... and ${sectionErrors.length - 5} more errors in ${section}`);
        }
    }
    lines.push('');
    lines.push('Common fixes:');
    lines.push('  1. Re-run: rx-diet original.json  (re-dehydrate from the original JSON)');
    lines.push('  2. Check that all <!-- id:... --> comments are intact');
    lines.push('  3. Verify pipe-delimited headings use the correct format: ### Field1 | Field2 | Field3');
    lines.push('  4. Ensure all required fields (name, email, etc.) exist in the markdown');
    lines.push('  5. If a custom field is missing its "text" value, add it back in the markdown');
    return lines.join('\n');
}
function annotateErrorsWithContext(errors, mdContent) {
    // Build a map of section names → approximate markdown line numbers
    const sectionLineMap = {};
    const mdLines = mdContent.split('\n');
    for (let i = 0; i < mdLines.length; i++) {
        const line = mdLines[i];
        if (!line)
            continue;
        const match = line.match(/^###\s+(\S+)/);
        if (match && match[1]) {
            sectionLineMap[match[1].toLowerCase()] = i + 1;
        }
    }
    const lines = [];
    lines.push('Rehydrate failed: the merged JSON does not pass schema validation.');
    lines.push('');
    // Group by section
    const bySection = {};
    for (const err of errors) {
        const section = err.path.split('.')[0]
            || err.path.replace(/^\//, '').split('/')[0]
            || 'root';
        if (!bySection[section])
            bySection[section] = [];
        bySection[section].push(err);
    }
    for (const [section, sectionErrors] of Object.entries(bySection)) {
        const lineNo = sectionLineMap[section.toLowerCase()];
        const lineInfo = lineNo ? ` (near markdown line ${lineNo})` : '';
        lines.push(`  ${section}${lineInfo}:`);
        for (const err of sectionErrors.slice(0, 3)) {
            const field = err.path.split('.').pop() || err.path.split('/').pop() || err.path;
            if (err.message.includes('missing') || err.message.includes("is required")) {
                lines.push(`    Missing: ${field} — check the .rxresume.md for this field`);
            }
            else if (err.message.includes('expected') || err.message.includes('must be')) {
                lines.push(`    Wrong type: ${field} — ${err.message}`);
            }
            else {
                lines.push(`    ${field}: ${err.message}`);
            }
        }
        if (sectionErrors.length > 3) {
            lines.push(`    ... and ${sectionErrors.length - 3} more`);
        }
    }
    lines.push('');
    lines.push('How to fix:');
    lines.push('  1. rx-diet resume.json                  — re-dehydrate from original');
    lines.push('  2. rx-diet resume.rxresume.md --lint     — find format issues');
    lines.push('  3. rx-diet resume.rxresume.md --fix      — auto-repair formatting');
    lines.push('  4. Check <!-- id:... --> comments are intact after LLM edits');
    lines.push('  5. Verify pipe-delimited headings: ### Field1 | Field2 | Field3');
    return lines.join('\n');
}
// ─── Main Pipeline ──────────────────────────────────────────────────────
export async function rehydrate(mdPath, options) {
    const warnings = [];
    // ── 1. Read and parse markdown ─────────────────────────────────────
    const mdContent = await readTextFile(mdPath);
    const [frontmatter, _body] = parseFrontmatter(mdContent);
    const { result: parsed } = parseRxMarkdown(mdContent);
    // ── 1b. Read id_map from .rxresume.lock.json sidecar ──────────────
    const paths = derivePaths(mdPath);
    let lockIdMap;
    try {
        const lockData = await readJsonFile(paths.lock);
        lockIdMap = lockData?.id_map;
    }
    catch {
        // No lock file is not an error — fall back to frontmatter id_map
    }
    // Merge: lock file takes precedence (forward compat — in future id_map
    // will only live in the lock); frontmatter id_map is fallback for old files.
    const effectiveIdMap = lockIdMap ?? frontmatter.id_map ?? {};
    const effectiveFm = { ...frontmatter, id_map: effectiveIdMap };
    // ── 2. Version check ───────────────────────────────────────────────
    if (Number(frontmatter.rx_diet_version) !== GRAMMAR_VERSION) {
        throw new Error(`Grammar version mismatch: the .rxresume.md file uses version ${frontmatter.rx_diet_version}, ` +
            `but rx-diet expects version ${GRAMMAR_VERSION}.\n\n` +
            `To fix: re-run 'rx-diet <original.json>' to regenerate the .rxresume.md file with the current grammar.`);
    }
    // ── 3. Read base JSON ──────────────────────────────────────────────
    const basePath = options?.base ?? paths.base;
    let base;
    try {
        base = await readJsonFile(basePath);
    }
    catch (cause) {
        throw new Error(`Failed to read base JSON from "${basePath}": ` +
            `${cause instanceof Error ? cause.message : String(cause)}`);
    }
    // ── 4. Read asset sidecar ──────────────────────────────────────────
    let assetStore = {};
    try {
        assetStore = await readAssetStore(paths.assets);
    }
    catch {
        // No assets sidecar is not an error
    }
    // ── 5. Resolve identities and build parsedSections structure ──────
    const parsedSections = {};
    let fuzzyMatches = 0;
    let newEntries = 0;
    for (const section of parsed.sections) {
        const sectionName = section.name;
        const isKnownSection = SECTION_KEYS.has(sectionName);
        const entries = [];
        for (const entry of section.entries) {
            const mappedFields = mapParsedToSchema(sectionName, entry);
            if (isKnownSection) {
                const resolution = resolveIdentity(entry.rawText, effectiveFm, sectionName, entry.index, sectionName, extractStringFields(mappedFields), baseItemsForSection(base, sectionName));
                if (resolution.resolved && resolution.tier === 'fuzzy') {
                    fuzzyMatches++;
                }
                if (!resolution.resolved) {
                    newEntries++;
                }
                entries.push({ fields: mappedFields, resolution });
            }
            else {
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
        throw new Error(`Found ${fuzzyMatches} fuzzy match(es) that require confirmation. ` +
            `Re-run with --confirm to proceed, or add explicit inline IDs ` +
            `(<!-- id:UUID -->) to the relevant entries in the markdown file.`);
    }
    // ── 7. Apply merge ─────────────────────────────────────────────────
    const mergeResult = applyMerge(base, parsedSections);
    // ── 8. Restore assets ──────────────────────────────────────────────
    if (Object.keys(assetStore).length > 0) {
        restoreAssets(mergeResult.merged, assetStore);
    }
    // ── 9. Normalize and validate ──────────────────────────────────────
    normalizeResume(mergeResult.merged);
    const validation = validateResume(mergeResult.merged);
    if (!validation.valid) {
        throw new Error(annotateErrorsWithContext(validation.errors ?? [], mdContent));
    }
    warnings.push(...mergeResult.warnings);
    const removedEntries = mergeResult.changes.filter((c) => c.type === 'removed').length;
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
export async function rehydrateFile(inputPath, options) {
    const result = await rehydrate(inputPath, options);
    const paths = derivePaths(inputPath);
    const defaultOutput = paths.base.replace(/\.json$/, '') + '_updated.json';
    const outputPath = options?.output ?? defaultOutput;
    if (options?.diff) {
        let base;
        const basePath = options?.base ?? paths.base;
        try {
            base = await readJsonFile(basePath);
        }
        catch (cause) {
            throw new Error(`Cannot compute diff: failed to read base JSON "${basePath}": ` +
                `${cause instanceof Error ? cause.message : String(cause)}`);
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
            }
            catch (cause) {
                throw new Error(`Failed to create backup at "${inPlacePath}.bak": ` +
                    `${cause instanceof Error ? cause.message : String(cause)}`);
            }
        }
        await writeJsonFile(inPlacePath, result.merged, true);
        return result;
    }
    await writeJsonFile(outputPath, result.merged, true);
    return result;
}
// ─── Helpers ────────────────────────────────────────────────────────────
function baseItemsForSection(base, sectionName) {
    const sections = base.sections;
    const section = sections[sectionName];
    if (section && typeof section === 'object' && 'items' in section) {
        const items = section.items;
        if (Array.isArray(items)) {
            return items;
        }
    }
    return [];
}
function extractStringFields(fields) {
    const result = {};
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') {
            result[key] = value;
        }
        else if (typeof value === 'number' || typeof value === 'boolean') {
            result[key] = String(value);
        }
    }
    return result;
}
function mapParsedToSchema(sectionName, entry) {
    const fields = convertEntryFieldsToHtml(entry.fields);
    const parts = fields._headingParts;
    delete fields._headingParts;
    if (parts && parts.length > 0) {
        mapHeadingParts(sectionName, fields, parts);
    }
    const bulletText = fields._bulletText;
    const boldKey = fields._boldKey;
    const boldValue = fields._boldValue;
    const level = fields._level;
    delete fields._bulletText;
    delete fields._boldKey;
    delete fields._boldValue;
    delete fields._level;
    if (bulletText) {
        mapBulletFields(sectionName, fields, bulletText, boldKey, boldValue, level);
    }
    return fields;
}
function mapBulletFields(sectionName, fields, bulletText, boldKey, boldValue, level) {
    switch (sectionName) {
        case 'skills': {
            const withoutLevel = bulletText.replace(/\(L\d+\)/, '').trim();
            const emDash = withoutLevel.indexOf('\u2014');
            if (emDash !== -1) {
                fields.name = withoutLevel.slice(0, emDash).trim();
                fields.keywords = withoutLevel.slice(emDash + 1).split(',').map(k => k.trim()).filter(Boolean);
            }
            else {
                fields.name = withoutLevel;
            }
            fields.level = level ?? 0;
            break;
        }
        case 'languages': {
            const boldMatch = bulletText.match(/^\*\*(.+?)\*\*:\s*(.+)/);
            if (boldMatch) {
                fields.language = boldMatch[1].trim();
                fields.fluency = boldMatch[2].replace(/\(L\d+\)/, '').trim();
            }
            else if (boldKey) {
                fields.language = boldKey;
                fields.fluency = (boldValue ?? '').replace(/\(L\d+\)/, '').trim();
            }
            fields.level = level ?? 0;
            break;
        }
        case 'profiles': {
            const boldMatch = bulletText.match(/^\*\*(.+?)\*\*:\s*(.+)/);
            if (boldMatch) {
                fields.network = boldMatch[1].trim();
                const rest = boldMatch[2].trim();
                const linkMatch = rest.match(/\[@?(.+?)\]\((.+?)\)/);
                if (linkMatch) {
                    fields.username = linkMatch[1];
                    fields.website = { url: linkMatch[2], label: linkMatch[1] };
                }
                else {
                    fields.username = rest.replace(/^@/, '');
                }
            }
            else if (boldKey) {
                fields.network = boldKey;
                fields.username = (boldValue ?? '').replace(/^@/, '');
            }
            break;
        }
    }
}
function mapHeadingParts(sectionName, fields, parts) {
    switch (sectionName) {
        case 'experience':
            if (parts.length >= 1 && !fields.position)
                fields.position = parts[0];
            if (parts.length >= 2 && !fields.company)
                fields.company = parts[1];
            if (parts.length >= 3 && !fields.period)
                fields.period = parts[2];
            break;
        case 'education':
            if (parts.length >= 1 && !fields.degree)
                fields.degree = parts[0];
            if (parts.length >= 2 && !fields.school)
                fields.school = parts[1];
            if (parts.length >= 3 && !fields.period)
                fields.period = parts[2];
            break;
        case 'projects':
            if (!fields.name)
                fields.name = parts[0] ?? '';
            if (parts.length >= 2 && !fields.period)
                fields.period = parts[1];
            break;
        case 'skills':
            if (!fields.name)
                fields.name = parts[0] ?? '';
            if (parts.length >= 2 && !fields.proficiency)
                fields.proficiency = parts[1];
            break;
        case 'languages':
            if (!fields.language)
                fields.language = parts[0] ?? '';
            if (parts.length >= 2 && !fields.fluency)
                fields.fluency = parts[1];
            break;
        case 'interests':
            if (!fields.name)
                fields.name = parts[0] ?? '';
            break;
        case 'certifications':
            if (!fields.title)
                fields.title = parts[0] ?? '';
            if (parts.length >= 2 && !fields.issuer)
                fields.issuer = parts[1];
            if (parts.length >= 3 && !fields.date)
                fields.date = parts[2];
            break;
        case 'awards':
            if (!fields.title)
                fields.title = parts[0] ?? '';
            if (parts.length >= 2 && !fields.awarder)
                fields.awarder = parts[1];
            if (parts.length >= 3 && !fields.date)
                fields.date = parts[2];
            break;
        case 'publications':
            if (!fields.title)
                fields.title = parts[0] ?? '';
            if (parts.length >= 2 && !fields.publisher)
                fields.publisher = parts[1];
            if (parts.length >= 3 && !fields.date)
                fields.date = parts[2];
            break;
        case 'volunteer':
            if (parts.length >= 1 && !fields.organization)
                fields.organization = parts[0];
            if (parts.length >= 2 && !fields.position)
                fields.position = parts[1];
            if (parts.length >= 3 && !fields.period)
                fields.period = parts[2];
            break;
        case 'references':
            if (parts.length >= 1 && !fields.name)
                fields.name = parts[0];
            if (parts.length >= 2 && !fields.position)
                fields.position = parts[1];
            break;
        case 'profiles':
            if (parts.length >= 1 && !fields.network)
                fields.network = parts[0];
            if (parts.length >= 2 && !fields.username)
                fields.username = parts[1];
            break;
        default:
            break;
    }
}
function normalizeResume(data) {
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
    const sections = data.sections;
    if (sections) {
        const allSectionKeys = ["profiles", "experience", "education", "projects", "skills", "languages", "interests", "awards", "certifications", "publications", "volunteer", "references"];
        for (const key of allSectionKeys) {
            if (!sections[key]) {
                sections[key] = { title: "", columns: 1, hidden: false, items: [] };
            }
        }
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
                    // id: only if truly missing (preserve existing IDs for identity resolution)
                    if (item.id === undefined)
                        item.id = crypto.randomUUID();
                    if (item.hidden === undefined)
                        item.hidden = false;
                    if (item.website === undefined) {
                        item.website = { url: "", label: "", inlineLink: false };
                    }
                    // ── Section-specific required fields ──
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
    // Normalize metadata for JSON Resume format
    if (data.metadata) {
        const m = data.metadata;
        if (Array.isArray(m.layout)) {
            m.layout = { sidebarWidth: 35, pages: [{ fullWidth: false, main: [], sidebar: [] }] };
        }
        if (!m.design) {
            m.design = { level: { icon: "star", type: "circle" }, colors: { primary: "rgba(0,0,0,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" } };
        }
        if (m.typography && typeof m.typography === "object") {
            const t = m.typography;
            if (!t.body)
                t.body = { fontFamily: "Inter", fontWeights: ["400"], fontSize: 11, lineHeight: 1.5 };
            if (!t.heading)
                t.heading = { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 };
        }
        if (m.page && typeof m.page === "object") {
            const p = m.page;
            if (p.gapX === undefined)
                p.gapX = 4;
            if (p.gapY === undefined)
                p.gapY = 6;
            if (p.marginX === undefined)
                p.marginX = 14;
            if (p.marginY === undefined)
                p.marginY = 12;
        }
    }
}
