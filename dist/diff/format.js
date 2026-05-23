/**
 * Format a DiffResult as a human-readable string (for --diff output).
 * Matches the sample format from the spec.
 */
export function formatDiff(result) {
    const lines = [];
    for (const section of result.changes) {
        if (section.entries.length === 0) {
            lines.push(`${section.section}:    unchanged`);
            continue;
        }
        const allUnchanged = section.entries.every((e) => e.type === 'unchanged');
        if (allUnchanged) {
            lines.push(`${section.section}:    unchanged`);
        }
        else if (section.entries.length === 1 && section.section === 'Summary') {
            const entry = section.entries[0];
            const details = entry.details.length > 0 ? entry.details.join(', ') : '';
            lines.push(`Summary:    ${details}`);
        }
        else {
            lines.push(`${section.section}:`);
            for (const entry of section.entries) {
                const prefix = formatPrefix(entry.type);
                const details = entry.details.length > 0
                    ? ` — ${entry.details.join(', ')}`
                    : '';
                lines.push(`  ${prefix}${entry.label}${details}`);
            }
        }
    }
    return lines.join('\n');
}
function formatPrefix(type) {
    switch (type) {
        case 'added': return '+ ';
        case 'removed': return '− ';
        case 'modified': return '✎ ';
        default: return '  ';
    }
}
