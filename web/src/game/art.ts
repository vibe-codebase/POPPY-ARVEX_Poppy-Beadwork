/**
 * Beadwork art, painted with Canvas 2D, from above: a craft table scattered with loose beads, a translucent plastic
 * pegboard with a peg for every cell (and faint guide lines every five), glossy fuse beads (pearly while you work,
 * in the picture's colours when it is done), little pencil crosses for empty pegs, and the iron that fuses it all.
 */
export type Mood = { name: string; table: [string, string]; board: string; peg: string; ink: string; loose: string[] };
export const MOODS: Mood[] = [
  { name: 'sprinkles', table: ['#5a3a6a', '#3a2448'], board: '#ffb8d4', peg: '#ff8ab8', ink: '#5a1e3e', loose: ['#ff6aa0', '#ffd23a', '#7ac8f0', '#a86ae0', '#ffffff'] },
  { name: 'garden', table: ['#3e5a3a', '#243a22'], board: '#a8e8c4', peg: '#72cc9e', ink: '#14402a', loose: ['#ffd23a', '#ff8a2a', '#e8424a', '#7ad05a', '#ffffff'] },
  { name: 'seaside', table: ['#2a4a6e', '#16283e'], board: '#a4d4f4', peg: '#6eb4e4', ink: '#0e2e4e', loose: ['#ff8a2a', '#ffffff', '#3a6ac8', '#ff9ac0', '#ffd23a'] },
];
/** The picture palette. */
export const COLORS: Record<string, string> = { r: '#e8424a', w: '#fbfaf6', p: '#ff9ac0', d: '#2f8a3a', g: '#7ad05a', k: '#34303e', y: '#ffd23a', o: '#ff8a2a', n: '#8a5a32', l: '#7ac8f0', b: '#3a6ac8', v: '#a86ae0', s: '#9a9aa8' };
export const PEARL = '#f2ece2';
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}
export const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const TAU = Math.PI * 2;
export function hexA(hex: string, a: number) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
export function mix(a: string, b: string, t: number) {
  const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((p >> s) & 255) * (1 - t) + ((q >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
export const toInt = (hex: string) => parseInt(hex.slice(1), 16);

/** A single fuse bead seen from above, drawn into g at (x, y) with outer radius R. */
export function drawBead(g: CanvasRenderingContext2D, x: number, y: number, R: number, col: string, fused = false) {
  if (fused) {
    // ironed: a flattened rounded square that spreads to touch its neighbours, with a small sealed hole
    const s = R * 1.02, gr = g.createLinearGradient(x - s, y - s, x + s, y + s);
    gr.addColorStop(0, mix(col, '#ffffff', 0.25)); gr.addColorStop(1, mix(col, '#000000', 0.12));
    g.fillStyle = gr; g.beginPath(); g.roundRect(x - s, y - s, s * 2, s * 2, R * 0.42); g.fill();
    g.fillStyle = hexA(mix(col, '#000000', 0.35), 0.5); g.beginPath(); g.arc(x, y, R * 0.18, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x - R * 0.35, y - R * 0.4, R * 0.35, R * 0.14, -0.6, 0, TAU); g.fill();
    return;
  }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.arc(x + R * 0.08, y + R * 0.12, R, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R * 1.05);
  gr.addColorStop(0, mix(col, '#ffffff', 0.6)); gr.addColorStop(0.5, col); gr.addColorStop(1, mix(col, '#000000', 0.32));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  // the hole, showing the peg
  const hg = g.createRadialGradient(x + R * 0.06, y + R * 0.08, 0, x, y, R * 0.42); hg.addColorStop(0, mix(col, '#000000', 0.55)); hg.addColorStop(1, mix(col, '#000000', 0.2));
  g.fillStyle = hg; g.beginPath(); g.arc(x, y, R * 0.4, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = R * 0.12; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, R * 0.72, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
}
/** A bead texture of one cell. */
export function bead(cs: number, r: number, col: string, fused = false) {
  const k = cs * r, S = Math.ceil(k * 1.2), { c, g } = canvas(S, S);
  drawBead(g, S / 2, S / 2, k * (fused ? 0.5 : 0.4), col, fused);
  return c;
}
/** A pencil cross for a peg known to be empty. */
export function cross(cs: number, r: number, m: Mood) {
  const k = cs * r, { c, g } = canvas(k, k), a = k * 0.32, b = k * 0.68;
  g.strokeStyle = hexA(m.ink, 0.55); g.lineWidth = Math.max(1.5, k * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(a, a); g.lineTo(b, b); g.moveTo(b, a); g.lineTo(a, b); g.stroke();
  return c;
}
/** The pegboard: translucent coloured plastic, a peg per cell, guide lines every five. Canvas (w·cs + 2pad)·r. */
export function board(w: number, h: number, cs: number, r: number, m: Mood, pad: number) {
  const k = cs * r, P = pad * r, W = w * k + P * 2, H = h * k + P * 2, { c, g } = canvas(W, H);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(P * 0.2, P * 0.5, W - P * 0.2, H - P * 0.3, P * 1.2); g.fill();
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, mix(m.board, '#ffffff', 0.25)); gr.addColorStop(1, mix(m.board, '#000000', 0.06));
  g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, W - P * 0.15, H - P * 0.15, P * 1.1); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = P * 0.18; g.beginPath(); g.roundRect(P * 0.2, P * 0.2, W - P * 0.55, H - P * 0.55, P * 0.9); g.stroke();
  // guide lines every five pegs
  g.strokeStyle = hexA(m.ink, 0.16); g.lineWidth = Math.max(1, k * 0.035);
  for (let x = 5; x < w; x += 5) { g.beginPath(); g.moveTo(P + x * k, P * 0.6); g.lineTo(P + x * k, H - P * 0.75); g.stroke(); }
  for (let y = 5; y < h; y += 5) { g.beginPath(); g.moveTo(P * 0.6, P + y * k); g.lineTo(W - P * 0.75, P + y * k); g.stroke(); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = P + (x + 0.5) * k, cy = P + (y + 0.5) * k, pr = k * 0.13;
    g.fillStyle = hexA(mix(m.peg, '#000000', 0.3), 0.45); g.beginPath(); g.arc(cx + pr * 0.35, cy + pr * 0.5, pr, 0, TAU); g.fill();
    const pg = g.createRadialGradient(cx - pr * 0.4, cy - pr * 0.4, 0, cx, cy, pr); pg.addColorStop(0, mix(m.peg, '#ffffff', 0.55)); pg.addColorStop(1, m.peg);
    g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, pr, 0, TAU); g.fill();
  }
  return c;
}
/** The craft table with loose beads strewn about the edges. */
export function table(m: Mood, W: number, H: number, r: number, seed: number, keepOut: [number, number, number, number]) {
  const { c, g } = canvas(W * r, H * r); g.scale(r, r);
  const bg = g.createLinearGradient(0, 0, W * 0.3, H); bg.addColorStop(0, m.table[0]); bg.addColorStop(1, m.table[1]); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // a felt texture
  for (let i = 0; i < (W * H) / 30; i++) { g.fillStyle = `rgba(${hash(i, seed) < 0.5 ? '255,255,255' : '0,0,0'},0.035)`; g.fillRect(hash(i, seed + 1) * W, hash(i, seed + 2) * H, 1.2, 1.2); }
  const [kx, ky, kw, kh] = keepOut;
  for (let i = 0; i < 60; i++) {
    const side = i % 2, x = side ? W - 4 - hash(i, seed + 5) * 22 : 4 + hash(i, seed + 5) * 22, y = H * 0.12 + hash(i, seed + 6) * H * 0.76;
    if (x > kx - 10 && x < kx + kw + 10 && y > ky - 10 && y < ky + kh + 10) continue;
    drawBead(g, x, y, 5 + hash(i, 7) * 2.5, m.loose[i % m.loose.length]);
  }
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}
/** A steam iron from above, pointing up. */
export function iron(size: number, r: number) {
  const k = size * r, { c, g } = canvas(k, k * 1.25), cx = k / 2;
  const sole = () => { g.beginPath(); g.moveTo(cx, k * 0.05); g.bezierCurveTo(cx + k * 0.42, k * 0.45, cx + k * 0.44, k * 0.9, cx + k * 0.4, k * 1.15); g.lineTo(cx - k * 0.4, k * 1.15); g.bezierCurveTo(cx - k * 0.44, k * 0.9, cx - k * 0.42, k * 0.45, cx, k * 0.05); g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.save(); g.translate(k * 0.04, k * 0.06); sole(); g.fill(); g.restore();
  const gr = g.createLinearGradient(0, 0, k, 0); gr.addColorStop(0, '#d8dce4'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#a8b0bc');
  g.fillStyle = gr; sole(); g.fill();
  g.fillStyle = '#5ab4c8'; g.beginPath(); g.moveTo(cx, k * 0.22); g.bezierCurveTo(cx + k * 0.3, k * 0.5, cx + k * 0.32, k * 0.85, cx + k * 0.28, k * 1.05); g.lineTo(cx - k * 0.28, k * 1.05); g.bezierCurveTo(cx - k * 0.32, k * 0.85, cx - k * 0.3, k * 0.5, cx, k * 0.22); g.fill();
  g.fillStyle = '#2a3a4a'; g.beginPath(); g.roundRect(cx - k * 0.08, k * 0.45, k * 0.16, k * 0.52, k * 0.08); g.fill();
  g.fillStyle = '#ff6a4a'; g.beginPath(); g.arc(cx, k * 0.38, k * 0.04, 0, TAU); g.fill();
  return c;
}
/** A soft round puff for steam and sparkles. */
export function puff(size: number) {
  const { c, g } = canvas(size, size), h = size / 2, d = g.createRadialGradient(h, h, 0, h, h, h);
  d.addColorStop(0, 'rgba(255,255,255,0.9)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, size, size);
  return c;
}
