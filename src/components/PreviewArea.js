import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useStore } from "../state/useStore";
import { actions, getSprite } from "../state/store";
import { COSTUMES, COSTUME_IDS } from "../state/costumes";
import { round } from "../engine/coords";
import { colors, radius } from "../theme";
import Stage from "./stage/Stage";
import FullscreenStage from "./stage/FullscreenStage";
import SpriteArt from "./SpriteArt";
import { IconButton, SwapPill } from "./ui/Buttons";
import { Field, Txt, numberKeyboard } from "./ui/Txt";
import Icon from "./Icon";

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
    <View style={[styles.field, styles.fieldGrow]}>
      <Txt w={600} style={styles.fieldLabel}>
        {label}
      </Txt>
      <View style={[styles.fieldBox, disabled && styles.fieldBoxDisabled]}>
        <Field
          style={styles.fieldInput}
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
        {unit ? <Txt style={styles.unit}>{unit}</Txt> : null}
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
    <View style={styles.inspector}>
      <View style={styles.field}>
        <Txt w={600} style={styles.fieldLabel}>
          Sprite
        </Txt>
        <View style={styles.fieldBox}>
          <Field
            style={styles.fieldInput}
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
      <View style={styles.poseRow}>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} accessibilityLabel="Sprites">
      {list.map((sp) => {
        const sel = sp.id === selectedId;
        return (
          <View key={sp.id} style={styles.cardWrap}>
            <Pressable
              onPress={() => actions.selectSprite(sp.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${sp.name}${sel ? ", selected" : ""}`}
              style={({ pressed }) => [styles.card, sel && styles.cardSelected, pressed && !sel && styles.cardPressed]}
            >
              <SpriteArt costume={sp.costume} size={44} />
              <Txt w={600} numberOfLines={1} style={styles.cardName}>
                {sp.name}
              </Txt>
              {activeIds.split(",").includes(sp.id) && <View style={styles.cardRun} />}
            </Pressable>
            {sel && !only && !running && (
              <Pressable
                onPress={() => actions.removeSprite(sp.id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${sp.name}`}
                hitSlop={8}
                style={({ pressed }) => [styles.cardDelete, pressed && { backgroundColor: colors.danger }]}
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
    <View style={styles.addRow} accessibilityLabel="Choose a sprite to add">
      {COSTUME_IDS.map((id) => (
        <Pressable
          key={id}
          onPress={() => {
            actions.addSprite(id);
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${COSTUMES[id].label}`}
          style={({ pressed }) => [styles.addOption, pressed && styles.cardPressed]}
        >
          <SpriteArt costume={id} size={30} />
          <Txt w={500} style={styles.addLabel}>
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
      style={styles.scroll}
      contentContainerStyle={styles.column}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.panel}>
        <View style={styles.head}>
          <Txt w={600} style={styles.title}>
            Stage
          </Txt>
          <SwapPill />
          <View style={styles.spacer} />
          {!compact && <Txt style={styles.hint}>480 × 360 · +y is up</Txt>}
          <IconButton icon="maximize" label="Full screen stage" tone="plain" size="sm" showLabel={false} onPress={() => setFullscreen(true)} />
        </View>
        <View style={styles.stageWrap}>
          {fullscreen ? (
            <View style={styles.placeholder}>
              <Icon name="maximize" size={18} color={colors.text2} />
              <Txt style={styles.placeholderText}>The stage is open in full screen</Txt>
            </View>
          ) : (
            <Stage />
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.head}>
          <Txt w={600} style={styles.title}>
            Sprites <Txt style={styles.muted}>({spriteCount})</Txt>
          </Txt>
          <View style={styles.spacer} />
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  column: { rowGap: 12, paddingBottom: 12 },
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    minHeight: 48,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 14 },
  muted: { color: colors.text3, fontSize: 14 },
  hint: { fontSize: 12, color: colors.text2 },
  spacer: { flex: 1 },
  stageWrap: { padding: 10 },
  placeholder: {
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
  },
  placeholderText: { fontSize: 13, color: colors.text2 },
  inspector: { padding: 12, paddingBottom: 4, rowGap: 8 },
  poseRow: { flexDirection: "row", columnGap: 8 },
  field: { rowGap: 4, minWidth: 0 },
  fieldGrow: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.text2, textTransform: "uppercase", letterSpacing: 0.4 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  fieldBoxDisabled: { backgroundColor: colors.panelSoft },
  fieldInput: { flex: 1, height: "100%", paddingHorizontal: 10, fontSize: 14, fontVariant: ["tabular-nums"] },
  unit: { paddingRight: 10, color: colors.text3, fontSize: 12 },
  cards: { padding: 12, columnGap: 10 },
  cardWrap: { paddingTop: 6, paddingRight: 6 },
  card: {
    width: 88,
    alignItems: "center",
    rowGap: 4,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  cardSelected: { borderColor: colors.motion, borderWidth: 2, backgroundColor: "#F2F7FF" },
  cardPressed: { backgroundColor: colors.panelSoft },
  cardName: { fontSize: 12, maxWidth: "100%" },
  cardRun: { position: "absolute", top: 8, left: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.run },
  cardDelete: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text2,
    borderWidth: 2,
    borderColor: colors.panel,
  },
  addRow: {
    flexDirection: "row",
    columnGap: 8,
    padding: 10,
    backgroundColor: colors.panelSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  addLabel: { fontSize: 13 },
});
