import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useStore } from "../state/useStore";
import { actions, getSprite } from "../state/store";
import { COSTUMES, COSTUME_IDS } from "../state/costumes";
import { round } from "../engine/coords";
import { colors } from "../theme";
import Stage from "./stage/Stage";
import FullscreenStage from "./stage/FullscreenStage";
import SpriteArt from "./SpriteArt";
import { IconButton, SwapPill } from "./ui/Buttons";
import { Field, Txt, numberKeyboard } from "./ui/Txt";
import Icon from "./Icon";

const PANEL = "overflow-hidden rounded-lg border border-line bg-panel";
const PANEL_HEAD = "min-h-12 flex-row items-center gap-x-2 border-b border-line py-2 pl-3.5 pr-2.5";
const FIELD_LABEL = "text-2xs uppercase tracking-[0.4px] text-ink-2";
const FIELD_BOX = "h-[38px] flex-row items-center rounded-md border border-line-strong";
const FIELD_INPUT = "h-full flex-1 px-2.5 text-base text-ink tabular-nums";

// Typing goes into a local draft and is only applied when you're done, otherwise
// typing "-" on its way to "-50" would get thrown away as not a number.
function PoseField({ label, value, onCommit, disabled, unit }) {
  const [draft, setDraft] = useState(null);
  const shown = draft != null ? draft : String(round(value, 0));
  const commit = () => {
    if (draft == null) return;
    const n = parseFloat(draft);
    if (Number.isFinite(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <View className="min-w-0 flex-1 gap-y-1">
      <Txt w={600} className={FIELD_LABEL}>
        {label}
      </Txt>
      <View className={`${FIELD_BOX} ${disabled ? "bg-panel-soft" : "bg-panel"}`}>
        <Field
          className={FIELD_INPUT}
          value={shown}
          editable={!disabled}
          keyboardType={numberKeyboard}
          selectTextOnFocus
          returnKeyType="done"
          accessibilityLabel={label}
          onChangeText={setDraft}
          onEndEditing={commit}
          onSubmitEditing={commit}
        />
        {unit ? <Txt className="pr-2.5 text-xs text-ink-3">{unit}</Txt> : null}
      </View>
    </View>
  );
}

function SpriteInspector() {
  const sprite = useStore((s) => getSprite(s.selectedId, s));
  const running = useStore((s) => s.running);
  const [name, setName] = useState(null); // null when not editing
  const commitName = () => {
    if (name == null) return;
    const n = name.trim();
    if (n && n !== sprite.name) actions.renameSprite(sprite.id, n);
    setName(null);
  };
  return (
    <View className="gap-y-2 p-3 pb-1">
      <View className="min-w-0 gap-y-1">
        <Txt w={600} className={FIELD_LABEL}>
          Sprite
        </Txt>
        <View className={`${FIELD_BOX} bg-panel`}>
          <Field
            className={FIELD_INPUT}
            value={name ?? sprite.name}
            maxLength={24}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Sprite name"
            onChangeText={setName}
            onEndEditing={commitName}
            onSubmitEditing={commitName}
          />
        </View>
      </View>
      <View className="flex-row gap-x-2">
        <PoseField label="x" value={sprite.x} disabled={running} onCommit={(x) => actions.placeSprite(sprite.id, { x })} />
        <PoseField label="y" value={sprite.y} disabled={running} onCommit={(y) => actions.placeSprite(sprite.id, { y })} />
        <PoseField label="direction" unit="°" value={sprite.direction} disabled={running} onCommit={(direction) => actions.placeSprite(sprite.id, { direction })} />
      </View>
    </View>
  );
}

function SpriteList() {
  // Pack what we need into one string so the selector returns something comparable.
  // Selecting s.sprites directly would re-render this on every frame while running,
  // since x/y change all the time.
  const key = useStore((s) => s.sprites.map((sp) => `${sp.id}\u0000${sp.name}\u0000${sp.costume}`).join("\u0001"));
  const selectedId = useStore((s) => s.selectedId);
  const running = useStore((s) => s.running);
  const activeIds = useStore((s) => Object.keys(s.activeBlocks).sort().join(","));
  const list = key.split("\u0001").map((row) => {
    const [id, name, costume] = row.split("\u0000");
    return { id, name, costume };
  });
  const only = list.length <= 1;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-x-2.5 p-3" accessibilityLabel="Sprites">
      {list.map((sp) => {
        const sel = sp.id === selectedId;
        return (
          <View key={sp.id} className="pr-1.5 pt-1.5">
            <Pressable
              onPress={() => actions.selectSprite(sp.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${sp.name}${sel ? ", selected" : ""}`}
              className={`w-[88px] items-center gap-y-1 rounded-lg px-1.5 pb-2 pt-2.5 ${
                sel ? "border-2 border-motion bg-[#F2F7FF]" : "border border-line bg-panel active:bg-panel-soft"
              }`}
            >
              <SpriteArt costume={sp.costume} size={44} />
              <Txt w={600} numberOfLines={1} className="max-w-full text-xs text-ink">
                {sp.name}
              </Txt>
              {activeIds.split(",").includes(sp.id) && <View className="absolute left-2 top-2 h-2 w-2 rounded-full bg-run" />}
            </Pressable>
            {sel && !only && !running && (
              <Pressable
                onPress={() => actions.removeSprite(sp.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${sp.name}`}
                hitSlop={8}
                className="absolute right-0 top-0 h-6 w-6 items-center justify-center rounded-full border-2 border-panel bg-ink-2 active:bg-danger"
              >
                <Icon name="x" size={12} color="#FFFFFF" strokeWidth={2.8} />
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function AddSpriteRow({ onDone }) {
  return (
    <View className="flex-row gap-x-2 border-b border-line bg-panel-soft p-2.5" accessibilityLabel="Choose a sprite to add">
      {COSTUME_IDS.map((id) => (
        <Pressable
          key={id}
          onPress={() => {
            actions.addSprite(id);
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${COSTUMES[id].label}`}
          className="h-11 flex-1 flex-row items-center justify-center gap-x-1.5 rounded-md border border-line bg-panel active:bg-panel-soft"
        >
          <SpriteArt costume={id} size={30} />
          <Txt w={500} className="text-sm text-ink">
            {COSTUMES[id].label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

export default function PreviewArea({ compact }) {
  const running = useStore((s) => s.running);
  const spriteCount = useStore((s) => s.sprites.length);
  const [fullscreen, setFullscreen] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-y-3 pb-3"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className={PANEL}>
        <View className={PANEL_HEAD}>
          <Txt w={600} className="text-base text-ink">
            Stage
          </Txt>
          <SwapPill />
          <View className="flex-1" />
          {!compact && <Txt className="text-xs text-ink-2">480 × 360 · +y is up</Txt>}
          <IconButton icon="maximize" label="Full screen stage" tone="plain" size="sm" showLabel={false} onPress={() => setFullscreen(true)} />
        </View>
        <View className="p-2.5">
          {fullscreen ? (
            <View className="aspect-[4/3] items-center justify-center gap-y-2 rounded-md border-2 border-dashed border-line-strong">
              <Icon name="maximize" size={18} color={colors.text2} />
              <Txt className="text-sm text-ink-2">The stage is open in full screen</Txt>
            </View>
          ) : (
            <Stage />
          )}
        </View>
      </View>

      <View className={PANEL}>
        <View className={PANEL_HEAD}>
          <Txt w={600} className="text-base text-ink">
            Sprites <Txt className="text-base text-ink-3">({spriteCount})</Txt>
          </Txt>
          <View className="flex-1" />
          <IconButton
            icon="zap"
            label="Collision demo"
            accessibilityLabel="Load collision demo"
            tone="ghost"
            size="sm"
            showLabel={!compact}
            disabled={running}
            onPress={actions.loadCollisionDemo}
          />
          <IconButton icon={adding ? "x" : "plus"} label={adding ? "Cancel" : "Add sprite"} tone="primary" size="sm" onPress={() => setAdding((a) => !a)} />
        </View>
        {adding && <AddSpriteRow onDone={() => setAdding(false)} />}
        <SpriteInspector />
        <SpriteList />
      </View>
      <FullscreenStage visible={fullscreen} onExit={() => setFullscreen(false)} />
    </ScrollView>
  );
}
