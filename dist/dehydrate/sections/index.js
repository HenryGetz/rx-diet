import { serializeBasics } from './basics.js';
import { serializeSummary } from './summary.js';
import { serializeSkills } from './skills.js';
import { serializeLanguages } from './languages.js';
import { serializeInterests } from './interests.js';
import { serializeProfiles } from './profiles.js';
import { serializeReferences } from './references.js';
import { serializeCustom } from './custom.js';
import { serializeExperience } from './experience.js';
import { serializeEducation } from './education.js';
import { serializeProjects } from './projects.js';
import { serializeCertifications } from './certifications.js';
import { serializeAwards } from './awards.js';
import { serializePublications } from './publications.js';
import { serializeVolunteer } from './volunteer.js';
function stub(_data) {
    return '';
}
/**
 * Widen a typed serializer to the generic `(data: unknown) => string` signature.
 *
 * The registry stores all serializers under a uniform type so the orchestrator
 * can dispatch any section by name.  Each wrapper is a no-op at runtime — the
 * correct section type is guaranteed by the caller.
 */
function wrap(fn) {
    return (data) => fn(data);
}
export const SECTION_SERIALIZERS = {
    // Implemented
    basics: wrap(serializeBasics),
    summary: wrap(serializeSummary),
    skills: wrap(serializeSkills),
    languages: wrap(serializeLanguages),
    interests: wrap(serializeInterests),
    profiles: wrap(serializeProfiles),
    references: wrap(serializeReferences),
    // Custom sections use a dynamic schema; handled generically
    custom: wrap(serializeCustom),
    experience: wrap(serializeExperience),
    education: wrap(serializeEducation),
    projects: wrap(serializeProjects),
    awards: wrap(serializeAwards),
    certifications: wrap(serializeCertifications),
    publications: wrap(serializePublications),
    volunteer: wrap(serializeVolunteer),
};
//# sourceMappingURL=index.js.map