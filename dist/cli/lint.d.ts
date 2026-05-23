export interface LintError {
    type: 'frontmatter' | 'structure' | 'identity' | 'content';
    message: string;
    line?: number;
    context?: string;
    fix?: string;
}
export declare function lintRxResumeMd(path: string): Promise<{
    errors: LintError[];
}>;
