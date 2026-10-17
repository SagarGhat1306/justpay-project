// Runs a sprite's blocks. It doesn't know about React or the store, everything goes
// through `env` (see makeEnv in runtime.js).
//
// Blocks are looked up again every time they run instead of being captured up front.
// That way an edit made while the script is running (or a collision swap) is picked up
// by the very next block.

import { toNumber } from "./blocks";
import { headingVector, normalizeDirection } from "./coords";

export class Cancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "Cancelled";
  }
}

export const MOVE_SPEED = 250; // stage units / sec
export const TURN_SPEED = 720; // deg / sec
export const GOTO_MS = 250;
// sanity limits so a typo like "repeat 99999999" doesn't hang things
export const MAX_REPEAT = 100000;
export const MAX_SECONDS = 3600;

function checkCancelled(env) {
  if (env.isCancelled()) throw new Cancelled();
}

// calls apply(t) once per frame with t going from 0 to 1. waits at least one frame
// even when durationMs is 0
async function tween(env, durationMs, apply) {
  const start = env.now();
  for (;;) {
    await env.frame();
    checkCancelled(env);
    const p = durationMs <= 0 ? 1 : Math.min(1, (env.now() - start) / durationMs);
    apply(p);
    if (p >= 1) return;
  }
}

async function sleep(env, ms) {
  const start = env.now();
  do {
    await env.frame();
    checkCancelled(env);
  } while (env.now() - start < ms);
}

export function createInterpreter(env) {
  let framesSeen = 0;
  const frame = env.frame;
  const counted = { ...env, frame: () => frame().then((t) => { framesSeen += 1; return t; }) };

  async function runList(spriteId, parentId) {
    // re-read the list every step instead of iterating a copy, in case it was edited
    for (let i = 0; ; i += 1) {
      checkCancelled(counted);
      const list = counted.getChildren(spriteId, parentId);
      if (i >= list.length) return;
      await runBlock(spriteId, list[i].id);
    }
  }

  // An empty "repeat forever" would otherwise spin without ever awaiting a frame
  // and lock up the JS thread, so make sure each iteration waits at least once.
  async function loopBody(spriteId, blockId) {
    const before = framesSeen;
    await runList(spriteId, blockId);
    if (framesSeen === before) await counted.frame();
    checkCancelled(counted);
  }

  async function runBlock(spriteId, blockId) {
    checkCancelled(counted);
    const block = counted.getBlock(spriteId, blockId);
    if (!block) return; // user deleted it mid-run
    const p = block.params || {};

    switch (block.type) {
      case "move": {
        counted.setActive(spriteId, blockId);
        const steps = toNumber(p.steps);
        const start = counted.getPose(spriteId);
        const { dx, dy } = headingVector(start.direction);
        const duration = (Math.abs(steps) / MOVE_SPEED) * 1000;
        await tween(counted, duration, (t) => {
          counted.setPose(spriteId, { x: start.x + dx * steps * t, y: start.y + dy * steps * t });
        });
        return;
      }
      case "turn": {
        counted.setActive(spriteId, blockId);
        const deg = toNumber(p.degrees);
        const start = counted.getPose(spriteId).direction;
        const duration = counted.reducedMotion ? 0 : (Math.abs(deg) / TURN_SPEED) * 1000;
        await tween(counted, duration, (t) => {
          counted.setPose(spriteId, { direction: normalizeDirection(start + deg * t) });
        });
        return;
      }
      case "goTo": {
        counted.setActive(spriteId, blockId);
        const tx = toNumber(p.x);
        const ty = toNumber(p.y);
        const start = counted.getPose(spriteId);
        const duration = counted.reducedMotion ? 0 : GOTO_MS;
        await tween(counted, duration, (t) => {
          counted.setPose(spriteId, { x: start.x + (tx - start.x) * t, y: start.y + (ty - start.y) * t });
        });
        return;
      }
      case "say":
      case "think": {
        counted.setActive(spriteId, blockId);
        const seconds = Math.min(MAX_SECONDS, Math.max(0, toNumber(p.seconds)));
        const bubble = { kind: block.type, text: String(p.message == null ? "" : p.message), key: blockId };
        counted.setBubble(spriteId, bubble);
        try {
          await sleep(counted, seconds * 1000);
        } finally {
          counted.setBubble(spriteId, null);
        }
        return;
      }
      case "repeat": {
        const times = Math.min(MAX_REPEAT, Math.max(0, Math.floor(toNumber(p.times))));
        for (let k = 0; k < times; k += 1) await loopBody(spriteId, blockId);
        return;
      }
      case "repeatForever": {
        for (;;) await loopBody(spriteId, blockId);
      }
      default:
        throw new Error(`Unknown block type "${block.type}"`);
    }
  }

  // resolves to { status: "done" | "cancelled" | "error", error? }
  async function runSprite(spriteId) {
    try {
      await runList(spriteId, null);
      return { status: "done" };
    } catch (err) {
      if (err instanceof Cancelled || (err && err.name === "Cancelled")) return { status: "cancelled" };
      return { status: "error", error: err };
    } finally {
      if (!counted.isCancelled()) counted.setActive(spriteId, null);
    }
  }

  return { runSprite };
}
