// ─── Diff types ─────────────────────────────────────────────────────────────
// Semantic diff types operating at the section/entry level (not text level).

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

// Exit codes
export const DIFF_NO_CHANGES = 0;
export const DIFF_CHANGES = 1;
export const DIFF_ERROR = 2;
