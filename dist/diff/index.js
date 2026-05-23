import { DIFF_CHANGES, DIFF_NO_CHANGES } from './types.js';
const SECTION_CONFIGS = [
    { key: 'profiles', label: 'Profiles', getLabel: (i) => i.network },
    { key: 'experience', label: 'Experience', getLabel: (i) => i.company },
    { key: 'education', label: 'Education', getLabel: (i) => i.school },
    { key: 'projects', label: 'Projects', getLabel: (i) => i.name },
    { key: 'skills', label: 'Skills', getLabel: (i) => i.name },
    { key: 'languages', label: 'Languages', getLabel: (i) => i.language },
    { key: 'interests', label: 'Interests', getLabel: (i) => i.name },
    { key: 'awards', label: 'Awards', getLabel: (i) => i.title },
    { key: 'certifications', label: 'Certifications', getLabel: (i) => i.title },
    { key: 'publications', label: 'Publications', getLabel: (i) => i.title },
    { key: 'volunteer', label: 'Volunteer', getLabel: (i) => i.organization },
    { key: 'references', label: 'References', getLabel: (i) => i.name },
];
// ─── Helpers ───────────────────────────────────────────────────────────────
function countBullets(html) {
    const matches = html.match(/<li[^>]*>/gi);
    return matches ? matches.length : 0;
}
function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}
function hasDescription(item) {
    return 'description' in item && typeof item.description === 'string';
}
function hasRoles(item) {
    return 'roles' in item && Array.isArray(item.roles);
}
function itemFingerprint(item) {
    const copy = {};
    for (const [key, value] of Object.entries(item)) {
        if (key === 'id' || key === 'hidden')
            continue;
        copy[key] = value;
    }
    return JSON.stringify(copy);
}
function diffItems(baseItems, updatedItems, getLabel) {
    const entries = [];
    const baseMap = new Map();
    const updatedMap = new Map();
    for (const item of baseItems) {
        baseMap.set(item.id, item);
    }
    for (const item of updatedItems) {
        updatedMap.set(item.id, item);
    }
    for (const item of baseItems) {
        if (!updatedMap.has(item.id)) {
            entries.push({
                index: entries.length,
                type: 'removed',
                id: item.id,
                label: getLabel(item),
                details: ['removed'],
            });
        }
    }
    for (const item of updatedItems) {
        const base = baseMap.get(item.id);
        if (!base) {
            entries.push({
                index: entries.length,
                type: 'added',
                id: item.id,
                label: getLabel(item),
                details: ['new entry'],
            });
        }
        else if (itemFingerprint(base) !== itemFingerprint(item)) {
            entries.push({
                index: entries.length,
                type: 'modified',
                id: item.id,
                label: getLabel(item),
                details: buildModificationDetails(base, item),
            });
        }
    }
    entries.sort((a, b) => {
        const order = { modified: 0, added: 1, removed: 2, unchanged: 3 };
        return order[a.type] - order[b.type];
    });
    for (let i = 0; i < entries.length; i++) {
        entries[i].index = i;
    }
    return entries;
}
function buildModificationDetails(base, updated) {
    const details = [];
    if (hasDescription(base) && hasDescription(updated)) {
        const baseBullets = countBullets(base.description);
        const updatedBullets = countBullets(updated.description);
        const baseWords = countWords(base.description);
        const updatedWords = countWords(updated.description);
        if (baseBullets !== updatedBullets) {
            details.push(`modified description (${baseBullets} → ${updatedBullets} bullets)`);
        }
        else if (baseWords !== updatedWords) {
            details.push(`modified description (${baseWords} → ${updatedWords} words)`);
        }
    }
    if (hasRoles(base) && hasRoles(updated)) {
        const baseRoles = base.roles.length;
        const updatedRoles = updated.roles.length;
        if (baseRoles !== updatedRoles) {
            details.push(`roles (${baseRoles} → ${updatedRoles})`);
        }
    }
    return details;
}
function diffSummary(base, updated) {
    const baseContent = base.summary.content ?? '';
    const updatedContent = updated.summary.content ?? '';
    const baseWc = countWords(baseContent);
    const updatedWc = countWords(updatedContent);
    if (baseWc === updatedWc) {
        return [];
    }
    return [
        {
            index: 0,
            type: 'modified',
            label: 'Summary',
            details: [`modified (${baseWc} → ${updatedWc} words)`],
        },
    ];
}
// ─── Public API ────────────────────────────────────────────────────────────
/**
 * Compute a semantic diff between a base resume and a rehydrated resume.
 * Operates at the section/entry level.
 *
 * For each section:
 *   - Compare item counts and identities
 *   - Detect adds, removes, modifications
 *   - For modifications, identify what specifically changed (description length, bullet count, etc.)
 */
export function computeDiff(base, updated) {
    const changes = [];
    let hasChanges = false;
    const summaryEntries = diffSummary(base, updated);
    if (summaryEntries.length > 0) {
        hasChanges = true;
        changes.push({
            section: 'Summary',
            type: 'modified',
            entries: summaryEntries,
        });
    }
    for (const config of SECTION_CONFIGS) {
        const baseSection = base.sections[config.key];
        const updatedSection = updated.sections[config.key];
        if (!baseSection || !updatedSection)
            continue;
        const baseItems = baseSection.items ?? [];
        const updatedItems = updatedSection.items ?? [];
        const entries = diffItems(baseItems, updatedItems, config.getLabel);
        if (entries.length > 0) {
            hasChanges = true;
            const allSameType = entries.every((e) => e.type === entries[0].type);
            const sectionType = allSameType ? entries[0].type : 'modified';
            changes.push({ section: config.label, type: sectionType, entries });
        }
    }
    return { changes, hasChanges };
}
export function getExitCode(result) {
    if (result.error)
        return 2;
    return result.hasChanges ? DIFF_CHANGES : DIFF_NO_CHANGES;
}
