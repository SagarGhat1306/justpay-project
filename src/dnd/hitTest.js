// Figures out where a dragged block would land. No React in here, just rectangles.
//
// There's no elementFromPoint on mobile, so when a drag starts we measure every block
// once (registry.js) and do the maths ourselves. All rects are { x, y, w, h } in window
// coords. If the script auto-scrolls during the drag, scrollDelta says by how much.
//
// Where it lands:
//   finger inside a repeat's mouth         -> inside that repeat
//   upper half of a repeat's bottom bar    -> inside that repeat, at the end
//   anywhere else in the script area       -> top level
//   over the palette (for a script block)  -> delete
// The position in the list is based on the finger's y. A block can't go inside itself.

export const inRect = (r, x, y) => Boolean(r) && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const shift = (r, dy) => (r ? { x: r.x, y: r.y - dy, w: r.w, h: r.h } : r);

function blockGeo(geo, id) {
  const g = geo.blocks[id];
  if (!g) return null;
  const d = geo.scrollDelta || 0;
  return { root: shift(g.root, d), row: shift(g.row, d), mouth: shift(g.mouth, d), foot: shift(g.foot, d) };
}

// goes before block i if the finger is above the middle of its first row (capped at 22px
// so tall blocks with wrapped text don't get a huge drop zone)
export function indexIn(list, y, geo) {
  for (let i = 0; i < list.length; i += 1) {
    const g = blockGeo(geo, list[i].id);
    if (!g || !g.root) continue;
    const rowH = g.row ? g.row.h : g.root.h;
    if (y < g.root.y + Math.min(rowH / 2, 22)) return i;
  }
  return list.length;
}

function searchContainers(list, x, y, geo, excludeId) {
  for (const b of list) {
    if (b.id === excludeId || !b.children) continue;
    const g = blockGeo(geo, b.id);
    if (!g || !g.mouth) continue;
    // an empty mouth is pretty narrow, give it at least 160px to aim at
    const right = Math.max(g.root ? g.root.x + g.root.w : 0, g.mouth.x + 160);
    const inMouth = x >= g.mouth.x - 6 && x <= right && y >= g.mouth.y && y < g.mouth.y + g.mouth.h;
    if (inMouth) {
      const deeper = searchContainers(b.children, x, y, geo, excludeId);
      if (deeper) return deeper;
      return { parentId: b.id, index: indexIn(b.children, y, geo) };
    }
    if (g.foot && x >= g.foot.x && x <= g.foot.x + g.foot.w && y >= g.foot.y && y < g.foot.y + g.foot.h / 2) {
      return { parentId: b.id, index: b.children.length };
    }
    // not in this one, but there could be a repeat nested further down
    const nested = searchContainers(b.children, x, y, geo, excludeId);
    if (nested) return nested;
  }
  return null;
}

// payload is { kind: "palette", type } or { kind: "block", blockId }
// returns { type: "delete" }, { type: "list", parentId, index, key } or null
export function computeTarget(x, y, geo, program, payload) {
  if (!geo) return null;
  if (inRect(geo.palette, x, y)) return payload.kind === "block" ? { type: "delete" } : null;
  if (!inRect(geo.workspace, x, y)) return null;
  const excludeId = payload.kind === "block" ? payload.blockId : null;
  const hit = searchContainers(program, x, y, geo, excludeId);
  const parentId = hit ? hit.parentId : null;
  const index = hit ? hit.index : indexIn(program, y, geo);
  return { type: "list", parentId, index, key: parentId || "" };
}

// Which block did the long-press hit? Keeps walking after a match so a block nested
// inside a repeat wins over the repeat itself.
export function blockAt(x, y, geo, program) {
  let found = null;
  const walk = (list) => {
    for (const b of list) {
      const g = blockGeo(geo, b.id);
      if (!g) continue;
      if (inRect(g.row, x, y) || inRect(g.foot, x, y)) found = b;
      if (b.children) walk(b.children);
    }
  };
  walk(program);
  return found;
}
