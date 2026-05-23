import { readTextFile } from '../utils/file.js';
import { parseFrontmatter } from '../utils/yaml.js';
import { parseRxMarkdown } from '../rehydrate/parser.js';
import { GRAMMAR_VERSION } from '../schema/v5/index.js';
export async function lintRxResumeMd(path) {
    const errors = [];
    let content;
    try {
        content = await readTextFile(path);
    }
    catch (e) {
        errors.push({
            type: 'content',
            message: `Cannot read file: ${e instanceof Error ? e.message : String(e)}`,
            fix: 'Ensure the file exists and is readable',
        });
        return { errors };
    }
    let frontmatter;
    try {
        const [fm] = parseFrontmatter(content);
        frontmatter = fm;
    }
    catch (e) {
        errors.push({
            type: 'frontmatter',
            message: `Invalid frontmatter: ${e instanceof Error ? e.message : String(e)}`,
            fix: 'Ensure frontmatter starts with --- and contains valid YAML',
        });
        return { errors };
    }
    if (!frontmatter.rx_diet_version) {
        errors.push({
            type: 'frontmatter',
            message: 'Missing rx_diet_version in frontmatter',
            fix: 'Add rx_diet_version: 1 to frontmatter',
        });
    }
    else if (Number(frontmatter.rx_diet_version) !== GRAMMAR_VERSION) {
        errors.push({
            type: 'frontmatter',
            message: `rx_diet_version ${frontmatter.rx_diet_version} does not match expected ${GRAMMAR_VERSION}`,
            fix: 'Re-dehydrate from the original JSON with the current rx-diet version',
        });
    }
    if (!frontmatter.rxresume_schema) {
        errors.push({
            type: 'frontmatter',
            message: 'Missing rxresume_schema in frontmatter',
            fix: 'Add rxresume_schema: v5 (or the appropriate schema version) to frontmatter',
        });
    }
    if (!frontmatter.source) {
        errors.push({
            type: 'frontmatter',
            message: 'Missing source in frontmatter',
            fix: 'Add source: <original-json-filename>.json to frontmatter',
        });
    }
    let parsed;
    try {
        const { result } = parseRxMarkdown(content);
        parsed = result;
    }
    catch (e) {
        errors.push({
            type: 'structure',
            message: `Failed to parse markdown body: ${e instanceof Error ? e.message : String(e)}`,
            fix: 'Check that the markdown follows the .rxresume.md format: H1 for name, H2 for sections, H3 for entries',
        });
        return { errors };
    }
    if (!parsed.basics || !parsed.basics.name) {
        errors.push({
            type: 'structure',
            message: 'Missing name in basics section',
            fix: 'Add "# Your Name" as the first H1 heading after frontmatter',
        });
    }
    for (const section of parsed.sections) {
        if (section.isCustom && section.entries.length === 0) {
            errors.push({
                type: 'structure',
                message: `Custom section "${section.heading}" has no entries`,
                fix: 'Add entries with ### headings, or remove the empty section',
            });
        }
    }
    const knownSectionNames = new Set([
        'profiles', 'experience', 'education', 'projects', 'skills',
        'languages', 'interests', 'awards', 'certifications', 'publications',
        'volunteer', 'references',
    ]);
    const listBasedSections = new Set(['profiles', 'skills', 'languages']);
    let missingIdCount = 0;
    for (const section of parsed.sections) {
        if (!knownSectionNames.has(section.name))
            continue;
        if (listBasedSections.has(section.name))
            continue;
        for (const entry of section.entries) {
            const e = entry;
            if (!e.identityComment && e.heading) {
                missingIdCount++;
            }
        }
    }
    if (missingIdCount > 0) {
        errors.push({
            type: 'identity',
            message: `${missingIdCount} entries are missing identity comments`,
            fix: 'Each ### entry heading should be followed by <!-- id:UUID --> on the next line. Without this, rx-diet will use fuzzy matching (requires --confirm).',
        });
    }
    return { errors };
}
//# sourceMappingURL=lint.js.map