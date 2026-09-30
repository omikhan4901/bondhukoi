/** "just now", "5 min ago", "2 h ago", "yesterday", "12 Oct" */
export function timeAgo(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** 18 → "6 PM", 0 → "12 AM" */
export function hourLabel(h) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${suffix}`;
}

/** "BK-7KQ2XM"-style friend codes shown in two halves: "NJ4K 7QX2". */
export const spacedCode = (code = '') => `${code.slice(0, 4)} ${code.slice(4)}`;

/** Pulls a friend code out of typed text ("nj4k 7qx2") or a scanned "bondhukoi://add/NJ4K7QX2". */
export function parseCode(text = '') {
  const m = text.toUpperCase().match(/([A-HJ-NP-Z2-9]{4})\s*-?\s*([A-HJ-NP-Z2-9]{4})\s*$/);
  return m ? m[1] + m[2] : null;
}
