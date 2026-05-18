// ─── Asset sidecar ────────────────────────────────────────────────────────
// Strips and restores binary blobs (data: URLs, large base64 strings) from
// the resume JSON so they don't pollute LLM context during markdown
// conversion.  Extracted assets are stored in an optional `.rxresume.assets.json`
// sidecar file keyed by JSON-path.

import type { ResumeData, Sections } from '../utils/types.js';
import { ASSET_SENTINEL_PREFIX } from '../utils/types.js';
import { readJsonFile, writeJsonFile } from '../utils/file.js';

// Re-export so callers can reference it without importing types directly.
export { ASSET_SENTINEL_PREFIX } from '../utils/types.js';

// ─── Types ───────────────────────────────────────────────────────────────

export interface AssetStore {
  [path: string]: string; // path like "basics.picture.url" → original value
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Extract assets from a ResumeData object.
 *
 * Scans the entire resume for fields that contain large binary data
 * (data: URLs, or strings exceeding a threshold size).
 * Replaces them inline with sentinel strings like
 * `"__rx_diet_asset__:picture.url"` and collects the originals into an
 * AssetStore.
 *
 * Returns: [cleaned data, asset store, count of assets stripped]
 *
 * The input object is NOT mutated – a deep clone is used internally.
 */
export function extractAssets(data: ResumeData): [ResumeData, AssetStore, number] {
  const store: AssetStore = {};
  let count = 0;

  const cleaned = JSON.parse(JSON.stringify(data)) as ResumeData;

  if (cleaned.picture) {
    count += checkAndReplace(cleaned, 'picture.url', cleaned.picture as unknown as Record<string, unknown>, 'url', store);
  }

  if (cleaned.basics?.customFields) {
    for (let i = 0; i < cleaned.basics.customFields.length; i++) {
      const field = cleaned.basics.customFields[i];
      if (!field) continue;
      count += checkAndReplace(cleaned, `basics.customFields.${i}.icon`, field as unknown as Record<string, unknown>, 'icon', store);
    }
  }

  if (cleaned.sections) {
    for (const sectionKey of Object.keys(cleaned.sections) as (keyof Sections)[]) {
      const section = cleaned.sections[sectionKey];
      if (!section) continue;
      const items = (section as { items: unknown[] }).items;
      if (!Array.isArray(items)) continue;

      for (let i = 0; i < items.length; i++) {
        const item = items[i] as Record<string, unknown> | undefined;
        if (!item) continue;

        const prefix = `sections.${sectionKey}.items.${i}`;

        if (item.website && typeof item.website === 'object' && !Array.isArray(item.website)) {
          const web = item.website as Record<string, unknown>;
          count += checkAndReplace(cleaned, `${prefix}.website.url`, web, 'url', store);
        }

        count += checkAndReplace(cleaned, `${prefix}.icon`, item, 'icon', store);
      }
    }
  }

  if (cleaned.customSections) {
    for (let s = 0; s < cleaned.customSections.length; s++) {
      const cs = cleaned.customSections[s]!;
      for (let i = 0; i < cs.items.length; i++) {
        const item = cs.items[i]! as Record<string, unknown>;
        const prefix = `customSections.${s}.items.${i}`;
        for (const key of Object.keys(item)) {
          count += checkAndReplace(cleaned, `${prefix}.${key}`, item, key, store);
        }
      }
    }
  }

  return [cleaned, store, count];
}

/**
 * Restore assets into a ResumeData object.
 *
 * Replaces sentinel strings with their original values from the asset store.
 * The data object is modified **in-place**.
 */
export function restoreAssets(data: ResumeData, store: AssetStore): void {
  walkAndRestore(data, store);
}

/**
 * Read an asset sidecar JSON file.
 */
export async function readAssetStore(path: string): Promise<AssetStore> {
  return readJsonFile<AssetStore>(path);
}

/**
 * Write an asset store to a JSON file.
 *
 * Only writes if the store is non-empty (avoid creating empty sidecar files).
 */
export async function writeAssetStore(path: string, store: AssetStore): Promise<void> {
  if (Object.keys(store).length === 0) return;
  await writeJsonFile(path, store, true);
}

// ─── Internal helpers ──────────────────────────────────────────────────

/**
 * If `obj[key]` is a string and qualifies for stripping, replace it with
 * a sentinel and record the original in `store`.  Returns 1 if stripped, 0
 * otherwise.
 *
 * IMPORTANT: The `cleaned` root is passed solely for the sentinel path
 * syntax – the value is read from `obj[key]`.
 */
function checkAndReplace(
  _cleaned: ResumeData,
  path: string,
  obj: Record<string, unknown>,
  key: string,
  store: AssetStore,
): 0 | 1 {
  const value = obj[key];
  if (typeof value !== 'string') return 0;
  if (!shouldStrip(value as string)) return 0;

  store[path] = value as string;
  obj[key] = `${ASSET_SENTINEL_PREFIX}${path}`;
  return 1;
}

/**
 * Returns `true` when `value` looks like binary data that should be
 * stripped: either a data: URL or a string longer than 1024 characters.
 */
function shouldStrip(value: string): boolean {
  return isDataUrl(value) || isLargeString(value);
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

function isLargeString(value: string): boolean {
  return value.length > 1024;
}

/**
 * Recursively walk an arbitrary value, replacing any string that starts
 * with `ASSET_SENTINEL_PREFIX` with the corresponding entry from `store`.
 * Modifies arrays and plain objects **in-place**.
 */
function walkAndRestore(obj: unknown, store: AssetStore): void {
  if (typeof obj !== 'object' || obj === null) return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const val = obj[i];
      if (typeof val === 'string') {
        const stored = lookupSentinel(val, store);
        if (stored !== undefined) {
          obj[i] = stored;
        }
      } else if (typeof val === 'object' && val !== null) {
        walkAndRestore(val, store);
      }
    }
    return;
  }

  // Plain object
  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (typeof val === 'string') {
      const stored = lookupSentinel(val, store);
      if (stored !== undefined) {
        record[key] = stored;
      }
    } else if (typeof val === 'object' && val !== null) {
      walkAndRestore(val, store);
    }
  }
}

/**
 * If `str` starts with the sentinel prefix, return the original value from
 * `store`.  Otherwise return `undefined`.
 */
function lookupSentinel(str: string, store: AssetStore): string | undefined {
  if (!str.startsWith(ASSET_SENTINEL_PREFIX)) return undefined;
  const storeKey = str.slice(ASSET_SENTINEL_PREFIX.length);
  return store[storeKey];
}
