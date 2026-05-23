export type ChangeType = 'modified' | 'added' | 'removed' | 'unchanged';
export interface SectionDiff {
    section: string;
    type: ChangeType;
    entries: EntryDiff[];
}
export interface EntryDiff {
    index: number;
    type: ChangeType;
    id?: string;
    label: string;
    details: string[];
}
export interface DiffResult {
    changes: SectionDiff[];
    hasChanges: boolean;
    error?: string;
}
export declare const DIFF_NO_CHANGES = 0;
export declare const DIFF_CHANGES = 1;
export declare const DIFF_ERROR = 2;
