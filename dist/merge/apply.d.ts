import type { ResumeData } from '../utils/types.js';
import type { IdentityResolution } from './identity.js';
export interface MergeResult {
    merged: ResumeData;
    changes: MergeChange[];
    warnings: string[];
}
export interface MergeChange {
    section: string;
    index: number;
    type: 'modified' | 'added' | 'removed' | 'unchanged';
    id?: string;
}
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
export declare function applyMerge(base: ResumeData, parsedSections: Record<string, Array<{
    fields: Record<string, unknown>;
    resolution: IdentityResolution;
}>>): MergeResult;
