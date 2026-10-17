import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { useStore } from "../state/useStore";
import { actions } from "../state/store";
import { colors } from "../theme";
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

const SAVE_STATES = {
  saved: { icon: "check", text: "Saved", color: colors.runDark, className: "text-ink-2" },
  saving: { icon: "cloud", text: "Saving…", color: colors.text2, className: "text-ink-2" },
  error: { icon: "alert", text: "Not saved", color: colors.danger, className: "text-danger" },
};

function SaveStatus() {
  const status = useStore((s) => s.saveStatus);
  const m = SAVE_STATES[status] || SAVE_STATES.saved;
  return (
    <View className="flex-row items-center gap-x-1" accessibilityLabel={`Project ${m.text}`}>
      <Icon name={m.icon} size={14} color={m.color} />
      <Txt className={`text-xs ${m.className}`}>{m.text}</Txt>
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

  let titleSize = "w-[220px] px-2.5";
  if (compact) titleSize = "min-w-0 flex-1 px-1.5";
  else if (medium) titleSize = "min-w-0 max-w-[260px] flex-1 px-2.5";

  return (
    <View className={`flex-row items-center ${compact ? "h-14 gap-x-2 px-2.5" : "h-[60px] gap-x-3 px-3.5"}`}>
      <View className="flex-row items-center gap-x-2.5">
        <Logo size={compact ? 26 : 30} />
        {!compact && (
          <Txt w={700} className="text-lg tracking-[-0.3px] text-ink">
            Scratch Studio
          </Txt>
        )}
      </View>
      {!compact && <View className="h-6 w-px bg-line-strong" />}
      <Field
        className={`h-9 rounded-md border border-transparent text-base text-ink ${titleSize}`}
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
      {size === "wide" && <View className="flex-1" />}
      {medium && <View className="grow-[0.001]" />}
      <View className="flex-row items-center gap-x-2">
        {!compact && (
          <View className="flex-row gap-x-0.5">
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
    <View className="flex-row gap-x-0.5">
      <IconButton icon="undo" label="Undo" tone="plain" size="sm" showLabel={false} onPress={actions.undo} disabled={!canUndo || running} />
      <IconButton icon="redo" label="Redo" tone="plain" size="sm" showLabel={false} onPress={actions.redo} disabled={!canRedo || running} />
    </View>
  );
}
