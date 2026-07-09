export function minToSec(min: number): number {
  return Math.round(min * 60);
}

/** 345 → "5:45" · 2700 → "45:00" */
export function fmtSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function fmtMin(min: number): string {
  return fmtSec(minToSec(min));
}
