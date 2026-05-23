export interface FixResult {
    fixed: string[];
    unfixed: string[];
    content: string;
}
export declare function fixRxResumeMd(path: string, dryRun?: boolean): Promise<FixResult>;
