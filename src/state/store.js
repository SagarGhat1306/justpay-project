// Small hand-rolled store, didn't feel worth pulling in redux/zustand for this.
// Components read it with useStore(selector).
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createBlock,
  buildProgram,
  insertBlock,
  moveBlock as moveBlockInTree,
  removeBlock,
  updateParams,
  locateBlock,
  getChildren,
  uid,
} from "../engine/blocks";
import { clampToStage, normalizeDirection } from "../engine/coords";
import { COSTUMES } from "./costumes";

export const STORAGE_KEY = "scratch-studio:project:v1";
const HISTORY_LIMIT = 100;

let listeners = new Set();
let notifyQueued = false;

// While a script runs, setState gets called several times per frame (every sprite moves).
// Collect those and tell React once.
function notify() {
  if (notifyQueued) return;
  notifyQueued = true;
  const run = () => {
    notifyQueued = false;
    listeners.forEach((l) => l());
  };
  if (typeof queueMicrotask === "function") queueMicrotask(run);
  else Promise.resolve().then(run);
}

export function makeSprite({ name, costume = "cat", x = 0, y = 0, direction = 90, program = [] }) {
  const size = (COSTUMES[costume] || COSTUMES.cat).size;
  const pos = clampToStage(x, y, size, size);
  const pose = { x: pos.x, y: pos.y, direction: normalizeDirection(direction) };
  return { id: uid("s"), name, costume, width: size, height: size, ...pose, initial: pose, program };
}

// Cat walks right forever, Dog walks left forever. They bump into each other in the
// middle, swap move values, and walk apart. Also what you get on first launch.
export function collisionDemoSprites() {
  return [
    makeSprite({
      name: "Cat",
      costume: "cat",
      x: -160,
      y: 0,
      program: buildProgram([["repeatForever", {}, [["move", { steps: "10" }]]]]),
    }),
    makeSprite({
      name: "Dog",
      costume: "dog",
      x: 160,
      y: 0,
      program: buildProgram([["repeatForever", {}, [["move", { steps: "-10" }]]]]),
    }),
  ];
}

function defaultProject() {
  const sprites = collisionDemoSprites();
  return { title: "Collision demo", sprites, selectedId: sprites[0].id };
}

// Don't trust what comes out of storage too much, it could be from an older version
// or half written. Returns null if we can't use it.
export function parseProject(data) {
  try {
    if (!data || !Array.isArray(data.sprites) || data.sprites.length === 0) return null;
    const sprites = data.sprites.map((s) => {
      const base = makeSprite({
        name: String(s.name || "Sprite"),
        costume: COSTUMES[s.costume] ? s.costume : "cat",
        x: Number(s.initial && s.initial.x) || 0,
        y: Number(s.initial && s.initial.y) || 0,
        direction: Number(s.initial && s.initial.direction) || 90,
        program: Array.isArray(s.program) ? s.program : [],
      });
      return { ...base, id: typeof s.id === "string" ? s.id : base.id };
    });
    const selectedId = sprites.some((s) => s.id === data.selectedId) ? data.selectedId : sprites[0].id;
    return { title: String(data.title || "Untitled project"), sprites, selectedId };
  } catch {
    return null;
  }
}

function initialState(project) {
  return {
    ...project,
    running: false,
    activeBlocks: {}, // spriteId: id of the block running right now (gets highlighted)
    bubbles: {}, // spriteId: { kind, text, key }
    swapCount: 0,
    lastPlaced: null, // last dropped block, for the little bump animation
    selectedBlockId: null, // tapped block, shows up/down/delete buttons
    lastSwap: null, // for the swap toast on the stage
    lastHit: null, // last collision { n, ids, x, y, at }, drives the bump animation
    errors: {}, // spriteId: error message
    projectVersion: 0,
    saveStatus: "saved",
    history: { past: [], future: [], lastKey: null, lastAt: 0 },
  };
}

