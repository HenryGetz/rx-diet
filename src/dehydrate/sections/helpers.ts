/**
 * Normalize a date string to YYYY-MM or YYYY-MM-DD format.
 *
 * Handles: "Jan 2020", "January 2020", "2020-01", "2020-01-15", "2020"
 * Returns the original string as-is if it can't be parsed.
 */
export function normalizeDate(date: string): string {
  const d = date.trim();
  if (!d) return '';

  if (/^\d{4}-\d{2}(-\d{2})?$/.test(d)) return d;

  if (/^\d{4}$/.test(d)) return d;

  const months: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const match = d.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const monthStr = match[1]!.toLowerCase();
    const monthNum = months[monthStr];
    if (monthNum) return `${match[2]!}-${monthNum}`;
  }

  return d;
}

export function normalizePeriod(period: string): string {
  const trimmed = period.trim();
  if (!trimmed) return '';

  const parts = trimmed.split(' - ').map(p => p.trim());
  const filtered = parts.filter(p => p.length > 0);
  if (filtered.length === 0) return trimmed;

  const normalized = filtered.map(p => {
    if (/^(present|current|now)$/i.test(p)) return p;
    return normalizeDate(p);
  });

  return normalized.join(' - ');
}
