import type { Picture } from './sim';
import DATA from './pictures.json';

export type Level = Picture & { id: string; name: string; title: string; chapter: number; hint?: string; w: number; h: number; sweeps: number; fill: number };
export const CHAPTERS = [
  { name: 'Sprinkles', short: 'Sprinkles', blurb: 'Small patterns on a candy-pink pegboard. The numbers say how many beads sit together in each row and column.' },
  { name: 'Garden', short: 'Garden', blurb: 'Ten by ten, on a mint board. Mark the pegs you know are empty; they tell you as much as the beads.' },
  { name: 'Seaside', short: 'Seaside', blurb: 'Big twelve-by-twelve pictures from the shore, on a sea-blue board.' },
];
const TITLES: Record<string, string> = {
  heart: 'Sweetheart', mushroom: 'Toadstool', cherry: 'Cherries', cat: 'Kitty', fish: 'Goldfish', duck: 'Duckling', tree: 'Little Tree', cupcake: 'Cupcake',
  flower: 'Rose', butterfly: 'Butterfly', snail: 'Snail', bee: 'Bumblebee', house: 'Cottage', umbrella: 'Umbrella', sailboat: 'Sailboat', owl: 'Owl',
  whale: 'Whale', turtle: 'Sea Turtle', crab: 'Crab', anchor: 'Anchor', shell: 'Seashell', lighthouse: 'Lighthouse', octopus: 'Octopus', starfish: 'Starfish',
};
const HINTS: Record<number, string> = {
  0: 'Each number is a run of beads in that row or column, in order. Tap a peg to place a bead.',
  1: 'Switch to the cross to mark pegs that must stay empty. Drag to fill a whole stretch.',
  8: 'Ten by ten now. Start with the big numbers: they overlap in the middle.',
  16: 'Twelve by twelve. A finished line greys its clue, so you can see what’s left.',
};
const D = DATA as unknown as Record<string, { rows: string[]; sweeps: number }>;
const fill = (id: string) => D[id].rows.join('').split('').filter((c) => c !== '.').length;
const chapterOf = (id: string) => (D[id].rows[0].length <= 8 ? 0 : D[id].rows[0].length <= 10 ? 1 : 2);
/** Within each chapter, pictures come in order of how many sweeps of line reasoning they take, then by size. */
const ORDER = [0, 1, 2].flatMap((c) => Object.keys(D).filter((id) => chapterOf(id) === c).sort((a, b) => D[a].sweeps - D[b].sweeps || D[a].rows.length * D[a].rows[0].length - D[b].rows.length * D[b].rows[0].length || fill(a) - fill(b) || a.localeCompare(b)));
export const LEVELS: Level[] = ORDER.map((id, i) => ({ rows: D[id].rows, id, name: `No. ${i + 1}`, title: TITLES[id], hint: HINTS[i], chapter: Math.floor(i / 8), w: D[id].rows[0].length, h: D[id].rows.length, sweeps: D[id].sweeps, fill: fill(id) }));
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
