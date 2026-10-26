// Play / Stop / Reset. Connects the interpreter and collision code to the store.
//
// There's a single requestAnimationFrame loop. Every sprite's script awaits env.frame(),
// and each tick resolves all of those at once, so sprites move in step with each other.
//
// Each Play gets its own token object. Stop flips token.cancelled and rejects whatever
// is still waiting on a frame. If an old async chain wakes up later anyway, it sees the
// cancelled token and all the setters do nothing, so it can't mess with the next run.

import { createInterpreter } from "./interpreter";
import { findBlock, getChildren } from "./blocks";
import { clampToStage } from "./coords";
import { detectCollisionStarts, selectSwapPairs, swapMoveSteps, reswapPairs } from "./collision";
import { getState, setState, getSprite } from "../state/store";

const defaultScheduler = () => {
  const g = typeof globalThis !== "undefined" ? globalThis : {};
  const raf = typeof g.requestAnimationFrame === "function"
    ? (cb) => g.requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(Date.now()), 16);
  const caf = typeof g.cancelAnimationFrame === "function" ? (id) => g.cancelAnimationFrame(id) : clearTimeout;
  const now = () => (g.performance && typeof g.performance.now === "function" ? g.performance.now() : Date.now());
  return { raf, caf, now };
};

const scheduler = defaultScheduler();

let token = null; // { id, cancelled }
let waiters = [];
let rafId = null;
let frameTime = 0;
let activePairs = new Set();
let swapLog = []; // swaps done since the last Reset, so Reset can undo them
let runSeq = 0;
let hitSeq = 0;

let reducedMotion = false; // App.js keeps this in sync with the OS setting
export function setReducedMotion(value) {
  reducedMotion = Boolean(value);
}
export const prefersReducedMotion = () => reducedMotion;

function tick(t) {
  rafId = null;
  if (!token || token.cancelled) return;
  frameTime = typeof t === "number" ? t : scheduler.now();
  checkCollisions();
  const ready = waiters;
  waiters = [];
  ready.forEach((w) => w.resolve(frameTime));
  rafId = scheduler.raf(tick);
}

function checkCollisions() {
  const s = getState();
  const { started, active } = detectCollisionStarts(s.sprites, activePairs);
  activePairs = active;
  if (!started.length) return;
  const pairs = selectSwapPairs(started);
  setState((st) => {
    let sprites = st.sprites;
    let swapCount = st.swapCount;
    let lastSwap = st.lastSwap;
    let lastHit = st.lastHit;
    for (const [aId, bId] of pairs) {
      const a = sprites.find((x) => x.id === aId);
      const b = sprites.find((x) => x.id === bId);
      if (!a || !b) continue;
      // the stage plays the bump animation from this, even if there was nothing to swap
      hitSeq += 1;
      lastHit = { n: hitSeq, ids: [aId, bId], x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, at: Date.now() };
      const res = swapMoveSteps(a.program, b.program);
      if (!res.pairs.length) continue;
      swapLog.push({ a: aId, b: bId, pairs: res.pairs });
      sprites = sprites.map((x) => {
        if (x.id === aId) return { ...x, program: res.programA };
        if (x.id === bId) return { ...x, program: res.programB };
        return x;
      });
      swapCount += 1;
      lastSwap = { names: [a.name, b.name], ids: [aId, bId], at: Date.now(), n: swapCount };
    }
    if (sprites === st.sprites && lastHit === st.lastHit) return st;
    return { ...st, sprites, swapCount, lastSwap, lastHit };
  });
}

