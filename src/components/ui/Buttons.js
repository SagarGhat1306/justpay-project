import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useStore } from "../../state/useStore";
import { colors, radius } from "../../theme";
import { Txt } from "./Txt";
import Icon from "../Icon";

const TONES = {
  go: { bg: colors.run, fg: "#FFFFFF", border: colors.runDark, pressed: "#4CB24C", disabledBg: colors.runSoft, disabledFg: colors.runDark, disabledBorder: colors.runBorder },
  danger: { bg: colors.danger, fg: "#FFFFFF", border: colors.dangerDark, pressed: "#D63C41", disabledBg: colors.panel, disabledFg: colors.text3, disabledBorder: colors.border },
  primary: { bg: colors.motion, fg: "#FFFFFF", border: colors.motionDark, pressed: "#3D88F0" },
  outline: { bg: colors.panel, fg: colors.text, border: colors.borderStrong, pressed: colors.panelSoft },
  ghost: { bg: "transparent", fg: colors.text2, border: colors.border, pressed: colors.panelSoft },
  plain: { bg: "transparent", fg: colors.text2, border: "transparent", pressed: colors.panelSoft },
};

// label is still used for accessibility when showLabel is false
export function IconButton({ icon, label, accessibilityLabel, onPress, disabled, tone = "outline", showLabel = true, size = "md" }) {
  const t = TONES[tone];
  const small = size === "sm";
  const iconOnly = !showLabel;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSm,
        iconOnly && (small ? styles.iconOnlySm : styles.iconOnly),
        { backgroundColor: t.bg, borderColor: t.border },
        pressed && !disabled && { backgroundColor: t.pressed, transform: [{ translateY: 1 }] },
        disabled && (t.disabledBg ? { backgroundColor: t.disabledBg, borderColor: t.disabledBorder } : styles.disabled),
      ]}
    >
      <Icon name={icon} size={small ? 15 : 17} color={disabled && t.disabledFg ? t.disabledFg : t.fg} />
      {showLabel && (
        <Txt w={600} style={[styles.label, small && styles.labelSm, { color: disabled && t.disabledFg ? t.disabledFg : t.fg }]}>
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
      style={[styles.pill, hot && styles.pillHot]}
      accessibilityLabel={`${swapCount} collision ${swapCount === 1 ? "swap" : "swaps"}`}
    >
      <Icon name="zap" size={12} color={hot ? colors.swapText : colors.text2} />
      <Txt w={500} style={[styles.pillText, hot && { color: colors.swapText }]}>
        {swapCount} {swapCount === 1 ? "swap" : "swaps"}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btnSm: { height: 32, paddingHorizontal: 10 },
  iconOnly: { width: 40, paddingHorizontal: 0 },
  iconOnlySm: { width: 32, paddingHorizontal: 0 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 14 },
  labelSm: { fontSize: 13 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 4,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillHot: { backgroundColor: colors.swapSoft, borderColor: colors.swapBorder },
  pillText: { fontSize: 12, color: colors.text2 },
});
