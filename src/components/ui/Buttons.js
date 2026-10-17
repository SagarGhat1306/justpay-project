import React from "react";
import { Pressable, View } from "react-native";
import { useStore } from "../../state/useStore";
import { colors } from "../../theme";
import { Txt } from "./Txt";
import Icon from "../Icon";

// box/text are classes, fg is for the icon (an SVG prop, so it needs the real colour).
// Tones without their own disabled look just fade out.
const TONES = {
  go: {
    box: "bg-run border-run-dark active:bg-[#4CB24C]",
    text: "text-white",
    fg: "#FFFFFF",
    disabled: { box: "bg-run-soft border-run-border", text: "text-run-dark", fg: colors.runDark },
  },
  danger: {
    box: "bg-danger border-danger-dark active:bg-[#D63C41]",
    text: "text-white",
    fg: "#FFFFFF",
    disabled: { box: "bg-panel border-line", text: "text-ink-3", fg: colors.text3 },
  },
  primary: { box: "bg-motion border-motion-dark active:bg-[#3D88F0]", text: "text-white", fg: "#FFFFFF" },
  outline: { box: "bg-panel border-line-strong active:bg-panel-soft", text: "text-ink", fg: colors.text },
  ghost: { box: "bg-transparent border-line active:bg-panel-soft", text: "text-ink-2", fg: colors.text2 },
  plain: { box: "bg-transparent border-transparent active:bg-panel-soft", text: "text-ink-2", fg: colors.text2 },
};

// label is still used for accessibility when showLabel is false
export function IconButton({ icon, label, accessibilityLabel, onPress, disabled, tone = "outline", showLabel = true, size = "md" }) {
  const t = TONES[tone];
  const look = disabled && t.disabled ? t.disabled : t;
  const small = size === "sm";
  const iconOnly = !showLabel;

  let box = small ? "h-8 px-2.5" : "h-10 px-3.5";
  if (iconOnly) box = small ? "h-8 w-8 px-0" : "h-10 w-10 px-0";
  let state = "active:translate-y-px";
  if (disabled) state = t.disabled ? "" : "opacity-[0.45]";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={4}
      className={`flex-row items-center justify-center gap-x-1.5 rounded-md border ${box} ${look.box} ${state}`}
    >
      <Icon name={icon} size={small ? 15 : 17} color={look.fg} />
      {showLabel && (
        <Txt w={600} className={`${small ? "text-sm" : "text-base"} ${look.text}`}>
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

export function SwapPill() {
  const swapCount = useStore((s) => s.swapCount);
  const hot = swapCount > 0;
  return (
    <View
      className={`h-[22px] flex-row items-center gap-x-1 rounded-full border px-2 ${hot ? "border-swap-border bg-swap-soft" : "border-line bg-panel-soft"}`}
      accessibilityLabel={`${swapCount} collision ${swapCount === 1 ? "swap" : "swaps"}`}
    >
      <Icon name="zap" size={12} color={hot ? colors.swapText : colors.text2} />
      <Txt w={500} className={`text-xs ${hot ? "text-swap-ink" : "text-ink-2"}`}>
        {swapCount} {swapCount === 1 ? "swap" : "swaps"}
      </Txt>
    </View>
  );
}
