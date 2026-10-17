import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { useStore } from "../state/useStore";
import { actions } from "../state/store";
import { colors, radius } from "../theme";
import { IconButton } from "./ui/Buttons";
import { Field, Txt } from "./ui/Txt";
import Icon from "./Icon";

function Logo({ size = 28 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={2} y={5} width={20} height={9} rx={3} fill={colors.motion} />
      <Rect x={10} y={16} width={20} height={9} rx={3} fill={colors.control} />
      <Rect x={5} y={9} width={6} height={4} rx={1.5} fill={colors.looks} />
      <Circle cx={26} cy={9} r={3.5} fill={colors.run} />
    </Svg>
  );
}

function SaveStatus() {
  const status = useStore((s) => s.saveStatus);
  const map = {
    saved: { icon: "check", text: "Saved", color: colors.runDark },
    saving: { icon: "cloud", text: "Saving…", color: colors.text2 },
    error: { icon: "alert", text: "Not saved", color: colors.danger },
  };
  const m = map[status] || map.saved;
  return (
    <View style={styles.save} accessibilityLabel={`Project ${m.text}`}>
      <Icon name={m.icon} size={14} color={m.color} />
      <Txt style={[styles.saveText, status === "error" && { color: colors.danger }]}>{m.text}</Txt>
    </View>
  );
}

// size is "narrow" | "medium" | "wide", same as the layout modes in App.js
export default function Header({ onPlay, onStop, onReset, size = "wide" }) {
  const compact = size === "narrow";
  const medium = size === "medium";
  const title = useStore((s) => s.title);
  const running = useStore((s) => s.running);
  const canUndo = useStore((s) => s.history.past.length > 0);
  const canRedo = useStore((s) => s.history.future.length > 0);
  const [draft, setDraft] = useState(null); // null when not editing

  const commitTitle = () => {
    if (draft == null) return;
    const t = draft.trim() || "Untitled project";
    if (t !== title) actions.setTitle(t);
    setDraft(null);
  };

  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      <View style={styles.brand}>
        <Logo size={compact ? 26 : 30} />
        {!compact && (
          <Txt w={700} style={styles.brandName}>
            Scratch Studio
          </Txt>
        )}
      </View>
      {!compact && <View style={styles.divider} />}
      <Field
        style={[styles.title, compact && styles.titleCompact, medium && styles.titleMedium]}
        value={draft ?? title}
        maxLength={48}
        returnKeyType="done"
        autoCapitalize="sentences"
        accessibilityLabel="Project title"
        onChangeText={setDraft}
        onEndEditing={commitTitle}
        onSubmitEditing={commitTitle}
      />
      {size === "wide" && <SaveStatus />}
      {size === "wide" && <View style={styles.spacer} />}
      {medium && <View style={styles.spacerSmall} />}
      <View style={styles.toolbar}>
        {!compact && (
          <View style={styles.history}>
            <IconButton icon="undo" label="Undo" tone="plain" showLabel={false} onPress={actions.undo} disabled={!canUndo || running} />
            <IconButton icon="redo" label="Redo" tone="plain" showLabel={false} onPress={actions.redo} disabled={!canRedo || running} />
          </View>
        )}
        <IconButton icon="reset" label="Reset" accessibilityLabel="Reset stage" tone="outline" onPress={onReset} showLabel={size === "wide"} />
        <IconButton icon="stop" label="Stop" tone="danger" onPress={onStop} disabled={!running} showLabel={size === "wide"} />
        <IconButton icon="play" label={running ? "Running" : "Play"} accessibilityLabel="Play" tone="go" onPress={onPlay} disabled={running} showLabel={!compact} />
      </View>
    </View>
  );
}

// on phones the header is already full, so undo/redo sit next to the tabs instead
export function CompactHistory() {
  const running = useStore((s) => s.running);
  const canUndo = useStore((s) => s.history.past.length > 0);
  const canRedo = useStore((s) => s.history.future.length > 0);
  return (
    <View style={styles.history}>
      <IconButton icon="undo" label="Undo" tone="plain" size="sm" showLabel={false} onPress={actions.undo} disabled={!canUndo || running} />
      <IconButton icon="redo" label="Redo" tone="plain" size="sm" showLabel={false} onPress={actions.redo} disabled={!canRedo || running} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 60, flexDirection: "row", alignItems: "center", columnGap: 12, paddingHorizontal: 14 },
  barCompact: { height: 56, columnGap: 8, paddingHorizontal: 10 },
  brand: { flexDirection: "row", alignItems: "center", columnGap: 10 },
  brandName: { fontSize: 18, letterSpacing: -0.3 },
  divider: { width: 1, height: 24, backgroundColor: colors.borderStrong },
  title: {
    width: 220,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    fontSize: 14,
  },
  titleCompact: { flex: 1, width: undefined, minWidth: 0, paddingHorizontal: 6 },
  titleMedium: { flex: 1, width: undefined, minWidth: 0, maxWidth: 260 },
  save: { flexDirection: "row", alignItems: "center", columnGap: 4 },
  saveText: { fontSize: 12, color: colors.text2 },
  spacer: { flex: 1 },
  spacerSmall: { flexGrow: 0.001 },
  toolbar: { flexDirection: "row", alignItems: "center", columnGap: 8 },
  history: { flexDirection: "row", columnGap: 2 },
});
