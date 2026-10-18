// Store icon, adaptive-icon layers, splash and feature graphic: a pegboard picture half ironed, beads strewn about.
import * as A from '../src/game/art';
import { LEVELS } from '../src/game/levels';

const PK = A.MOODS[0], SEA = A.MOODS[2];
/** A pegboard with a picture: beads ironed left of `ironX` (a column), glossy beyond it; pearly where `pearl`. */
function pegboard(g: CanvasRenderingContext2D, rows: string[], cs: number, ox: number, oy: number, m: A.Mood, ironX: number, pearlFrom = 99) {
  const w = rows[0].length, h = rows.length, pad = cs * 0.35;
  g.drawImage(A.board(w, h, cs, 1, m, pad), ox - pad, oy - pad);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const X = ox + (x + 0.5) * cs, Y = oy + (y + 0.5) * cs, fused = x < ironX;
    A.drawBead(g, X, Y, cs * (fused ? 0.5 : 0.4), y >= pearlFrom ? A.PEARL : A.COLORS[ch], fused);
  }));
}
function iconArt(g: CanvasRenderingContext2D, S: number, bg: boolean) {
  const heart = LEVELS.find((l) => l.id === 'heart')!.rows, cs = S * 0.115, w = heart[0].length, h = heart.length;
  if (bg) { g.fillStyle = PK.board; g.fillRect(0, 0, S, S); for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { g.fillStyle = PK.peg; g.beginPath(); g.arc((x + 0.5) * S / 9, (y + 0.5) * S / 9, S * 0.014, 0, Math.PI * 2); g.fill(); } }
  const ox = (S - w * cs) / 2, oy = (S - h * cs) / 2 + cs * 0.3;
  heart.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') A.drawBead(g, ox + (x + 0.5) * cs, oy + (y + 0.5) * cs, cs * (x < 4 ? 0.5 : 0.4), A.COLORS[ch], x < 4); }));
}
export function icon() { const { c, g } = A.canvas(1024, 1024); iconArt(g, 1024, true); return c; }
export function adaptive() { const { c, g } = A.canvas(1024, 1024); g.translate(512, 512); g.scale(0.78, 0.78); g.translate(-512, -512); iconArt(g, 1024, false); return c; }
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); iconArt(g, 1024, true); g.clearRect(0, 0, 0, 0); const { c: c2, g: g2 } = A.canvas(1024, 1024); g2.fillStyle = PK.board; g2.fillRect(0, 0, 1024, 1024); for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { g2.fillStyle = PK.peg; g2.beginPath(); g2.arc((x + 0.5) * 1024 / 9, (y + 0.5) * 1024 / 9, 14, 0, Math.PI * 2); g2.fill(); } void c; return c2; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  g.drawImage(A.table(PK, W, H, 1, 4, [0, 0, 0, 0]), 0, 0);
  const owl = LEVELS.find((l) => l.id === 'owl')!.rows, cs = 100;
  pegboard(g, owl, cs, (W - 10 * cs) / 2, 1150, PK, 5);
  const sh = g.createLinearGradient(0, 0, 0, 1000); sh.addColorStop(0, 'rgba(14,10,26,0.85)'); sh.addColorStop(1, 'rgba(14,10,26,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, 1000);
  g.textAlign = 'center'; g.font = '700 190px "Baloo 2", sans-serif'; g.fillStyle = '#fff8fc'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillText('Beadwork', W / 2, 720); g.shadowBlur = 0;
  g.font = '600 58px Sora, sans-serif'; g.fillStyle = '#ff8fb8'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('POPPY', W / 2 + 17, 520); try { g.letterSpacing = '0px'; } catch { /* */ }
  return c;
}
/** The feature graphic: a whale half ironed on the sea-blue board, the iron mid-pass; the words on the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  g.drawImage(A.table(SEA, W, H, 1, 9, [560, 40, 440, 420]), 0, 0);
  const whale = LEVELS.find((l) => l.id === 'whale')!.rows, cs = 34, ox = 585, oy = 46;
  pegboard(g, whale, cs, ox, oy, SEA, 6, 9);
  const ir = A.iron(150, 1); g.save(); g.translate(ox + 6.2 * cs, oy + 4.5 * cs); g.rotate(Math.PI / 2 + 0.15); g.drawImage(ir, -ir.width / 2, -ir.height / 2); g.restore();
  for (let k = 0; k < 8; k++) { const gr = g.createRadialGradient(ox + 7 * cs + k * 9, oy + 3 * cs - k * 12, 0, ox + 7 * cs + k * 9, oy + 3 * cs - k * 12, 18 + k * 3); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  const shade = g.createLinearGradient(0, 0, 600, 0); shade.addColorStop(0, 'rgba(10,20,36,0.94)'); shade.addColorStop(0.75, 'rgba(10,20,36,0.7)'); shade.addColorStop(1, 'rgba(10,20,36,0)'); g.fillStyle = shade; g.fillRect(0, 0, 600, H);
  g.textAlign = 'left';
  g.font = '600 22px Sora, sans-serif'; g.fillStyle = '#ff8fb8'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('POPPY', 54, 94); try { g.letterSpacing = '0px'; } catch { /* */ }
  g.fillStyle = '#fff8fc'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16; g.font = '700 82px "Baloo 2", sans-serif'; g.fillText('Beadwork', 48, 172); g.shadowBlur = 0;
  g.fillStyle = '#ffb0d0'; g.font = '700 31px "Baloo 2", sans-serif'; g.fillText('Bead by bead, a picture appears.', 52, 218);
  ['#ff6aa0', '#ffd23a', '#7ac8f0', '#a86ae0'].forEach((col, k) => A.drawBead(g, 62 + k * 22, 244, 8, col));
  g.fillStyle = 'rgba(255,248,252,0.9)'; g.font = '600 18px Sora, sans-serif';
  g.fillText('Read the number clues, place the beads', 54, 288);
  g.fillText('and reveal the hidden picture, then iron', 54, 314);
  g.fillText('it into a keepsake. 24 pure-logic puzzles.', 54, 340);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
