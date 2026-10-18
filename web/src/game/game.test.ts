import { describe, expect, it } from 'vitest';
import { clues, lineDone, lineSolvable, lineSolve, nextDeduction, propagate, runs, solution, solvedBy, starsFor, type Cell } from './sim';
import { CHAPTERS, LEVELS, levelIndex } from './levels';
import { COLORS } from './art';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

const U = (n: number) => new Array(n).fill(-1) as Cell[];

describe('lines', () => {
  it('reads runs', () => { expect(runs([1, 1, 0, 1, 0, 0, 1, 1, 1])).toEqual([2, 1, 3]); expect(runs([0, 0])).toEqual([]); });
  it('finds the overlap of a long run', () => { expect(lineSolve([4], U(6))).toEqual([-1, -1, 1, 1, -1, -1]); expect(lineSolve([3, 2], U(6))).toEqual([1, 1, 1, 0, 1, 1]); });
  it('an empty clue empties the line; a contradiction gives null', () => { expect(lineSolve([], U(3))).toEqual([0, 0, 0]); expect(lineSolve([2], [1, 0, 1] as Cell[])).toBeNull(); });
  it('uses what is known', () => { expect(lineSolve([1, 1], [-1, 1, -1, -1, -1] as Cell[])).toEqual([0, 1, 0, -1, -1]); });
  it('checks finished lines', () => { expect(lineDone([2, 1], [1, 1, 0, 1])).toBe(true); expect(lineDone([2, 1], [1, 1, 1, 0])).toBe(false); });
  it('stars', () => { expect(starsFor(0)).toBe(3); expect(starsFor(1)).toBe(2); expect(starsFor(3)).toBe(1); });
});

describe('patterns', () => {
  it('has 24 pictures in three chapters of eight, with unique ids, names and titles', () => {
    expect(LEVELS).toHaveLength(24); expect(CHAPTERS).toHaveLength(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8);
    for (const k of ['id', 'name', 'title'] as const) expect(new Set(LEVELS.map((l) => l[k])).size).toBe(24);
    expect(levelIndex(LEVELS[9].id)).toBe(9);
  });
  it('small, then ten by ten, then twelve by twelve', () => {
    LEVELS.forEach((l) => { if (l.chapter === 0) expect(Math.max(l.w, l.h)).toBeLessThanOrEqual(9); if (l.chapter === 1) expect([l.w, l.h]).toEqual([10, 10]); if (l.chapter === 2) expect([l.w, l.h]).toEqual([12, 12]); });
  });
});

describe('every picture', () => {
  for (const l of LEVELS) {
    it(`${l.id}: rectangular, known colours, solvable line by line, and the hints walk all the way to it`, () => {
      expect(l.rows.every((r) => r.length === l.w)).toBe(true);
      expect([...l.rows.join('')].every((c) => c === '.' || COLORS[c])).toBe(true);
      expect(lineSolvable(l)).toBe(true);
      const c = clues(l), g = propagate(c.rows, c.cols, Array.from({ length: l.h }, () => U(l.w)))!;
      expect(solvedBy(l, g)).toBe(true);
      // following hints alone fills the board correctly
      const k = Array.from({ length: l.h }, () => U(l.w)), s = solution(l);
      for (let n = 0; n < l.w * l.h; n++) { const d = nextDeduction(l, k); if (!d) break; expect(d.v).toBe(s[d.y][d.x]); k[d.y][d.x] = d.v; }
      expect(solvedBy(l, k)).toBe(true);
      expect(l.fill).toBeGreaterThan(l.w * l.h * 0.3);
    });
  }
});

describe('save', () => {
  it('parses safely and records the best', () => {
    expect(parseSave(null)).toEqual(freshSave()); expect(parseSave('{bad')).toEqual(freshSave());
    let t = recordResult(freshSave(), LEVELS[0].id, 2, 1); t = recordResult(t, LEVELS[0].id, 3, 0);
    expect(t.stars[LEVELS[0].id]).toBe(3); expect(t.best[LEVELS[0].id]).toBe(0); expect(totalStars(t)).toBe(3);
  });
  it('unlocks in order', () => { const s = freshSave(); expect(isUnlocked(s, 1)).toBe(false); expect(isUnlocked(recordResult(s, LEVELS[0].id, 1, 2), 1)).toBe(true); });
});
