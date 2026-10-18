/**
 * Beadwork: a picture-logic puzzle (nonogram). Each row and column has clues: the lengths of its runs of beads, in
 * order, with at least one empty peg between runs. Place beads to satisfy every clue; the picture they make is
 * then coloured and ironed. Cells: 1 bead, 0 marked empty, -1 unknown. Every picture here can be solved by
 * reasoning one line at a time, without guessing.
 */
export type Picture = { rows: string[] };
export type Cell = -1 | 0 | 1;

export function runs(line: ArrayLike<number>): number[] { const out: number[] = []; let n = 0; for (let i = 0; i < line.length; i++) { if (line[i] === 1) n++; else if (n) { out.push(n); n = 0; } } if (n) out.push(n); return out; }
export function solution(p: Picture) { return p.rows.map((r) => [...r].map((c) => (c === '.' ? 0 : 1))); }
export function clues(p: Picture) {
  const s = solution(p), H = s.length, W = s[0].length;
  return { rows: s.map((r) => runs(r)), cols: Array.from({ length: W }, (_, x) => runs(s.map((r) => r[x]))), W, H };
}
/**
 * What a line's clue forces, given what is known: each cell 1 or 0 if every arrangement agrees, else -1. Null if no
 * arrangement fits.
 */
export function lineSolve(clue: number[], cur: Cell[]): Cell[] | null {
  const L = cur.length, K = clue.length;
  // can[i][k]: clues k.. fit in cells i..
  const can: boolean[][] = Array.from({ length: L + 2 }, () => new Array(K + 1).fill(false));
  for (let i = L + 1; i >= 0; i--) for (let k = K; k >= 0; k--) {
    if (k === K) { let ok = true; for (let j = i; j < L; j++) if (cur[j] === 1) { ok = false; break; } can[i][k] = ok; continue; }
    if (i >= L) { can[i][k] = false; continue; }
    let ok = false;
    // leave cell i empty
    if (cur[i] !== 1 && can[i + 1][k]) ok = true;
    // or start run k here
    const b = clue[k];
    if (!ok && i + b <= L) { let fits = true; for (let j = i; j < i + b; j++) if (cur[j] === 0) { fits = false; break; } if (fits && (i + b === L || cur[i + b] !== 1) && can[Math.min(L + 1, i + b + 1)][k + 1]) ok = true; }
    can[i][k] = ok;
  }
  if (!can[0][0]) return null;
  // forward reachability, recording which values each cell can take
  const may1 = new Array(L).fill(false), may0 = new Array(L).fill(false);
  const reach: boolean[][] = Array.from({ length: L + 2 }, () => new Array(K + 1).fill(false));
  reach[0][0] = true;
  for (let i = 0; i <= L; i++) for (let k = 0; k <= K; k++) {
    if (!reach[i][k] || !can[i][k]) continue;
    if (i >= L) continue;
    if (k === K) { for (let j = i; j < L; j++) may0[j] = true; continue; }
    if (cur[i] !== 1 && can[i + 1][k]) { may0[i] = true; reach[i + 1][k] = true; }
    const b = clue[k];
    if (i + b <= L) {
      let fits = true; for (let j = i; j < i + b; j++) if (cur[j] === 0) { fits = false; break; }
      const nx = Math.min(L + 1, i + b + 1);
      if (fits && (i + b === L || cur[i + b] !== 1) && can[nx][k + 1]) { for (let j = i; j < i + b; j++) may1[j] = true; if (i + b < L) may0[i + b] = true; reach[nx][k + 1] = true; }
    }
  }
  return cur.map((_, j) => (may1[j] && !may0[j] ? 1 : may0[j] && !may1[j] ? 0 : -1)) as Cell[];
}
/** Line-by-line reasoning until nothing more follows. Returns the grid, or null on a contradiction. */
export function propagate(rowsC: number[][], colsC: number[][], g0: Cell[][]): Cell[][] | null {
  const g = g0.map((r) => r.slice()), H = g.length, W = g[0].length;
  for (let changed = true; changed;) {
    changed = false;
    for (let y = 0; y < H; y++) { const r = lineSolve(rowsC[y], g[y]); if (!r) return null; for (let x = 0; x < W; x++) if (g[y][x] === -1 && r[x] !== -1) { g[y][x] = r[x]; changed = true; } }
    for (let x = 0; x < W; x++) { const col = g.map((row) => row[x]); const r = lineSolve(colsC[x], col); if (!r) return null; for (let y = 0; y < H; y++) if (g[y][x] === -1 && r[y] !== -1) { g[y][x] = r[y]; changed = true; } }
  }
  return g;
}
/** Is the picture fully determined by line reasoning from nothing? */
export function lineSolvable(p: Picture) { const c = clues(p), g = propagate(c.rows, c.cols, Array.from({ length: c.H }, () => new Array(c.W).fill(-1))); return !!g && g.every((r) => r.every((v) => v !== -1)); }
/** A line is complete when its beads exactly match its clue. */
export function lineDone(clue: number[], line: ArrayLike<number>) { const r = runs(line); return r.length === clue.length && r.every((v, i) => v === clue[i]); }
export function solvedBy(p: Picture, beads: number[][]) { const s = solution(p); return s.every((r, y) => r.every((v, x) => (beads[y][x] === 1 ? 1 : 0) === v)); }
/**
 * The next cell reasoning gives from the player's (correct) beads and marks: the line that teaches the most, and a
 * cell in it. Null when the grid already holds everything.
 */
export function nextDeduction(p: Picture, known: Cell[][]): { x: number; y: number; v: Cell; line: 'row' | 'col'; index: number } | null {
  const c = clues(p);
  let best: { x: number; y: number; v: Cell; line: 'row' | 'col'; index: number; gain: number } | null = null;
  for (let y = 0; y < c.H; y++) { const r = lineSolve(c.rows[y], known[y]); if (!r) continue; const gain = r.filter((v, x) => v !== -1 && known[y][x] === -1 && v === 1).length * 2 + r.filter((v, x) => v !== -1 && known[y][x] === -1).length; const x = r.findIndex((v, x2) => v === 1 && known[y][x2] === -1); const x0 = x >= 0 ? x : r.findIndex((v, x2) => v !== -1 && known[y][x2] === -1); if (x0 >= 0 && (!best || gain > best.gain)) best = { x: x0, y, v: r[x0], line: 'row', index: y, gain }; }
  for (let x = 0; x < c.W; x++) { const col = known.map((row) => row[x]); const r = lineSolve(c.cols[x], col); if (!r) continue; const gain = r.filter((v, y) => v !== -1 && col[y] === -1 && v === 1).length * 2 + r.filter((v, y) => v !== -1 && col[y] === -1).length; const y = r.findIndex((v, y2) => v === 1 && col[y2] === -1); const y0 = y >= 0 ? y : r.findIndex((v, y2) => v !== -1 && col[y2] === -1); if (y0 >= 0 && (!best || gain > best.gain)) best = { x, y: y0, v: r[y0], line: 'col', index: x, gain }; }
  if (best) return best;
  // nothing follows from single lines: fall back to the answer
  const s = solution(p);
  for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) if (known[y][x] === -1) return { x, y, v: s[y][x] as Cell, line: 'row', index: y };
  return null;
}
/** Stars: three without a hint, two with one, one otherwise. */
export function starsFor(hints: number) { return hints === 0 ? 3 : hints === 1 ? 2 : 1; }
