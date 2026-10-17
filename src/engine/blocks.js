// A program is just an array of plain objects: { id, type, params, children? }.
// Only repeat / repeatForever have children. Keeping it as plain data means it
// can go straight into JSON for saving, and the interpreter decides what each type does.

export const CATEGORIES = [
  { id: "motion", label: "Motion", icon: "move" },
  { id: "looks", label: "Looks", icon: "message" },
  { id: "control", label: "Control", icon: "repeat" },
];

// label parts: plain strings are shown as text, objects become input bubbles
export const BLOCK_DEFS = {
  move: {
    category: "motion",
    label: ["move", { param: "steps", kind: "number" }, "steps"],
    defaults: { steps: "10" },
  },
  turn: {
    category: "motion",
    label: ["turn", { param: "degrees", kind: "number" }, "degrees"],
    defaults: { degrees: "15" },
  },
  goTo: {
    category: "motion",
    label: ["go to x:", { param: "x", kind: "number" }, "y:", { param: "y", kind: "number" }],
    defaults: { x: "0", y: "0" },
  },
  say: {
    category: "looks",
    label: ["say", { param: "message", kind: "text" }, "for", { param: "seconds", kind: "number" }, "seconds"],
    defaults: { message: "Hello!", seconds: "2" },
  },
  think: {
    category: "looks",
    label: ["think", { param: "message", kind: "text" }, "for", { param: "seconds", kind: "number" }, "seconds"],
    defaults: { message: "Hmm...", seconds: "2" },
  },
  repeat: {
    category: "control",
    label: ["repeat", { param: "times", kind: "number" }, "times"],
    defaults: { times: "10" },
    container: true,
  },
  repeatForever: {
    category: "control",
    label: ["repeat forever"],
    defaults: {},
    container: true,
  },
};

export const PALETTE = {
  motion: ["move", "turn", "goTo"],
  looks: ["say", "think"],
  control: ["repeat", "repeatForever"],
};

export const isContainer = (type) => Boolean(BLOCK_DEFS[type] && BLOCK_DEFS[type].container);

let counter = 0;
export function uid(prefix = "b") {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createBlock(type, params) {
  const def = BLOCK_DEFS[type];
  if (!def) throw new Error(`Unknown block type: ${type}`);
  const block = { id: uid("b"), type, params: { ...def.defaults, ...(params || {}) } };
  if (def.container) block.children = [];
  return block;
}

// e.g. buildProgram([["repeatForever", {}, [["move", { steps: "10" }]]]])
export function buildProgram(spec) {
  return spec.map(([type, params, children]) => {
    const b = createBlock(type, params);
    if (b.children && children) b.children = buildProgram(children);
    return b;
  });
}

export function findBlock(blocks, id) {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const f = findBlock(b.children, id);
      if (f) return f;
    }
  }
  return null;
}

// where a block lives: { parentId, index }. parentId is null for top-level blocks
export function locateBlock(blocks, id, parentId = null) {
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.id === id) return { parentId, index: i };
    if (b.children) {
      const f = locateBlock(b.children, id, b.id);
      if (f) return f;
    }
  }
  return null;
}

export function getChildren(blocks, parentId) {
  if (parentId == null) return blocks;
  const p = findBlock(blocks, parentId);
  return p && p.children ? p.children : [];
}

export function containsBlock(block, id) {
  if (!block) return false;
  if (block.id === id) return true;
  return Boolean(block.children && block.children.some((c) => containsBlock(c, id)));
}

// Replace one block via fn. Untouched branches keep their old references,
// so memoized components don't re-render for nothing.
export function mapBlock(blocks, id, fn) {
  let changed = false;
  const next = blocks.map((b) => {
    if (b.id === id) {
      changed = true;
      return fn(b);
    }
    if (b.children) {
      const kids = mapBlock(b.children, id, fn);
      if (kids !== b.children) {
        changed = true;
        return { ...b, children: kids };
      }
    }
    return b;
  });
  return changed ? next : blocks;
}

export function updateParams(blocks, id, patch) {
  return mapBlock(blocks, id, (b) => ({ ...b, params: { ...b.params, ...patch } }));
}

// returns [newTree, removedBlock]
export function removeBlock(blocks, id) {
  let removed = null;
  const walk = (list) => {
    let changed = false;
    const out = [];
    for (const b of list) {
      if (b.id === id) {
        removed = b;
        changed = true;
        continue;
      }
      if (b.children) {
        const kids = walk(b.children);
        if (kids !== b.children) {
          changed = true;
          out.push({ ...b, children: kids });
          continue;
        }
      }
      out.push(b);
    }
    return changed ? out : list;
  };
  const next = walk(blocks);
  return [next, removed];
}

export function insertBlock(blocks, parentId, index, block) {
  const insertAt = (list) => {
    const i = Math.max(0, Math.min(index, list.length));
    return [...list.slice(0, i), block, ...list.slice(i)];
  };
  if (parentId == null) return insertAt(blocks);
  const parent = findBlock(blocks, parentId);
  if (!parent || !parent.children) return insertAt(blocks); // parent is gone, just put it at the top level
  return mapBlock(blocks, parentId, (p) => ({ ...p, children: insertAt(p.children) }));
}

export function moveBlock(blocks, id, parentId, index) {
  const block = findBlock(blocks, id);
  if (!block) return blocks;
  // can't drop a repeat inside itself
  if (parentId != null && containsBlock(block, parentId)) return blocks;
  const from = locateBlock(blocks, id);
  let target = index;
  // moving down in the same list: removing it first shifts everything up by one
  if (from && from.parentId === (parentId == null ? null : parentId) && from.index < index) target -= 1;
  const [without] = removeBlock(blocks, id);
  return insertBlock(without, parentId, target, block);
}

// depth first, so the order matches what you see top to bottom
export function collectByType(blocks, type, out = []) {
  for (const b of blocks) {
    if (b.type === type) out.push(b);
    if (b.children) collectByType(b.children, type, out);
  }
  return out;
}

export function countBlocks(blocks) {
  return blocks.reduce((n, b) => n + 1 + (b.children ? countBlocks(b.children) : 0), 0);
}

export function cloneWithNewIds(blocks) {
  return blocks.map((b) => {
    const c = { ...b, id: uid("b"), params: { ...b.params } };
    if (b.children) c.children = cloneWithNewIds(b.children);
    return c;
  });
}

// inputs are stored as strings (so "-" can be typed), parse them when needed
export function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : fallback;
}
