import { markdownToHtml } from '../../utils/markdown.js';
// ─── Helpers ──────────────────────────────────────────────────────────────
function coerceString(v) {
    if (typeof v === 'string')
        return v;
    if (typeof v === 'number' || typeof v === 'boolean')
        return String(v);
    return '';
}
function makeWebsite(url, label) {
    return {
        url: coerceString(url),
        label: coerceString(label),
    };
}
/** Convert an entry's description from markdown to HTML. */
function descriptionHtml(entry) {
    const desc = coerceString(entry.fields['description']);
    return desc ? markdownToHtml(desc) : '';
}
// ─── Item builders ────────────────────────────────────────────────────────
function buildExperienceItem(entry) {
    return {
        id: entry.identityComment ?? `exp-${entry.index}`,
        hidden: false,
        company: coerceString(entry.fields['company'] || entry.fields['name']),
        position: coerceString(entry.fields['position']),
        location: coerceString(entry.fields['Location'] ?? ''),
        period: coerceString(entry.fields['period'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildEducationItem(entry) {
    return {
        id: entry.identityComment ?? `edu-${entry.index}`,
        hidden: false,
        school: coerceString(entry.fields['school'] || entry.fields['name']),
        degree: coerceString(entry.fields['degree'] ?? ''),
        area: coerceString(entry.fields['Area'] ?? ''),
        grade: coerceString(entry.fields['Grade'] ?? ''),
        location: coerceString(entry.fields['Location'] ?? ''),
        period: coerceString(entry.fields['period'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildProjectItem(entry) {
    return {
        id: entry.identityComment ?? `proj-${entry.index}`,
        hidden: false,
        name: coerceString(entry.fields['name'] || entry.heading),
        period: coerceString(entry.fields['period'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildCertificationItem(entry) {
    return {
        id: entry.identityComment ?? `cert-${entry.index}`,
        hidden: false,
        title: coerceString(entry.fields['title'] || entry.fields['name']),
        issuer: coerceString(entry.fields['issuer'] ?? ''),
        date: coerceString(entry.fields['date'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildAwardItem(entry) {
    return {
        id: entry.identityComment ?? `award-${entry.index}`,
        hidden: false,
        title: coerceString(entry.fields['title'] || entry.fields['name']),
        awarder: coerceString(entry.fields['awarder'] ?? ''),
        date: coerceString(entry.fields['date'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildPublicationItem(entry) {
    return {
        id: entry.identityComment ?? `pub-${entry.index}`,
        hidden: false,
        title: coerceString(entry.fields['title'] || entry.fields['name']),
        publisher: coerceString(entry.fields['publisher'] ?? ''),
        date: coerceString(entry.fields['date'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
function buildVolunteerItem(entry) {
    return {
        id: entry.identityComment ?? `vol-${entry.index}`,
        hidden: false,
        organization: coerceString(entry.fields['organization'] || entry.fields['name']),
        position: coerceString(entry.fields['position'] ?? ''),
        location: coerceString(entry.fields['Location'] ?? ''),
        period: coerceString(entry.fields['period'] ?? ''),
        website: makeWebsite(entry.fields['websiteUrl'], entry.fields['websiteLabel']),
        description: descriptionHtml(entry),
    };
}
const BUILDERS = {
    experience: buildExperienceItem,
    education: buildEducationItem,
    projects: buildProjectItem,
    certifications: buildCertificationItem,
    awards: buildAwardItem,
    publications: buildPublicationItem,
    volunteer: buildVolunteerItem,
};
// ─── Public API ───────────────────────────────────────────────────────────
/**
 * Normalise all entries in a standard section (experience, education,
 * projects, certifications, awards, publications, volunteer) into typed
 * items matching the RR schema.
 *
 * Returns an array of item objects, or an empty array if the section
 * name is not recognised as a standard section.
 */
export function normalizeStandardSection(section) {
    const builder = BUILDERS[section.name];
    if (!builder)
        return [];
    return section.entries.map(entry => builder(entry));
}
//# sourceMappingURL=standard.js.map