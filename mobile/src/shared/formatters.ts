export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const dollars = cents / 100;
  return dollars >= 1000
    ? `$${dollars.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${dollars.toFixed(2)}`;
}

export function formatTrendPct(pct: number | null | undefined): string {
  if (pct == null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr}y ago`;
}

export function formatYearRange(start: number | null | undefined, end: number | null | undefined): string | null {
  if (start == null && end == null) return null;
  if (start == null) return String(end);
  if (end == null) return String(start);
  if (start === end) return String(start);
  return `${start}–${end}`;
}
