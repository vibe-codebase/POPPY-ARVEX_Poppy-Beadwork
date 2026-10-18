# Poppy Beadwork: design notes

**Pillars.** Nonograms with a craft payoff. The logic is pure and never needs guessing, the work is tactile (beads click onto pegs), and the finish is a ritual: colour, iron, keepsake. There are no timers and no mistake counter.

**Rules.** Standard monochrome nonogram. Cells are 1 (bead), 0 (cross) or −1 (unknown). The puzzle is won when the bead cells exactly equal the picture's filled cells; crosses don't matter.

**Pictures.**
- Hand-drawn as letter grids (colour per letter).
- An offline line solver checked each one; four were adjusted (cat, anchor, cherry, crab) and the turtle redrawn so that line propagation alone determines every cell.
- The tests re-verify this, and also check that repeatedly applying the in-game hint fills the board correctly.

**Line solver.**
- A dynamic program over (cell, clue index) gives where the remaining clues can fit.
- A forward pass records which values each cell can take across all arrangements; a cell is forced when only one value is possible.
- Propagation alternates rows and columns until nothing changes.

**Hints.**
- Remove a wrong bead (or else a wrong cross).
- Otherwise, choose the line whose solve reveals the most (beads weighted double) and place one forced cell, preferring beads, naming the line.

**Input.**
- The first cell of a stroke decides its action. In bead mode that is place or remove; in cross mode, mark or unmark.
- A drag locks to the row or column of its first move, and applies the action to the cells between.
- One undo snapshot per stroke.

**Finish.**
- Crosses fade and beads recolour in a diagonal wave.
- The iron runs a zigzag path over the board (one pass per four rows); any bead within its radius switches to the fused texture.
- Reduced motion skips straight to the fused picture.

**Stars.** Hint count only: 0 hints, three stars; 1 hint, two; 2 or more, one. The result card also reports beads unpicked, for interest.

**Accessibility.**
- Clue fonts never go below 11.5 px, and the layout is measured from the font.
- The current row and column are highlighted, and finished lines are greyed.
- Every control is 46 px+ and aria-labelled; the bead/cross tool is a radio group.
- Plays fully offline.
