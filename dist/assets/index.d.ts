import type { ResumeData } from '../utils/types.js';
export { ASSET_SENTINEL_PREFIX } from '../utils/types.js';
export interface AssetStore {
    [path: string]: string;
}
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
export declare function extractAssets(data: ResumeData): [ResumeData, AssetStore, number];
/**
 * Restore assets into a ResumeData object.
 *
 * Replaces sentinel strings with their original values from the asset store.
 * The data object is modified **in-place**.
 */
export declare function restoreAssets(data: ResumeData, store: AssetStore): void;
/**
 * Read an asset sidecar JSON file.
 */
export declare function readAssetStore(path: string): Promise<AssetStore>;
/**
 * Write an asset store to a JSON file.
 *
 * Only writes if the store is non-empty (avoid creating empty sidecar files).
 */
export declare function writeAssetStore(path: string, store: AssetStore): Promise<void>;