let state = initialState(defaultProject());

// Called once on startup. If anything goes wrong we just keep the demo project.
export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const project = parseProject(JSON.parse(raw));
    if (!project) return false;
    state = { ...initialState(project), saveStatus: "saved" };
    notify();
    return true;
  } catch {
    return false;
  }
}

export const getState = () => state;
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(updater) {
  const next = typeof updater === "function" ? updater(state) : { ...state, ...updater };
  if (!next || next === state) return;
  state = next;
  notify();
}

export const getSprite = (id, s = state) => s.sprites.find((sp) => sp.id === id) || null;

function updateSprite(s, id, fn) {
  let changed = false;
  const sprites = s.sprites.map((sp) => {
    if (sp.id !== id) return sp;
    const n = fn(sp);
    if (n !== sp) changed = true;
    return n;
  });
  return changed ? { ...s, sprites } : s;
}

const snapshotPrograms = (s) => s.sprites.map((sp) => [sp.id, sp.program]);

// Pushes an undo snapshot and bumps projectVersion (autosave watches that).
// Typing "123" into a field would otherwise be three undo steps, so edits with the
// same coalesceKey that land close together get merged into one.
function commit(prev, next, coalesceKey) {
  if (next === prev) return prev;
  const now = Date.now();
  const h = prev.history;
  const coalesce = coalesceKey && h.lastKey === coalesceKey && now - h.lastAt < 1200;
  const past = coalesce ? h.past : [...h.past, snapshotPrograms(prev)].slice(-HISTORY_LIMIT);
  return {
    ...next,
    projectVersion: prev.projectVersion + 1,
    history: { past, future: [], lastKey: coalesceKey || null, lastAt: now },
  };
}

function editProgram(spriteId, fn, coalesceKey) {
  setState((s) => {
    const next = updateSprite(s, spriteId, (sp) => {
      const program = fn(sp.program);
      return program === sp.program ? sp : { ...sp, program };
    });
    return commit(s, next, coalesceKey);
  });
}

let placedSeq = 0;
function markPlaced(id) {
  placedSeq += 1;
  const n = placedSeq;
  setState((s) => ({ ...s, lastPlaced: { id, n } }));
}

