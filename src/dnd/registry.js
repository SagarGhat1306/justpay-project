// Refs to everything drag and drop needs to measure. Blocks in the script register
// themselves when they mount (see BlockView).
export const registry = {
  blocks: new Map(), // block id: { root, row, mouth, foot } refs
  palette: null, // also the delete zone
  workspace: null,
  scrollTo: null,
  scrollY: 0,
  contentHeight: 0,
  viewportHeight: 0,
};

export function registerBlock(id, refs) {
  registry.blocks.set(id, refs);
  return () => {
    if (registry.blocks.get(id) === refs) registry.blocks.delete(id);
  };
}

// null if the view isn't there / hasn't been laid out yet
export function measure(ref) {
  const node = ref && ref.current;
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== "function") {
      resolve(null);
      return;
    }
    // measureInWindow sometimes never calls back for views that are unmounting,
    // don't let one of those hold up the whole drag
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 250);
    node.measureInWindow((x, y, w, h) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(w || h ? { x, y, w, h } : null);
    });
  });
}

export async function measureGeometry() {
  const scrollY = registry.scrollY;
  const entries = Array.from(registry.blocks.entries());
  const [palette, workspace, ...blockRects] = await Promise.all([
    measure(registry.palette),
    measure(registry.workspace),
    ...entries.map(([, r]) => Promise.all([measure(r.root), measure(r.row), measure(r.mouth), measure(r.foot)])),
  ]);
  const blocks = {};
  entries.forEach(([id], i) => {
    const [root, row, mouth, foot] = blockRects[i];
    if (root) blocks[id] = { root, row, mouth, foot };
  });
  return { palette, workspace, blocks, scrollY, scrollDelta: 0 };
}
