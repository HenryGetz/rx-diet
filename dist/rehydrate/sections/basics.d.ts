import type { Basics } from '../../utils/types.js';
/**
 * Normalise the raw basics fields (produced by the token walker) into a
 * proper `Basics` object matching the RR schema.
 *
 * The raw record may contain:
 *   name, headline, email, phone, location,
 *   websiteUrl, websiteLabel,
 *   customFields: Array<{ display: string; value: string }>
 */
export declare function normalizeBasics(raw: Record<string, unknown>): Basics;
//# sourceMappingURL=basics.d.ts.map