// SVG outlines for the puzzle-piece blocks.
//
// Each block has a notch cut into the top and a tab sticking out the bottom, at the same
// x. Blocks stack with zero gap so the tab of one fills the notch of the next:
//
//   ┌──╮___╭───────────┐   <- notch
//   │  move 10 steps   │
//   └──╮   ╭───────────┘
//      ╰───╯               <- tab
//
// Repeat blocks also have a tab under the top arm (for the first block inside)
// and a notch on top of the bottom bar.

export const R = 4; // corner radius
export const NOTCH_X = 12; // how far from the left the notch starts
export const NOTCH_W = 27;
export const NOTCH_D = 6; // notch depth, same as tab height
export const ARM_W = 16; // left arm of a repeat, also how far nested blocks are indented
export const FOOT_H = 24; // repeat's bottom bar
export const HAT_CAP = 16;

// notch, drawn left to right along the top edge
const NOTCH_RIGHT = "c 1.5,0 2.25,0.75 3,1.5 l 3,3 c 0.75,0.75 1.5,1.5 3,1.5 h 9 c 1.5,0 2.25,-0.75 3,-1.5 l 3,-3 c 0.75,-0.75 1.5,-1.5 3,-1.5";
// tab, drawn right to left along the bottom edge
const TAB_LEFT = "c -1.5,0 -2.25,0.75 -3,1.5 l -3,3 c -0.75,0.75 -1.5,1.5 -3,1.5 h -9 c -1.5,0 -2.25,-0.75 -3,-1.5 l -3,-3 c -0.75,-0.75 -1.5,-1.5 -3,-1.5";

const n = (v) => Math.round(v * 100) / 100;

// normal block. h doesn't include the tab, that hangs below it
export function stackPath(w, h) {
  w = Math.max(w, NOTCH_X + NOTCH_W + 2 * R);
  return [
    `M 0,${R}`,
    `a ${R},${R} 0 0 1 ${R},-${R}`,
    `H ${NOTCH_X}`,
    NOTCH_RIGHT,
    `H ${n(w - R)}`,
    `a ${R},${R} 0 0 1 ${R},${R}`,
    `V ${n(h - R)}`,
    `a ${R},${R} 0 0 1 -${R},${R}`,
    `H ${NOTCH_X + NOTCH_W}`,
    TAB_LEFT,
    `H ${R}`,
    `a ${R},${R} 0 0 1 -${R},-${R}`,
    "Z",
  ].join(" ");
}

// the C shape for repeat. rowH = top part, mouthH = the gap where nested blocks go
export function cPath(w, rowH, mouthH) {
  w = Math.max(w, ARM_W + NOTCH_X + NOTCH_W + 2 * R + 24);
  const mouthTop = rowH;
  const footTop = rowH + mouthH;
  const bottom = footTop + FOOT_H;
  return [
    `M 0,${R}`,
    `a ${R},${R} 0 0 1 ${R},-${R}`,
    `H ${NOTCH_X}`,
    NOTCH_RIGHT,
    `H ${n(w - R)}`,
    `a ${R},${R} 0 0 1 ${R},${R}`,
    `V ${n(mouthTop - R)}`,
    `a ${R},${R} 0 0 1 -${R},${R}`,
    // under the top arm (tab for the first block inside)
    `H ${ARM_W + NOTCH_X + NOTCH_W}`,
    TAB_LEFT,
    `H ${ARM_W + R}`,
    `a ${R},${R} 0 0 0 -${R},${R}`,
    // down the inside of the arm
    `V ${n(footTop - R)}`,
    `a ${R},${R} 0 0 0 ${R},${R}`,
    // top of the bottom bar (notch for the last block inside)
    `H ${ARM_W + NOTCH_X}`,
    NOTCH_RIGHT,
    `H ${n(w - R)}`,
    `a ${R},${R} 0 0 1 ${R},${R}`,
    `V ${n(bottom - R)}`,
    `a ${R},${R} 0 0 1 -${R},${R}`,
    `H ${NOTCH_X + NOTCH_W}`,
    TAB_LEFT,
    `H ${R}`,
    `a ${R},${R} 0 0 1 -${R},-${R}`,
    "Z",
  ].join(" ");
}

// "when clicked" hat: round top, no notch since nothing goes above it
export function hatPath(w, h) {
  w = Math.max(w, 110);
  const capW = Math.min(96, w - 2 * R);
  return [
    `M 0,${HAT_CAP}`,
    `C ${n(capW * 0.25)},${-HAT_CAP * 0.35} ${n(capW * 0.75)},${-HAT_CAP * 0.35} ${capW},${HAT_CAP}`,
    `H ${n(w - R)}`,
    `a ${R},${R} 0 0 1 ${R},${R}`,
    `V ${n(h - R)}`,
    `a ${R},${R} 0 0 1 -${R},${R}`,
    `H ${NOTCH_X + NOTCH_W}`,
    TAB_LEFT,
    `H ${R}`,
    `a ${R},${R} 0 0 1 -${R},-${R}`,
    "Z",
  ].join(" ");
}
