type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Undo = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
export const Lamp = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A fuse bead. */
export const Bead = ({ size }: P) => <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.8" /><path d="M7.6 9.2a5 5 0 0 1 2.6-2.8" opacity=".6" /></svg>;
/** A cross, for empty pegs. */
export const Cross = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M7 7l10 10M17 7 7 17" /></svg>;
/** A pegboard grid. */
export const Grid = ({ size }: P) => <svg {...s(size)} aria-hidden><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" opacity=".55" /></svg>;
/** Stars are ironed hearts. */
export const Star = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {[[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={2.2 + x * 2.8} y={4.2 + y * 2.8} width="2.6" height="2.6" rx="1" fill={on ? (x === 1 && y === 1 ? '#ffe0ea' : '#ff5a86') : 'none'} stroke={on ? 'none' : 'rgba(255,255,255,.5)'} strokeWidth=".7" />
    ))}
  </svg>
);
