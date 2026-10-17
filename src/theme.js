// Layout and most colours are Tailwind classes now (see tailwind.config.js). This file is
// for the things classes can't do: colours passed to SVG/icon props, shadows, and the font.
import palette from "./palette";

export const colors = palette;

export const categoryColors = {
  motion: { fill: colors.motion, dark: colors.motionDark, text: "#FFFFFF" },
  looks: { fill: colors.looks, dark: colors.looksDark, text: "#FFFFFF" },
  control: { fill: colors.control, dark: colors.controlDark, text: colors.controlText },
};

// shadowColor/shadowOffset on iOS and elevation on Android, easier to keep as objects
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
