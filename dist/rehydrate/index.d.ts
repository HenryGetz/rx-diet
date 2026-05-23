import type { ResumeData } from '../utils/types.js';
import type { MergeChange } from '../merge/apply.js';
export interface RehydrateOptions {
    output?: string;
    base?: string;
    inPlace?: boolean;
    backup?: boolean;
    confirm?: boolean;
    dryRun?: boolean;
    diff?: boolean;
}
export interface RehydrateResult {
    merged: ResumeData;
    changes: MergeChange[];
    warnings: string[];
    fuzzyMatches: number;
    newEntries: number;
    removedEntries: number;
}
export declare function rehydrate(mdPath: string, options?: RehydrateOptions): Promise<RehydrateResult>;
export declare function rehydrateFile(inputPath: string, options?: RehydrateOptions): Promise<RehydrateResult>;