export const actions = {
  selectSprite(id) {
    if (getSprite(id)) setState({ selectedId: id, selectedBlockId: null });
  },

  selectBlock(id) {
    setState((s) => (s.selectedBlockId === id ? s : { ...s, selectedBlockId: id }));
  },

  addBlock(spriteId, type, parentId = null, index = Infinity) {
    const block = createBlock(type);
    editProgram(spriteId, (p) => insertBlock(p, parentId, index, block));
    markPlaced(block.id);
    return block.id;
  },

  moveBlock(spriteId, blockId, parentId, index) {
    editProgram(spriteId, (p) => moveBlockInTree(p, blockId, parentId, index));
    markPlaced(blockId);
  },

  // the up/down buttons. only moves within the same list, never in/out of a repeat
  nudgeBlock(spriteId, blockId, delta) {
    editProgram(spriteId, (p) => {
      const loc = locateBlock(p, blockId);
      if (!loc) return p;
      const list = getChildren(p, loc.parentId);
      const target = loc.index + delta;
      if (target < 0 || target >= list.length) return p;
      return moveBlockInTree(p, blockId, loc.parentId, delta > 0 ? target + 1 : target);
    });
  },

  deleteBlock(spriteId, blockId) {
    editProgram(spriteId, (p) => removeBlock(p, blockId)[0]);
    if (state.selectedBlockId === blockId) setState({ selectedBlockId: null });
  },

  updateParam(spriteId, blockId, key, value) {
    editProgram(spriteId, (p) => updateParams(p, blockId, { [key]: value }), `${blockId}:${key}`);
  },

  clearProgram(spriteId) {
    editProgram(spriteId, () => []);
  },

  undo() {
    setState((s) => {
      const { past, future } = s.history;
      if (!past.length || s.running) return s;
      const snap = past[past.length - 1];
      const map = new Map(snap);
      return {
        ...s,
        sprites: s.sprites.map((sp) => (map.has(sp.id) ? { ...sp, program: map.get(sp.id) } : sp)),
        projectVersion: s.projectVersion + 1,
        history: { past: past.slice(0, -1), future: [snapshotPrograms(s), ...future], lastKey: null, lastAt: 0 },
      };
    });
  },

  redo() {
    setState((s) => {
      const { past, future } = s.history;
      if (!future.length || s.running) return s;
      const map = new Map(future[0]);
      return {
        ...s,
        sprites: s.sprites.map((sp) => (map.has(sp.id) ? { ...sp, program: map.get(sp.id) } : sp)),
        projectVersion: s.projectVersion + 1,
        history: { past: [...past, snapshotPrograms(s)], future: future.slice(1), lastKey: null, lastAt: 0 },
      };
    });
  },

  // sprites

  addSprite(costume = "cat") {
    const s = state;
    const label = (COSTUMES[costume] || COSTUMES.cat).label;
    // "Cat", "Cat 2", "Cat 3"...
    const sameKind = s.sprites.filter((sp) => sp.name.replace(/\s\d+$/, "") === label).length;
    const name = sameKind === 0 ? label : `${label} ${sameKind + 1}`;
    const n = s.sprites.length;
    // spread new sprites around a bit so they don't all land on top of each other
    const sprite = makeSprite({
      name,
      costume,
      x: ((n * 70) % 300) - 150,
      y: n % 2 === 0 ? 90 : -90,
    });
    setState((st) => ({
      ...st,
      sprites: [...st.sprites, sprite],
      selectedId: sprite.id,
      projectVersion: st.projectVersion + 1,
    }));
    return sprite.id;
  },

  removeSprite(id) {
    setState((s) => {
      if (s.sprites.length <= 1 || s.running) return s;
      const idx = s.sprites.findIndex((sp) => sp.id === id);
      if (idx < 0) return s;
      const sprites = s.sprites.filter((sp) => sp.id !== id);
      const selectedId = s.selectedId === id ? sprites[Math.max(0, idx - 1)].id : s.selectedId;
      return { ...s, sprites, selectedId, projectVersion: s.projectVersion + 1 };
    });
  },

  renameSprite(id, name) {
    setState((s) => ({
      ...updateSprite(s, id, (sp) => ({ ...sp, name })),
      projectVersion: s.projectVersion + 1,
    }));
  },

  // from the x/y/direction fields or dragging on the stage. this also becomes
  // the position Reset goes back to
  placeSprite(id, partial) {
    setState((s) => {
      if (s.running) return s;
      const next = updateSprite(s, id, (sp) => {
        const merged = { x: sp.x, y: sp.y, direction: sp.direction, ...partial };
        const pos = clampToStage(merged.x, merged.y, sp.width, sp.height);
        const pose = { x: pos.x, y: pos.y, direction: normalizeDirection(merged.direction) };
        return { ...sp, ...pose, initial: pose };
      });
      return { ...next, projectVersion: s.projectVersion + 1 };
    });
  },

  setTitle(title) {
    setState((s) => ({ ...s, title, projectVersion: s.projectVersion + 1 }));
  },

  loadCollisionDemo() {
    setState((s) => {
      if (s.running) return s;
      const sprites = collisionDemoSprites();
      return {
        ...s,
        title: "Collision demo",
        sprites,
        selectedId: sprites[0].id,
        swapCount: 0,
        lastSwap: null,
        lastHit: null,
        errors: {},
        projectVersion: s.projectVersion + 1,
        history: { past: [...s.history.past, snapshotPrograms(s)].slice(-HISTORY_LIMIT), future: [], lastKey: null, lastAt: 0 },
      };
    });
  },
};
