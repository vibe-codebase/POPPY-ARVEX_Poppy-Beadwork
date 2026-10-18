# Poppy Beadwork

By **POPPY ARVEX** · package `com.poppyarvex.poppybeadwork` · Expo owner `889-893`.

A picture-logic puzzle for Android: read the number clues, place fuse beads on a pegboard, reveal the hidden picture, then iron it into a keepsake.

**How it plays.**
- Each row and column has clues: the lengths of its runs of beads, in order, with at least one empty peg between runs.
- Tap a peg to place a bead, or drag to fill a stretch of a row or column. Switch to the cross to mark pegs that must stay empty. Tapping again removes either.
- The row and column under your finger are highlighted, and a finished line greys its clue. Undo is free.
- A hint first takes off anything wrong. Otherwise it places the next peg that a single row or column proves, and says which line proved it.
- When the beads match the picture, they take on its colours, the iron sweeps the board and the beads fuse flat. The result names what you made.
- Stars (ironed hearts): three without a hint, two with one.

**Content.**
- 24 hand-made pixel pictures in three chapters:
  - **Sprinkles:** 6×6 to 8×9, on candy pink.
  - **Garden:** 10×10, on mint.
  - **Seaside:** 12×12, on sea blue.
- Every picture is checked to be solvable one line at a time, without guessing. Within each chapter, pictures are ordered by how many sweeps of line reasoning they need.

**Look and sound.**
- Visuals: translucent pegboards with guide lines every five pegs, glossy fuse beads (pearly while you work, in colour when it's done), pencil crosses, a felt craft table with loose beads, and an iron that steams as it fuses the beads it passes over.
- Sound: an electric piano drifting through seventh chords over vinyl crackle, plastic bead clicks, pencil scratches, a rising note for each finished line, and the hiss of the iron.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Clues, the line solver, propagation, hint deduction |
| `web/src/game/pictures.json` | The 24 pictures |
| `web/src/game/art.ts` | Pegboards, beads, crosses, table and iron |
| `web/src/game/scene.ts` | The Phaser board, clues, input and the ironing |
| `web/brand/` | Icon, splash and feature graphic |
| `Delivery/` | Play Store icon, feature graphic and screenshots |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 34 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
