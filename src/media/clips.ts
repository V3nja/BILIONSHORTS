export type Clip = { id: number; title: string; start: number; end: number; score: number; tag: string; caption: string; style: string; color: string };
export function clampBoundaries(start: number, end: number, duration: number) {
  if (![start, end, duration].every(Number.isFinite) || duration < 0) throw new Error('Clip times must be valid numbers.');
  const safeStart = Math.max(0, Math.min(start, duration));
  const safeEnd = Math.max(safeStart, Math.min(end, duration));
  return { start: safeStart, end: safeEnd };
}
export function formatTime(seconds: number) { const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0)); return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${(safe % 60).toString().padStart(2, '0')}`; }
