/**
 * Read a JSON file and parse it to the given type.
 */
export declare function readJsonFile<T = unknown>(path: string): Promise<T>;
/**
 * Write data as JSON to a file.
 */
export declare function writeJsonFile(path: string, data: unknown, pretty?: boolean): Promise<void>;
/**
 * Read a text file as a string.
 */
export declare function readTextFile(path: string): Promise<string>;
/**
 * Write a string to a text file.
 */
export declare function writeTextFile(path: string, content: string): Promise<void>;
/**
 * Derive output paths from an input file path.
 *
 * - `.json` input  → base = input,  md/assets/lock are derived
 * - `.rxresume.md`  → md = input, base/assets/lock are derived
 */
export declare function derivePaths(inputPath: string): {
    md: string;
    assets: string;
    lock: string;
    base: string;
};
/**
 * Read the entirety of stdin as a UTF-8 string.
 */
export declare function readStdin(): Promise<string>;
/**
 * Determine the operation to perform based on file extension.
 *
 * - `.json`        → `'dehydrate'`   (JSON → Markdown)
 * - `.rxresume.md` → `'rehydrate'`   (Markdown → JSON)
 */
export declare function detectOperation(path: string): 'dehydrate' | 'rehydrate';
