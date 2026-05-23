import { mergeEntry } from './merge.js';
// ─── Section Names ───────────────────────────────────────────────────────
//
// The canonical ordered list of all section keys in the ResumeData.sections
// object. Used as the iteration baseline for merging.
const SECTION_NAMES = [
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
// ─── Apply Full Merge ────────────────────────────────────────────────────
/**
 * Apply a full merge of parsed markdown section entries back into a base
 * ResumeData object.
 *
 * For each section:
 *  1. Process parsed (markdown) entries in order.
 *     - Resolved entries → merge content fields into the matching base item.
 *     - Unresolved entries → add as new items.
 *  2. Track which base items were matched.
 *  3. Unmatched base items → hard-delete (removed from output).
 *
 * Non-content fields (`id`, `hidden`, `icon`, `iconColor`, `website` object,
 * `roles`, `level`, metadata, layout, template, typography, picture) are
 * NEVER touched — enforced by `mergeEntry`'s CONTENT_FIELDS contract.
 *
 * @param base            The original base ResumeData (not mutated).
 * @param parsedSections  Markdown-parsed section data, keyed by section name.
 *                        Each entry carries its identity resolution result
 *                        and the parsed content fields.
 * @returns A MergeResult containing the merged document, a change log, and
 *          any warnings encountered.
 */
export function applyMerge(base, parsedSections) {
    const merged = JSON.parse(JSON.stringify(base));
    const changes = [];
    const warnings = [];
    for (const sectionName of SECTION_NAMES) {
        const section = merged.sections[sectionName];
        if (!section) {
            warnings.push(`Section "${sectionName}" not found in base resume — skipping`);
            continue;
        }
        const baseItems = base.sections[sectionName]?.items ?? [];
        const parsedEntries = parsedSections[sectionName] ?? [];
        const matchedIds = new Set();
        const mergedItems = [];
        for (const entry of parsedEntries) {
            if (entry.resolution.resolved) {
                const resolvedId = entry.resolution.id;
                const baseItem = baseItems.find((item) => item.id === resolvedId);
                if (baseItem) {
                    matchedIds.add(resolvedId);
                    const mergedItem = mergeEntry(baseItem, entry.fields, sectionName, entry.resolution);
                    mergedItems.push(mergedItem);
                    changes.push({
                        section: sectionName,
                        index: mergedItems.length - 1,
                        type: 'modified',
                        id: resolvedId,
                    });
                }
                else {
                    // Resolution claims a match but the item no longer exists — treat as new
                    warnings.push(`Entry resolved to id "${resolvedId}" in section "${sectionName}" but no matching base item found — adding as new entry`);
                    const newItem = {
                        ...entry.fields,
                        id: resolvedId,
                    };
                    mergedItems.push(newItem);
                    changes.push({
                        section: sectionName,
                        index: mergedItems.length - 1,
                        type: 'added',
                        id: resolvedId,
                    });
                }
            }
            else {
                const newItem = { ...entry.fields };
                mergedItems.push(newItem);
                changes.push({
                    section: sectionName,
                    index: mergedItems.length - 1,
                    type: 'added',
                    id: newItem.id,
                });
            }
        }
        for (const baseItem of baseItems) {
            if (!matchedIds.has(baseItem.id)) {
                changes.push({
                    section: sectionName,
                    index: -1,
                    type: 'removed',
                    id: baseItem.id,
                });
            }
        }
        merged.sections[sectionName].items = mergedItems;
    }
    return { merged, changes, warnings };
}
//# sourceMappingURL=apply.js.map