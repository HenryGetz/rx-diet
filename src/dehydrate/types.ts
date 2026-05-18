import type { RxFrontmatter } from '../utils/types.js';

export interface DehydrateResult {
  markdown: string;
  frontmatter: RxFrontmatter;
  assetCount: number;
  warnings: string[];
  idMap: Record<string, string>;
}

export interface DehydrateOptions {
  output?: string;
  base?: string;
}
