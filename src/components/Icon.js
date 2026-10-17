import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// Simple line icons on a 24x24 grid, mostly based on Lucide.
// Inlined here so we don't need an icon font.
const P = (d, extra) => ({ c: "path", d, ...extra });

const ICONS = {
  play: [P("M7 4.5v15l12-7.5z", { fill: true, noStroke: true })],
  stop: [{ c: "rect", x: 6, y: 6, w: 12, h: 12, rx: 2, fill: true, noStroke: true }],
  reset: [P("M3 12a9 9 0 1 0 3-6.7L3 8"), P("M3 3v5h5")],
  undo: [P("M9 14 4 9l5-5"), P("M4 9h10.5a5.5 5.5 0 0 1 0 11H11")],
  redo: [P("m15 14 5-5-5-5"), P("M20 9H9.5a5.5 5.5 0 0 0 0 11H13")],
  plus: [P("M12 5v14M5 12h14")],
  trash: [P("M3 6h18"), P("M8 6V4h8v2"), P("M19 6l-1 14H6L5 6"), P("M10 11v6M14 11v6")],
  x: [P("M18 6 6 18M6 6l12 12")],
  up: [P("m18 15-6-6-6 6")],
  down: [P("m6 9 6 6 6-6")],
  move: [P("M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"), P("M2 12h20M12 2v20")],
  message: [P("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z")],
  thought: [
    P("M7.5 15A4.5 4.5 0 0 1 6 6.3 5 5 0 0 1 15.6 5 4 4 0 0 1 18 13a3.5 3.5 0 0 1-4.2 2"),
    { c: "circle", cx: 8, cy: 19, r: 1.5 },
    { c: "circle", cx: 4.5, cy: 21.5, r: 1 },
  ],
  repeat: [P("m17 2 4 4-4 4"), P("M3 11v-1a4 4 0 0 1 4-4h14"), P("m7 22-4-4 4-4"), P("M21 13v1a4 4 0 0 1-4 4H3")],
  infinity: [P("M12 12c-2-2.7-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z")],
  rotate: [P("M21 12a9 9 0 1 1-3-6.7L21 8"), P("M21 3v5h-5")],
  target: [
    { c: "circle", cx: 12, cy: 12, r: 9 },
    { c: "circle", cx: 12, cy: 12, r: 3 },
  ],
  code: [P("m16 18 6-6-6-6M8 6l-6 6 6 6")],
  monitor: [{ c: "rect", x: 2, y: 3, w: 20, h: 14, rx: 2 }, P("M8 21h8M12 17v4")],
  check: [P("M20 6 9 17l-5-5")],
  cloud: [P("M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z")],
  alert: [{ c: "circle", cx: 12, cy: 12, r: 9 }, P("M12 8v4M12 16h.01")],
  sparkles: [
    P("M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"),
    P("M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"),
  ],
  zap: [P("M13 2 3 14h9l-1 8 10-12h-9z")],
  maximize: [P("M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3")],
  minimize: [P("M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3")],
};

export default function Icon({ name, size = 18, color = "#182230", strokeWidth = 2 }) {
  const parts = ICONS[name] || [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      {parts.map((p, i) => {
        const common = {
          fill: p.fill ? color : "none",
          stroke: p.noStroke ? "none" : color,
          strokeWidth,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        };
        if (p.c === "circle") return <Circle key={i} {...common} cx={p.cx} cy={p.cy} r={p.r} />;
        if (p.c === "rect") return <Rect key={i} {...common} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} />;
        return <Path key={i} {...common} d={p.d} />;
      })}
    </Svg>
  );
}
