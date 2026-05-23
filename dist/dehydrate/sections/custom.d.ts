import type { CustomSection } from '../../utils/types.js';
/**
 * Serialize a custom section to markdown.
 *
 * Custom sections have a dynamic schema.  Each item is rendered as:
 *
 *   ### {heading}
 *   <!-- id:{id} -->
 *   - **{key}**: {value}
 *
 * Hidden items (item.hidden === true) are skipped.  Fields named `id`,
 * `hidden`, `icon`, `iconColor`, and `columns` are never emitted.
 * Returns an empty string when no visible items remain.
 */
export declare function serializeCustom(section: CustomSection): string;
