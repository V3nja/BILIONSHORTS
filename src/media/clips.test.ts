import { describe, expect, it } from 'vitest';
import { clampBoundaries, formatTime } from './clips';

describe('clip time helpers', () => {
  it('clamps negative starts and ends to media duration', () => { expect(clampBoundaries(-3, 92, 80)).toEqual({ start: 0, end: 80 }); });
  it('never returns an end before the start', () => { expect(clampBoundaries(25, 10, 50)).toEqual({ start: 25, end: 25 }); });
  it('rejects non-finite bounds', () => { expect(() => clampBoundaries(Number.NaN, 5, 10)).toThrow(); });
  it('formats media timestamps', () => { expect(formatTime(65.9)).toBe('01:05'); });
});
