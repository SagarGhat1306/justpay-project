import { useSyncExternalStore } from "react";
import { computeTarget } from "./hitTest";
import { registry, measureGeometry } from "./registry";
import { getState, getSprite } from "../state/store";

// The current drag lives out here instead of in React state. The finger moves ~60 times
// a second, and this way only the components that care about that bit re-render.
// x/y = finger in window coords, offsetX/Y = where the finger grabbed the block.
const EMPTY = { payload: null, x: 0, y: 0, offsetX: 0, offsetY: 0, width: 0, target: null };
let drag = EMPTY;
let geo = null;
let autoScrollTimer = null;
let onDropHandler = null;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export const getDrag = () => drag;

function subscribeDrag(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDrag(selector) {
  const read = () => selector(drag);
  return useSyncExternalStore(subscribeDrag, read, read);
}

export function setDropHandler(fn) {
  onDropHandler = fn;
}

function program() {
  const s = getState();
  const sp = getSprite(s.selectedId, s);
  return sp ? sp.program : [];
}

function retarget() {
  if (!drag.payload) return;
  const g = geo && { ...geo, scrollDelta: registry.scrollY - geo.scrollY };
  const target = computeTarget(drag.x, drag.y, g, program(), drag.payload);
  // computeTarget always returns a new object, compare by value so we don't emit for nothing
  const same =
    target === drag.target ||
    (target && drag.target && target.type === drag.target.type && target.key === drag.target.key && target.index === drag.target.index);
  if (!same) {
    drag = { ...drag, target };
    emit();
  }
}

// holding a block near the top/bottom of the script scrolls it, faster the closer you get
function autoScrollTick() {
  if (!drag.payload || !geo || !geo.workspace) return;
  const ws = geo.workspace;
  const edge = 56;
  let dy = 0;
  if (drag.x >= ws.x && drag.x <= ws.x + ws.w) {
    if (drag.y < ws.y + edge && drag.y > ws.y - 24) dy = -Math.ceil((ws.y + edge - drag.y) / 5);
    else if (drag.y > ws.y + ws.h - edge && drag.y < ws.y + ws.h + 24) dy = Math.ceil((drag.y - (ws.y + ws.h - edge)) / 5);
  }
  if (!dy || !registry.scrollTo) return;
  const maxY = Math.max(0, registry.contentHeight - registry.viewportHeight);
  const next = Math.max(0, Math.min(maxY, registry.scrollY + dy));
  if (next === registry.scrollY) return;
  registry.scrollY = next;
  registry.scrollTo(next);
  retarget();
}

// sourceRect = where the dragged block is on screen, so the ghost starts right under the finger.
// Measuring the drop targets is async, until it comes back there's simply no target.
export function startDrag(payload, fingerX, fingerY, sourceRect) {
  geo = null;
  drag = {
    payload,
    x: fingerX,
    y: fingerY,
    offsetX: sourceRect ? Math.max(0, Math.min(fingerX - sourceRect.x, sourceRect.w)) : 24,
    offsetY: sourceRect ? Math.max(0, Math.min(fingerY - sourceRect.y, sourceRect.h)) : 20,
    width: sourceRect ? sourceRect.w : 0,
    target: null,
  };
  emit();
  measureGeometry().then((g) => {
    if (drag.payload !== payload) return; // too late, drag already ended
    geo = g;
    retarget();
  });
  if (autoScrollTimer) clearInterval(autoScrollTimer);
  autoScrollTimer = setInterval(autoScrollTick, 16);
}

// Workspace already measured everything to find out which block was long-pressed,
// no point doing it twice.
export function startDragWithGeometry(payload, fingerX, fingerY, sourceRect, measured) {
  startDrag(payload, fingerX, fingerY, sourceRect);
  geo = measured;
  retarget();
}

export function moveDrag(fingerX, fingerY) {
  if (!drag.payload) return;
  drag = { ...drag, x: fingerX, y: fingerY };
  emit();
  retarget();
}

export function endDrag(commit) {
  if (!drag.payload) return;
  if (autoScrollTimer) clearInterval(autoScrollTimer);
  autoScrollTimer = null;
  const { payload, target } = drag;
  drag = EMPTY;
  geo = null;
  emit();
  if (commit && target && onDropHandler) onDropHandler(payload, target);
}
