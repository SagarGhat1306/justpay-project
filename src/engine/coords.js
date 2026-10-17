// Same coordinate system as Scratch: 480x360 stage, (0,0) in the middle, y goes UP.
// Directions: 90 = right, 0 = up, -90 = left, 180 = down.
// The stage gets drawn at whatever pixel size fits, `scale` converts between the two.

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;
export const HALF_W = STAGE_WIDTH / 2;
export const HALF_H = STAGE_HEIGHT / 2;

// stage coords -> pixels from the stage's top-left
export function toScreen(x, y, scale) {
  return { left: (x + HALF_W) * scale, top: (HALF_H - y) * scale };
}

// keep the whole sprite on screen, it just stops at the edge
export function clampToStage(x, y, width = 0, height = 0) {
  const maxX = Math.max(0, HALF_W - width / 2);
  const maxY = Math.max(0, HALF_H - height / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

// wrap into -180..180 like Scratch does
export function normalizeDirection(deg) {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d === -180 ? 180 : d;
}

// sin/cos are swapped vs. normal maths because 0 deg points up here
export function headingVector(direction) {
  const rad = (direction * Math.PI) / 180;
  return { dx: Math.sin(rad), dy: Math.cos(rad) };
}

export const round = (n, p = 2) => {
  const f = 10 ** p;
  const r = Math.round(n * f) / f;
  return Object.is(r, -0) ? 0 : r; // don't show "-0" in the UI
};
