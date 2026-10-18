import { useEffect, useRef } from 'react';
import { canvas, COLORS, drawBead, MOODS, mix } from '../game/art';
import type { Level } from '../game/levels';

const cache = new Map<string, HTMLCanvasElement>();
/** The board in miniature: bare pegs until the picture is made, then the ironed picture itself. */
function paintCard(level: Level, solved: boolean, w: number, h: number, dpr: number) {
  const m = MOODS[level.chapter], { c, g } = canvas(w * dpr, h * dpr);
  g.scale(dpr, dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 8); g.clip();
  g.fillStyle = m.table[1]; g.fillRect(0, 0, w, h);
  const cs = Math.min((w - 10) / level.w, (h - 10) / level.h), ox = (w - level.w * cs) / 2, oy = (h - level.h * cs) / 2;
  g.fillStyle = mix(m.board, '#ffffff', 0.15); g.beginPath(); g.roundRect(ox - 3, oy - 3, level.w * cs + 6, level.h * cs + 6, 5); g.fill();
  level.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const X = ox + (x + 0.5) * cs, Y = oy + (y + 0.5) * cs;
    if (solved && ch !== '.') drawBead(g, X, Y, cs * 0.5, COLORS[ch], true);
    else { g.fillStyle = m.peg; g.beginPath(); g.arc(X, Y, cs * 0.14, 0, Math.PI * 2); g.fill(); }
  }));
  g.restore();
  return c;
}

export function Postcard({ level, solved, locked, width }: { level: Level; solved: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.25);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${level.id}|${solved}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) { src = paintCard(level, solved && !locked, width, height, dpr); cache.set(key, src); }
    el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, solved, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
