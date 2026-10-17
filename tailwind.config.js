const c = require("./src/palette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.js"],
  presets: [require("nativewind/preset")],
  theme: {
    // px sizes without a line-height, so text lays out the same as before
    fontSize: {
      "2xs": "11px",
      xs: "12px",
      sm: "13px",
      base: "14px",
      md: "15px",
      lg: "18px",
    },
    extend: {
      colors: {
        app: c.bg,
        canvas: c.canvas,
        focus: c.focus,
        motion: { DEFAULT: c.motion, dark: c.motionDark },
        looks: { DEFAULT: c.looks, dark: c.looksDark },
        control: { DEFAULT: c.control, dark: c.controlDark, ink: c.controlText },
        run: { DEFAULT: c.run, dark: c.runDark, soft: c.runSoft, border: c.runBorder },
        danger: { DEFAULT: c.danger, dark: c.dangerDark, soft: c.dangerSoft },
        swap: { ink: c.swapText, soft: c.swapSoft, border: c.swapBorder },
        panel: { DEFAULT: c.panel, soft: c.panelSoft },
        ink: { DEFAULT: c.text, 2: c.text2, 3: c.text3 },
        line: { DEFAULT: c.border, strong: c.borderStrong },
      },
      borderRadius: { sm: "6px", md: "8px", lg: "12px", xl: "16px" },
    },
  },
};
