// same colours as the web version. block colours are Scratch's own
export const colors = {
  motion: "#4C97FF",
  motionDark: "#3373CC",
  looks: "#9966FF",
  looksDark: "#774DCB",
  control: "#FFAB19",
  controlDark: "#CF8B17",
  controlText: "#3D2600",
  run: "#59C059",
  runDark: "#389438",
  runSoft: "#ECF8EC",
  runBorder: "#C8ECC8",
  danger: "#E5484D",
  dangerDark: "#B93035",
  dangerSoft: "#FDECEC",
  swapText: "#9A5B00",
  swapSoft: "#FFF6E5",
  swapBorder: "#FFE0A8",

  bg: "#F5F7FB",
  panel: "#FFFFFF",
  panelSoft: "#F9FAFB",
  canvas: "#FBFCFE",
  dot: "#DFE3EA",
  text: "#182230",
  text2: "#667085",
  text3: "#98A2B3",
  border: "#E4E7EC",
  borderStrong: "#D0D5DD",
  focus: "#2563EB",
  markerFill: "#C3C8D1",
  markerStroke: "#A8AFBA",
};

export const categoryColors = {
  motion: { fill: colors.motion, dark: colors.motionDark, text: "#FFFFFF" },
  looks: { fill: colors.looks, dark: colors.looksDark, text: "#FFFFFF" },
  control: { fill: colors.control, dark: colors.controlDark, text: colors.controlText },
};

export const radius = { sm: 6, md: 8, lg: 12, xl: 16 };

export const shadow = {
  sm: {
    shadowColor: "#101828",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: "#101828",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#101828",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
};

// App.js sets loaded = true once Inter is in. Before that (or if it failed) we use the
// system font with a normal fontWeight instead.
export const fontState = { loaded: false };

const FAMILIES = {
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
};

export function fontFor(weight = 400) {
  const w = Number(weight) || 400;
  if (fontState.loaded) return { fontFamily: FAMILIES[w] || FAMILIES[400] };
  return { fontWeight: String(w) };
}
