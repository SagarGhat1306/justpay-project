// Collision detection + the "swap moves" behaviour.
//
// Hit boxes are plain axis-aligned rectangles around each sprite. Rotation is ignored,
// it's close enough for these costumes.
//
// When two sprites start touching, their move blocks trade `steps` values. 1st move
// with 1st move, 2nd with 2nd and so on (moves inside repeats count too), stopping at
// whichever sprite has fewer. We change the real program data, so the running script
// picks up the new value on its next move and the editor shows it too. Swapping the
// same pair again puts things back, which is how Reset undoes it.

import { collectByType, updateParams, findBlock } from "./blocks";

export function getBounds(sprite) {
  const hw = sprite.width / 2;
  const hh = sprite.height / 2;
  return { left: sprite.x - hw, right: sprite.x + hw, bottom: sprite.y - hh, top: sprite.y + hh };
}

export function overlaps(a, b) {
  const A = getBounds(a);
  const B = getBounds(b);
  return A.left < B.right && A.right > B.left && A.bottom < B.top && A.top > B.bottom;
}

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// Only reports pairs that *just* started touching. `activePairs` is what was overlapping
// last frame. Without this, two sprites sitting on top of each other would swap back and
// forth every single frame. Once they separate they can trigger again.
export function detectCollisionStarts(sprites, activePairs) {
  const active = new Set();
  const started = [];
  const sorted = [...sprites].sort((a, b) => (a.id < b.id ? -1 : 1)); // stable order between frames
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      if (!overlaps(a, b)) continue;
      const key = pairKey(a.id, b.id);
      active.add(key);
      if (!activePairs.has(key)) started.push([a.id, b.id]);
    }
  }
  return { started, active };
}

// If A hits B and C in the same frame, the result would depend on which swap ran first.
// Keep it simple: one swap per sprite per frame, first pair wins.
export function selectSwapPairs(started) {
  const used = new Set();
  const chosen = [];
  for (const [a, b] of started) {
    if (used.has(a) || used.has(b)) continue;
    used.add(a);
    used.add(b);
    chosen.push([a, b]);
  }
  return chosen;
}

// pairs = which block ids got swapped, kept so Reset can undo it
export function swapMoveSteps(programA, programB) {
  const movesA = collectByType(programA, "move");
  const movesB = collectByType(programB, "move");
  const n = Math.min(movesA.length, movesB.length);
  let nextA = programA;
  let nextB = programB;
  const pairs = [];
  for (let i = 0; i < n; i += 1) {
    const a = movesA[i];
    const b = movesB[i];
    nextA = updateParams(nextA, a.id, { steps: b.params.steps });
    nextB = updateParams(nextB, b.id, { steps: a.params.steps });
    pairs.push([a.id, b.id]);
  }
  return { programA: nextA, programB: nextB, pairs };
}

// swapping twice = no swap, so undoing is just doing it again
export function reswapPairs(programA, programB, pairs) {
  let nextA = programA;
  let nextB = programB;
  for (const [ia, ib] of pairs) {
    const a = findBlock(nextA, ia);
    const b = findBlock(nextB, ib);
    if (!a || !b) continue; // block was deleted since then
    nextA = updateParams(nextA, ia, { steps: b.params.steps });
    nextB = updateParams(nextB, ib, { steps: a.params.steps });
  }
  return { programA: nextA, programB: nextB };
}
