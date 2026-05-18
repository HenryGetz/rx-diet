import { readFile, writeFile } from 'node:fs/promises';
import { stdin } from 'node:process';

/**
 * Read a JSON file and parse it to the given type.
 */
export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  const content = await readFile(path, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (cause) {
    throw new Error(
      `Failed to parse JSON from "${path}": ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

/**
 * Write data as JSON to a file.
 */
export async function writeJsonFile(path: string, data: unknown, pretty?: boolean): Promise<void> {
  let json: string;
  try {
    json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  } catch (cause) {
    throw new Error(
      `Failed to serialize data to JSON for "${path}": ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
  await writeFile(path, json + '\n', 'utf-8');
}

/**
 * Read a text file as a string.
 */
export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

/**
 * Write a string to a text file.
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  await writeFile(path, content, 'utf-8');
}

/**
 * Derive output paths from an input file path.
 *
 * - `.json` input  → base = input,  md/assets/lock are derived
 * - `.rxresume.md`  → md = input, base/assets/lock are derived
 */
export function derivePaths(inputPath: string): {
  md: string;
  assets: string;
  lock: string;
  base: string;
} {
  if (inputPath.endsWith('.rxresume.md')) {
    const stem = inputPath.slice(0, -'.rxresume.md'.length);
    return {
      md: inputPath,
      assets: `${stem}.rxresume.assets.json`,
      lock: `${stem}.rxresume.lock.json`,
      base: `${stem}.json`,
    };
  }

  if (inputPath.endsWith('.json')) {
    const stem = inputPath.slice(0, -'.json'.length);
    return {
      md: `${stem}.rxresume.md`,
      assets: `${stem}.rxresume.assets.json`,
      lock: `${stem}.rxresume.lock.json`,
      base: inputPath,
    };
  }

  throw new Error(
    `Unrecognized file extension: "${inputPath}". Expected a .json or .rxresume.md file.`
  );
}

/**
 * Read the entirety of stdin as a UTF-8 string.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Determine the operation to perform based on file extension.
 *
 * - `.json`        → `'dehydrate'`   (JSON → Markdown)
 * - `.rxresume.md` → `'rehydrate'`   (Markdown → JSON)
 */
export function detectOperation(path: string): 'dehydrate' | 'rehydrate' {
  if (path.endsWith('.rxresume.md')) {
    return 'rehydrate';
  }
  if (path.endsWith('.json')) {
    return 'dehydrate';
  }
  throw new Error(
    `Cannot detect operation for "${path}". Expected a .json (dehydrate) or .rxresume.md (rehydrate) file.`
  );
}