function makeEnv(runToken) {
  const live = () => !runToken.cancelled;
  return {
    reducedMotion,
    isCancelled: () => runToken.cancelled,
    now: () => frameTime,
    frame: () =>
      new Promise((resolve, reject) => {
        if (runToken.cancelled) {
          const e = new Error("cancelled");
          e.name = "Cancelled";
          reject(e);
          return;
        }
        waiters.push({ resolve, reject, token: runToken });
      }),
    getBlock: (spriteId, blockId) => {
      const sp = getSprite(spriteId);
      return sp ? findBlock(sp.program, blockId) : null;
    },
    getChildren: (spriteId, parentId) => {
      const sp = getSprite(spriteId);
      return sp ? getChildren(sp.program, parentId) : [];
    },
    getPose: (spriteId) => {
      const sp = getSprite(spriteId);
      return sp ? { x: sp.x, y: sp.y, direction: sp.direction } : { x: 0, y: 0, direction: 90 };
    },
    setPose: (spriteId, partial) => {
      if (!live()) return;
      setState((st) => {
        const sprites = st.sprites.map((sp) => {
          if (sp.id !== spriteId) return sp;
          const merged = { ...sp, ...partial };
          const pos = clampToStage(merged.x, merged.y, sp.width, sp.height);
          return { ...merged, x: pos.x, y: pos.y };
        });
        return { ...st, sprites };
      });
    },
    setBubble: (spriteId, bubble) => {
      if (!live()) return;
      setState((st) => {
        const bubbles = { ...st.bubbles };
        if (bubble) bubbles[spriteId] = bubble;
        else delete bubbles[spriteId];
        return { ...st, bubbles };
      });
    },
    setActive: (spriteId, blockId) => {
      if (!live()) return;
      setState((st) => {
        if (st.activeBlocks[spriteId] === blockId) return st;
        const activeBlocks = { ...st.activeBlocks };
        if (blockId) activeBlocks[spriteId] = blockId;
        else delete activeBlocks[spriteId];
        return { ...st, activeBlocks };
      });
    },
  };
}

export function isRunning() {
  return Boolean(token && !token.cancelled);
}

// starts every sprite at once. does nothing if already running
export function play() {
  if (isRunning()) return null;
  runSeq += 1;
  const runToken = { id: runSeq, cancelled: false };
  token = runToken;
  // sprites already overlapping when Play is pressed didn't just collide, so don't swap them
  activePairs = detectCollisionStarts(getState().sprites, new Set()).active;
  frameTime = scheduler.now();
  setState((st) => ({ ...st, running: true, activeBlocks: {}, bubbles: {}, errors: {} }));

  const env = makeEnv(runToken);
  const runs = getState().sprites.map((sp) =>
    createInterpreter(env)
      .runSprite(sp.id)
      .then((result) => {
        if (result.status === "error" && !runToken.cancelled) {
          setState((st) => ({
            ...st,
            errors: { ...st.errors, [sp.id]: String((result.error && result.error.message) || result.error) },
          }));
        }
        return result;
      })
  );
  rafId = scheduler.raf(tick);

  return Promise.all(runs).then((results) => {
    // every script ended by itself (no forever loop), so the run is over
    if (token === runToken && !runToken.cancelled) finishRun(runToken);
    return results;
  });
}

function finishRun(runToken) {
  runToken.cancelled = true;
  const pending = waiters;
  waiters = [];
  pending.forEach((w) => {
    const e = new Error("cancelled");
    e.name = "Cancelled";
    w.reject(e);
  });
  if (rafId != null) scheduler.caf(rafId);
  rafId = null;
  activePairs = new Set();
  setState((st) => ({ ...st, running: false, activeBlocks: {}, bubbles: {} }));
}

// Stop keeps sprites where they are, swapped programs included. Reset is what undoes things.
export function stop() {
  if (token && !token.cancelled) finishRun(token);
}

// walk the swap log backwards and swap each pair back
function undoSwaps(sprites, log) {
  let out = sprites;
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const { a, b, pairs } = log[i];
    const A = out.find((x) => x.id === a);
    const B = out.find((x) => x.id === b);
    if (!A || !B) continue;
    const r = reswapPairs(A.program, B.program, pairs);
    out = out.map((x) => {
      if (x.id === a) return { ...x, program: r.programA };
      if (x.id === b) return { ...x, program: r.programB };
      return x;
    });
  }
  return out;
}

export function reset() {
  stop();
  const log = swapLog;
  swapLog = [];
  setState((st) => {
    const sprites = undoSwaps(st.sprites, log).map((x) => ({ ...x, ...x.initial }));
    return { ...st, sprites, swapCount: 0, lastSwap: null, lastHit: null, errors: {}, bubbles: {}, activeBlocks: {} };
  });
}

// Autosave uses this so we store what the user actually built, not the swapped version.
export function programsWithoutSwaps(sprites) {
  return undoSwaps(sprites, swapLog);
}

export function dispose() {
  stop();
}
