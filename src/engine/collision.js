

import { collectByType, updateParams, findBlock } from "./blocks";
import { COSTUMES } from "../state/costumes";

const FULL_BOX = { left: 0, top: 0, right: 100, bottom: 100 };

export function getBounds(sprite) {
  const box = (COSTUMES[sprite.costume] && COSTUMES[sprite.costume].hitbox) || FULL_BOX;
  // art units (100x100, y down, centre at 50,50) -> offsets from the sprite centre in screen units
  const sx = sprite.width / 100;
  const sy = sprite.height / 100;
  const corners = [
    [box.left, box.top],
    [box.right, box.top],
    [box.right, box.bottom],
    [box.left, box.bottom],
  ].map(([x, y]) => [(x - 50) * sx, (y - 50) * sy]);
  // same rotation the stage draws with: (direction - 90) degrees clockwise on screen
  const r = (((sprite.direction ?? 90) - 90) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  let left = Infinity;
  let right = -Infinity;
  let bottom = Infinity;
  let top = -Infinity;
  for (const [x, y] of corners) {
    const rx = x * cos - y * sin;
    const ry = -(x * sin + y * cos); // screen y is down, stage y is up
    left = Math.min(left, rx);
    right = Math.max(right, rx);
    bottom = Math.min(bottom, ry);
    top = Math.max(top, ry);
  }
  return { left: sprite.x + left, right: sprite.x + right, bottom: sprite.y + bottom, top: sprite.y + top };
}

export function overlaps(a, b) {
  const A = getBounds(a);
  const B = getBounds(b);
  return A.left < B.right && A.right > B.left && A.bottom < B.top && A.top > B.bottom;
}

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);


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
