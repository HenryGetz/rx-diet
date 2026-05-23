/**
 * Normalise the raw basics fields (produced by the token walker) into a
 * proper `Basics` object matching the RR schema.
 *
 * The raw record may contain:
 *   name, headline, email, phone, location,
 *   websiteUrl, websiteLabel,
 *   customFields: Array<{ display: string; value: string }>
 */
export function normalizeBasics(raw) {
    const name = coerceString(raw['name']);
    const headline = coerceString(raw['headline']);
    const email = coerceString(raw['email']);
    const phone = coerceString(raw['phone']);
    const location = coerceString(raw['location']);
    const website = {
        url: coerceString(raw['websiteUrl']),
        label: coerceString(raw['websiteLabel']),
    };
    const customFields = [];
    const rawCustom = raw['customFields'];
    if (Array.isArray(rawCustom)) {
        for (let i = 0; i < rawCustom.length; i++) {
            const item = rawCustom[i];
            if (!item || typeof item !== 'object')
                continue;
            const display = item['display'] ?? '';
            const value = item['value'] ?? '';
            if (!display && !value)
                continue;
            customFields.push({
                id: `custom-${i}`,
                icon: '',
                text: display || value,
            });
        }
    }
    return { name, headline, email, phone, location, website, customFields };
}
function coerceString(v) {
    if (typeof v === 'string')
        return v;
    if (typeof v === 'number' || typeof v === 'boolean')
        return String(v);
    return '';
}
