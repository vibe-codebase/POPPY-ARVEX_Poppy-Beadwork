import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, type Level } from './levels';
import { clues, lineDone, nextDeduction, solution, solvedBy, starsFor, type Cell } from './sim';
import { sound } from '../audio/sound';

export type Result = { hints: number; unpicked: number; stars: number; hinted: boolean };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type Mode = 'bead' | 'cross';
export type HudState = { phase: 'play' | 'done'; beads: number; total: number; mode: Mode; canUndo: boolean; hints: number; started: boolean; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const pegs = {
  hooks: {} as Hooks,
  scene: null as BoardScene | null,
  reducedMotion: false,
  mode: 'bead' as Mode,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  setMode(m: Mode) { this.mode = m; },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  undo() { this.scene?.undo(); },
  hint() { this.scene?.hint(); },
  restart() { this.scene?.restart(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: the CSS centre of a cell, and the cells that hold beads in the answer. */
  qaCell(x: number, y: number) { return this.scene?.qaCell(x, y); },
  solvePath(): [number, number][] | null { return this.scene?.answer() ?? null; },
};
(window as unknown as { __pegs: typeof pegs }).__pegs = pegs;

const VIEW_W = 360;
const SHOWCASE = ['whale', 'owl', 'cupcake', 'octopus'];

export class BoardScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private phase: 'play' | 'done' = 'play';
  private paused = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W; private viewH = 700;
  private clueFs = 12; private cs = 30; private gx = 0; private gy = 0; private pad = 10;
  private grid: Cell[][] = [];
  private C = { rows: [[1]], cols: [[1]], W: 1, H: 1 };
  private imgs: (Phaser.GameObjects.Image | null)[][] = [];
  private rowT: Phaser.GameObjects.Text[] = []; private colT: Phaser.GameObjects.Text[] = [];
  private tex = { pearl: '', cross: '', col: {} as Record<string, string>, fused: {} as Record<string, string> };
  private fx!: Phaser.GameObjects.Graphics; private hl!: Phaser.GameObjects.Graphics;
  private history: Cell[][][] = [];
  private hints = 0; private unpicked = 0;
  private stroke: { x0: number; y0: number; axis: 'h' | 'v' | null; action: 'bead' | 'cross' | 'clear1' | 'clear0' | null; changed: boolean; before: Cell[][]; t: number } | null = null;
  private hover: { x: number; y: number } | null = null;
  private msg = ''; private msgId = 0;
  private clock = 0; private hintLine: { line: 'row' | 'col'; index: number; x: number; y: number } | null = null; private hintT = -9;
  private ironImg: Phaser.GameObjects.Image | null = null; private fusing = false; private fused: boolean[][] = [];
  private steam: { x: number; y: number; t: number }[] = [];
  private demo: [number, number][] = []; private demoWait = 0;
  private gen = 0;
  private doneLines = new Set<string>();

  constructor() { super('board'); }

  create() {
    pegs.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.pDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.pMove(p));
    this.input.on('pointerup', () => this.pUp());
    this.input.on('pointerupoutside', () => this.pUp());
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0])!);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; if (p) this.pUp(); }
  private count() { let n = 0; for (const r of this.grid) for (const v of r) if (v === 1) n++; return n; }
  hudState(): HudState { return { phase: this.phase, beads: this.count(), total: this.level.fill, mode: pegs.mode, canUndo: this.history.length > 0 && this.phase === 'play', hints: this.hints, started: this.history.length > 0, msg: this.msg, msgId: this.msgId }; }
  debugState() { return { ...this.hudState(), mode2: this.mode, grid: this.grid.map((r) => r.map((v) => (v === 1 ? '#' : v === 0 ? 'x' : '.')).join('')) }; }
  private css() { const z = this.cameras.main.zoom, kk = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width; return z * kk; }
  qaCell(x: number, y: number) { const k = this.css(); return { x: (this.gx + (x + 0.5) * this.cs) * k, y: (this.gy + (y + 0.5) * this.cs) * k }; }
  answer() { const s = solution(this.level), out: [number, number][] = []; s.forEach((r, y) => r.forEach((v, x) => { if (v && this.grid[y][x] !== 1) out.push([x, y]); })); return out; }
  private say(m: string) { this.msg = m; this.msgId++; }
  private later(ms: number, fn: () => void) { const g = this.gen; this.time.delayedCall(ms, () => { if (g === this.gen) fn(); }); }
  private first() { if (!this.acted) { this.acted = true; pegs.hooks.onFirstAction?.(); } }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level; this.gen++;
    this.C = clues(level);
    this.grid = Array.from({ length: level.h }, () => new Array(level.w).fill(-1) as Cell[]);
    this.fused = Array.from({ length: level.h }, () => new Array(level.w).fill(false));
    this.paused = false; this.acted = false; this.phase = 'play'; this.history = []; this.hints = 0; this.unpicked = 0; this.stroke = null; this.msg = ''; this.hintLine = null; this.fusing = false; this.steam = [];
    pegs.mode = 'bead';
    this.demo = mode === 'menu' ? this.answer().sort((a, b) => a[1] - b[1] || a[0] - b[0]) : []; this.demoWait = 0.8;
    this.rebuild();
  }
  restart() { if (this.mode === 'play' && this.phase === 'play' && this.history.length) { const h = this.hints; this.show('play', this.level); this.hints = h; sound.undo(); } }

  // ── layout ────────────────────────────────────────────────────────────
  private addTex(prefix: string, c: HTMLCanvasElement) { const key = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(key, c); return key; }
  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    this.ironImg = null;
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 640);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const css = zoom / dpr, play = this.mode === 'play', W = this.viewW, H = this.viewH, l = this.level, m = A.MOODS[l.chapter], r = this.r;
    const top = (play ? 84 : 240) / css, bottom = (play ? 104 : 196) / css, availH = H - top - bottom;
    // clue space measured in characters of the clue font, which never drops below a readable size
    const rowChars = play ? Math.max(...this.C.rows.map((c) => (c.length ? c : [0]).join('  ').length)) : 0, mc = play ? Math.max(...this.C.cols.map((c) => Math.max(1, c.length))) : 0;
    const fsOf = (cs: number) => Math.max(11.5, cs * 0.46);
    let cs0 = 30, cw = 0, ch = 0;
    for (let it = 0; it < 4; it++) {
      cw = play ? (rowChars * 0.6 * fsOf(cs0)) / cs0 + 0.55 : 0; ch = play ? (mc * 1.02 * fsOf(cs0)) / cs0 + 0.45 : 0;
      cs0 = Math.min((W - 16) / (l.w + cw + 0.7), availH / (l.h + ch + 0.7), play ? 44 : 30);
    }
    this.clueFs = fsOf(cs0);
    this.cs = cs0;
    const cs = this.cs; this.pad = cs * 0.35;
    this.gx = (W - (l.w + cw) * cs) / 2 + cw * cs; this.gy = top + (availH - (l.h + ch) * cs) / 2 + ch * cs;
    this.add.image(0, 0, this.addTex('tb', A.table(m, W, H, Math.min(r, 1.5), 3 + l.chapter * 11, [this.gx - this.pad - cw * cs, this.gy - this.pad - ch * cs, (l.w + cw) * cs + this.pad * 2, (l.h + ch) * cs + this.pad * 2]))).setOrigin(0, 0).setScale(1 / Math.min(r, 1.5));
    this.add.image(this.gx - this.pad, this.gy - this.pad, this.addTex('bd', A.board(l.w, l.h, cs, r, m, this.pad))).setOrigin(0, 0).setScale(1 / r).setDepth(1);
    this.hl = this.add.graphics().setDepth(2);
    this.tex = { pearl: this.addTex('pe', A.bead(cs, r, A.PEARL)), cross: this.addTex('cr', A.cross(cs, r, m)), col: {}, fused: {} };
    for (const k of new Set(l.rows.join('').replace(/\./g, ''))) { this.tex.col[k] = this.addTex('bc', A.bead(cs, r, A.COLORS[k])); this.tex.fused[k] = this.addTex('bf', A.bead(cs, r, A.COLORS[k], true)); }
    this.imgs = this.grid.map((row, y) => row.map((v, x) => (v === -1 ? null : this.cellImg(x, y, v))));
    // clues
    this.rowT = []; this.colT = [];
    if (play) {
      const fs = this.clueFs, style = { fontFamily: 'Sora, sans-serif', fontStyle: '600', fontSize: `${fs * r}px`, color: '#fbf6ff' };
      this.C.rows.forEach((c, y) => this.rowT.push(this.add.text(this.gx - this.pad - cs * 0.15, this.gy + (y + 0.5) * cs, (c.length ? c : [0]).join('  '), style).setOrigin(1, 0.5).setScale(1 / r).setDepth(3)));
      this.C.cols.forEach((c, x) => this.colT.push(this.add.text(this.gx + (x + 0.5) * cs, this.gy - this.pad - cs * 0.1, (c.length ? c : [0]).join('\n'), { ...style, align: 'center', lineSpacing: -fs * r * 0.2 }).setOrigin(0.5, 1).setScale(1 / r).setDepth(3)));
      this.refreshClues(false);
    }
    this.fx = this.add.graphics().setDepth(9);
    if (this.phase === 'done') this.finishLook(true);
  }
  private cellImg(x: number, y: number, v: Cell) {
    const p = { x: this.gx + (x + 0.5) * this.cs, y: this.gy + (y + 0.5) * this.cs };
    const key = v === 1 ? (this.phase === 'done' ? (this.fused[y][x] ? this.tex.fused : this.tex.col)[this.level.rows[y][x]] : this.tex.pearl) : this.tex.cross;
    return this.add.image(p.x, p.y, key).setScale(1 / this.r).setDepth(v === 1 ? 5 : 4);
  }
  private setCell(x: number, y: number, v: Cell, animate = true) {
    const was = this.grid[y][x]; if (was === v) return;
    if (was === 1 && v !== 1) this.unpicked++;
    this.grid[y][x] = v;
    this.imgs[y][x]?.destroy(); this.imgs[y][x] = v === -1 ? null : this.cellImg(x, y, v);
    const im = this.imgs[y][x];
    if (im && animate && !pegs.reducedMotion && v === 1) { im.setScale(1.3 / this.r).setAlpha(0.6); this.tweens.add({ targets: im, scale: 1 / this.r, alpha: 1, duration: 120, ease: 'Back.easeOut' }); }
  }
  /** Grey out clues of finished lines; chime for each newly finished line. */
  private refreshClues(announce: boolean) {
    let fresh = 0;
    this.C.rows.forEach((c, y) => { const done = lineDone(c, this.grid[y].map((v) => (v === 1 ? 1 : 0))); this.rowT[y]?.setAlpha(done ? 0.32 : 1); const k = `r${y}`; if (done && !this.doneLines.has(k)) { this.doneLines.add(k); fresh++; } if (!done) this.doneLines.delete(k); });
    this.C.cols.forEach((c, x) => { const done = lineDone(c, this.grid.map((row) => (row[x] === 1 ? 1 : 0))); this.colT[x]?.setAlpha(done ? 0.32 : 1); const k = `c${x}`; if (done && !this.doneLines.has(k)) { this.doneLines.add(k); fresh++; } if (!done) this.doneLines.delete(k); });
    if (announce && fresh) sound.line(this.doneLines.size);
  }

  // ── input ─────────────────────────────────────────────────────────────
  private cellAt(px: number, py: number) { const x = Math.floor((px - this.gx) / this.cs), y = Math.floor((py - this.gy) / this.cs); return x < 0 || y < 0 || x >= this.level.w || y >= this.level.h ? null : { x, y }; }
  private pDown(p: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.phase !== 'play') return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y), c = this.cellAt(w.x, w.y); if (!c) return;
    this.first();
    const v = this.grid[c.y][c.x];
    const action = pegs.mode === 'bead' ? (v === 1 ? 'clear1' : 'bead') : v === 0 ? 'clear0' : v === 1 ? null : 'cross';
    this.stroke = { x0: c.x, y0: c.y, axis: null, action, changed: false, before: this.grid.map((r) => r.slice()), t: this.clock };
    this.hover = c;
    this.apply(c.x, c.y);
  }
  private pMove(p: Phaser.Input.Pointer) {
    const s = this.stroke; if (!s || !p.isDown) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y), c = this.cellAt(w.x, w.y); if (!c) return;
    if (!s.axis && (c.x !== s.x0 || c.y !== s.y0)) s.axis = Math.abs(c.x - s.x0) >= Math.abs(c.y - s.y0) ? 'h' : 'v';
    const tx = s.axis === 'v' ? s.x0 : c.x, ty = s.axis === 'h' ? s.y0 : c.y;
    this.hover = { x: tx, y: ty };
    const dx = Math.sign(tx - s.x0), dy = Math.sign(ty - s.y0);
    for (let x = s.x0, y = s.y0; ; x += dx, y += dy) { this.apply(x, y); if (x === tx && y === ty) break; }
  }
  private apply(x: number, y: number) {
    const s = this.stroke!; const v = this.grid[y][x];
    let to: Cell | null = null;
    if (s.action === 'bead' && v !== 1 && v !== 0) to = 1;
    else if (s.action === 'bead' && v === 0 && x === s.x0 && y === s.y0) to = 1;
    else if (s.action === 'clear1' && v === 1) to = -1;
    else if (s.action === 'cross' && v === -1) to = 0;
    else if (s.action === 'clear0' && v === 0) to = -1;
    if (to === null) return;
    this.setCell(x, y, to); s.changed = true; this.hintLine = null;
    if (to === 1) sound.place(); else if (to === 0) sound.mark(); else sound.lift();
    pegs.hooks.onHaptic?.('light');
  }
  private pUp() {
    const s = this.stroke; this.stroke = null; this.hover = null; if (!s) return;
    if (s.changed) { this.history.push(s.before); this.refreshClues(true); if (solvedBy(this.level, this.grid)) this.win(); }
  }
  undo() {
    if (this.mode !== 'play' || this.phase !== 'play' || !this.history.length) return;
    const g = this.history.pop()!;
    g.forEach((row, y) => row.forEach((v, x) => { if (this.grid[y][x] !== v) { const u = this.unpicked; this.setCell(x, y, v, false); this.unpicked = u; } }));
    this.refreshClues(false); sound.undo(); this.hintLine = null;
  }
  /** A hint removes a bead or cross that is wrong, or else places the next thing a single line tells you. */
  hint() {
    if (this.mode !== 'play' || this.phase !== 'play') return;
    this.first();
    const sol = solution(this.level), before = this.grid.map((r) => r.slice());
    let wrong: { x: number; y: number } | null = null;
    this.grid.forEach((row, y) => row.forEach((v, x) => { if (v !== -1 && v !== sol[y][x] && (!wrong || v === 1)) wrong = { x, y }; }));
    this.hints++;
    if (wrong) {
      const { x, y } = wrong as { x: number; y: number }, was = this.grid[y][x];
      this.history.push(before); this.setCell(x, y, -1); this.refreshClues(false); sound.hint();
      this.hintLine = { line: 'row', index: y, x, y }; this.hintT = this.clock;
      this.say(was === 1 ? 'That bead doesn’t belong in the picture, so it’s off the board.' : 'That peg needs a bead after all, so its cross is rubbed out.');
      return;
    }
    const d = nextDeduction(this.level, this.grid);
    if (!d) return;
    this.history.push(before); this.setCell(d.x, d.y, d.v); this.refreshClues(true); sound.hint();
    this.hintLine = { line: d.line, index: d.index, x: d.x, y: d.y }; this.hintT = this.clock;
    this.say(d.line === 'row' ? `Row ${d.y + 1} says this peg ${d.v === 1 ? 'takes a bead' : 'stays empty'}.` : `Column ${d.x + 1} says this peg ${d.v === 1 ? 'takes a bead' : 'stays empty'}.`);
    if (solvedBy(this.level, this.grid)) this.win();
  }

  // ── the finish: colour, then the iron ───────────────────────────────────
  private win() {
    this.phase = 'done'; this.hintLine = null;
    if (this.mode === 'play') sound.reveal(); pegs.hooks.onHaptic?.('success');
    const rm = pegs.reducedMotion;
    this.grid.forEach((row, y) => row.forEach((v, x) => {
      if (v === 0) { const im = this.imgs[y][x]; if (im) this.tweens.add({ targets: im, alpha: 0, duration: rm ? 0 : 300, onComplete: () => im.setVisible(false) }); }
      if (v === 1) this.later(rm ? 0 : (x + y) * 28, () => { const im = this.imgs[y][x]; if (!im) return; im.setTexture(this.tex.col[this.level.rows[y][x]]); if (!rm) this.tweens.add({ targets: im, scale: 1.18 / this.r, duration: 110, yoyo: true }); });
    }));
    for (const t of [...this.rowT, ...this.colT]) this.tweens.add({ targets: t, alpha: 0, duration: rm ? 0 : 500, delay: rm ? 0 : 300 });
    const wave = (this.level.w + this.level.h) * 28;
    if (rm) { this.finishLook(false); }
    else this.later(wave + 350, () => this.ironIt());
    const st = starsFor(this.hints), at = rm ? 900 : wave + 350 + 2300;
    if (this.mode === 'play') this.later(at, () => pegs.hooks.onFinish?.({ level: this.level, result: { hints: this.hints, unpicked: this.unpicked, stars: st, hinted: this.hints > 0 } }));
    else this.later(at + 900, () => { const i = (SHOWCASE.indexOf(this.level.id) + 1) % SHOWCASE.length; this.show('menu', LEVELS.find((x) => x.id === SHOWCASE[i])!); });
    if (rm && this.mode === 'play') sound.whole();
  }
  /** Fuse everything at once (reduced motion, or a rebuild after the finish). */
  private finishLook(instant: boolean) {
    this.grid.forEach((row, y) => row.forEach((v, x) => { if (v === 1) { this.fused[y][x] = true; this.imgs[y][x]?.setTexture(this.tex.fused[this.level.rows[y][x]]); } if (v === 0) this.imgs[y][x]?.setVisible(false); }));
    for (const t of [...this.rowT, ...this.colT]) t.setAlpha(0);
    void instant;
  }
  /** The iron sweeps the board in a zigzag; beads it passes over fuse. */
  private ironPath: { x: number; y: number }[] = []; private ironT = 0; private ironDur = 1.9;
  private ironIt() {
    const l = this.level, cs = this.cs, size = cs * Math.max(2.4, Math.min(l.w, l.h) * 0.36);
    const im = this.add.image(this.gx - size * 0.6, this.gy, this.addTex('ir', A.iron(size, this.r))).setScale(1 / this.r).setDepth(8).setAngle(90);
    this.ironImg = im; this.fusing = true; this.ironT = 0; if (this.mode === 'play') sound.iron(this.ironDur);
    const passes = Math.max(2, Math.ceil(l.h / 4)), xs = [this.gx + cs * 0.4, this.gx + l.w * cs - cs * 0.4];
    this.ironPath = [{ x: this.gx - size * 0.6, y: this.gy + (0.5 / passes) * l.h * cs }];
    for (let k = 0; k < passes; k++) { const y = this.gy + ((k + 0.5) / passes) * l.h * cs, dir = k % 2; this.ironPath.push({ x: xs[dir], y }, { x: xs[1 - dir], y }); }
    this.ironPath.push({ x: this.gx + l.w * cs + size, y: this.ironPath[this.ironPath.length - 1].y });
  }
  private moveIron(dt: number) {
    const im = this.ironImg; if (!im || !this.fusing) return;
    this.ironT = Math.min(1, this.ironT + dt / this.ironDur);
    const P = this.ironPath, segs = P.length - 1, f = this.ironT * segs, i = Math.min(segs - 1, Math.floor(f)), t = f - i, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const a = P[i], b = P[i + 1]; im.setPosition(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
    const target = b.x > a.x ? 90 : b.x < a.x ? -90 : 180; im.angle += (target - im.angle) * Math.min(1, dt * 12);
    if (this.ironT >= 1) { this.fusing = false; this.finishLook(true); this.tweens.add({ targets: im, alpha: 0, duration: 250, onComplete: () => im.destroy() }); this.ironImg = null; if (this.mode === 'play') sound.whole(); }
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    if (this.paused) return;
    this.clock += dt;
    const cs = this.cs, fx = this.fx, hl = this.hl, l = this.level; fx.clear(); hl.clear();
    if (this.mode === 'menu' && this.phase === 'play') { this.demoWait -= dt; while (this.demoWait <= 0 && this.demo.length) { const [x, y] = this.demo.shift()!; this.setCell(x, y, 1); this.demoWait += 0.035; } if (!this.demo.length && this.demoWait <= -0.4) this.win(); }
    // the row and column under the finger
    if (this.hover && this.phase === 'play') { hl.fillStyle(0xffffff, 0.12); hl.fillRect(this.gx - this.pad * 0.6, this.gy + this.hover.y * cs, l.w * cs + this.pad * 1.2, cs); hl.fillRect(this.gx + this.hover.x * cs, this.gy - this.pad * 0.6, cs, l.h * cs + this.pad * 1.2); }
    if (this.hintLine && this.clock - this.hintT < 3.5 && this.phase === 'play') {
      const e = this.clock - this.hintT, a = pegs.reducedMotion ? 0.7 : Math.max(0, 1 - e / 3.5) * (0.6 + 0.4 * Math.sin(e * 6));
      hl.fillStyle(0xffe08a, 0.22 * a);
      if (this.hintLine.line === 'row') hl.fillRect(this.gx, this.gy + this.hintLine.index * cs, l.w * cs, cs); else hl.fillRect(this.gx + this.hintLine.index * cs, this.gy, cs, l.h * cs);
      fx.lineStyle(3, 0xffe08a, a); fx.strokeRoundedRect(this.gx + this.hintLine.x * cs + 2, this.gy + this.hintLine.y * cs + 2, cs - 4, cs - 4, cs * 0.25);
    }
    // the iron fuses what it touches, and steams
    this.moveIron(dt);
    const im = this.ironImg;
    if (im && this.fusing) {
      const R = im.displayWidth * 0.5;
      this.grid.forEach((row, y) => row.forEach((v, x) => { if (v !== 1 || this.fused[y][x]) return; const px = this.gx + (x + 0.5) * cs, py = this.gy + (y + 0.5) * cs; if (Math.hypot(px - im.x, py - im.y) < R) { this.fused[y][x] = true; this.imgs[y][x]?.setTexture(this.tex.fused[l.rows[y][x]]); } }));
      if (Math.random() < 0.5) this.steam.push({ x: im.x + (Math.random() - 0.5) * R, y: im.y + (Math.random() - 0.5) * R, t: 0 });
    }
    this.steam = this.steam.filter((s) => (s.t += dt) < 1);
    for (const s of this.steam) { s.y -= cs * 0.8 * dt; fx.fillStyle(0xffffff, 0.35 * (1 - s.t)); fx.fillCircle(s.x, s.y, cs * (0.15 + s.t * 0.4)); }
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2a2440',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [BoardScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
