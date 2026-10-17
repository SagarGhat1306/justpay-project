import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import { CATEGORIES, PALETTE } from "../engine/blocks";
import { actions, getState } from "../state/store";
import { endDrag, getDrag, moveDrag, startDrag, useDrag } from "../dnd/dragStore";
import { registry } from "../dnd/registry";
import { categoryColors, colors, radius } from "../theme";
import { haptics } from "../haptics";
import { BlockView, describeBlock, templateBlock } from "./blocks/BlockView";
import { Txt } from "./ui/Txt";
import Icon from "./Icon";

// The palette scrolls, so dragging in the scroll direction has to keep scrolling.
// On phones the strip scrolls sideways and you pull a block down to grab it.
// On tablets the column scrolls up/down and you pull a block sideways.
// Tapping just adds it to the end of the script.
function PaletteItem({ type, orientation }) {
  const block = templateBlock(type);
  const size = useRef({ w: 0, h: 0 });
  const mine = useRef(null);

  // the compiler lint thinks these callbacks read refs during render, they don't
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const pan = Gesture.Pan().runOnJS(true);
    if (orientation === "row") pan.activeOffsetY([-8, 8]).failOffsetX([-14, 14]);
    else pan.activeOffsetX([-8, 8]).failOffsetY([-14, 14]);
    pan
      .onStart((e) => {
        const payload = { kind: "palette", type };
        mine.current = payload;
        haptics.pickUp();
        startDrag(payload, e.absoluteX, e.absoluteY, { x: e.absoluteX - e.x, y: e.absoluteY - e.y, w: size.current.w, h: size.current.h });
      })
      .onUpdate((e) => moveDrag(e.absoluteX, e.absoluteY))
      .onEnd((e, success) => {
        if (getDrag().payload === mine.current) {
          const commit = success && Boolean(getDrag().target);
          if (commit) haptics.snap();
          endDrag(success);
        }
        mine.current = null;
      })
      .onFinalize(() => {
        if (mine.current && getDrag().payload === mine.current) endDrag(false);
        mine.current = null;
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e, success) => {
        if (!success) return;
        actions.addBlock(getState().selectedId, type);
        haptics.snap();
      });

    return Gesture.Race(pan, tap);
  }, [orientation, type]);
  /* eslint-enable react-hooks/refs */

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        style={styles.item}
        onLayout={(e) => {
          size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Add ${describeBlock(block)}`}
        accessibilityHint={orientation === "row" ? "Tap to add, or drag down into the script" : "Tap to add, or drag into the script"}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={() => actions.addBlock(getState().selectedId, type)}
      >
        <BlockView block={block} mode="palette" />
      </View>
    </GestureDetector>
  );
}

function CategoryButton({ cat, active, onPress, compact }) {
  const c = categoryColors[cat.id];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        compact ? styles.catCompact : styles.cat,
        active && styles.catActive,
        pressed && !active && styles.catPressed,
      ]}
    >
      <View style={[styles.catDot, { backgroundColor: c.fill }, active && { borderColor: c.fill + "55", borderWidth: 3 }]}>
        <Icon name={cat.icon} size={13} color="#FFFFFF" strokeWidth={2.4} />
      </View>
      <Txt w={600} style={[styles.catLabel, compact && styles.catLabelCompact, active && { color: colors.text }]}>
        {cat.label}
      </Txt>
    </Pressable>
  );
}

export default function Palette({ orientation = "column" }) {
  const [category, setCategory] = useState("motion");
  const rootRef = useRef(null);
  const draggingBlock = useDrag((d) => Boolean(d.payload) && d.payload.kind === "block");
  const overDelete = useDrag((d) => Boolean(d.target) && d.target.type === "delete");
  const row = orientation === "row";

  useEffect(() => {
    registry.palette = rootRef;
    return () => {
      if (registry.palette === rootRef) registry.palette = null;
    };
  }, []);

  const current = CATEGORIES.find((c) => c.id === category);

  return (
    <View ref={rootRef} collapsable={false} style={[styles.panel, row ? styles.panelRow : styles.panelColumn]}>
      <View style={row ? styles.catsRow : styles.catsColumn} accessibilityRole="tablist">
        {CATEGORIES.map((c) => (
          <CategoryButton key={c.id} cat={c} compact={row} active={c.id === category} onPress={() => setCategory(c.id)} />
        ))}
      </View>

      <ScrollView
        horizontal={row}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={row ? styles.stripScroll : styles.listScroll}
        contentContainerStyle={row ? styles.strip : styles.list}
      >
        {!row && (
          <View style={styles.titleRow}>
            <View style={[styles.swatch, { backgroundColor: categoryColors[category].fill }]} />
            <Txt w={600} style={styles.title}>
              {current.label}
            </Txt>
          </View>
        )}
        {PALETTE[category].map((type) => (
          <PaletteItem key={type} type={type} orientation={orientation} />
        ))}
        {!row && (
          <Txt style={styles.hint}>
            {category === "control" ? "Drop blocks inside a Repeat to loop them." : "Drag a block into the script, or tap to add it."}
          </Txt>
        )}
      </ScrollView>

      {draggingBlock && (
        <View pointerEvents="none" style={[styles.deleteOverlay, overDelete && styles.deleteOverlayHot]}>
          <Icon name="trash" size={22} color={colors.danger} />
          <Txt w={600} style={styles.deleteText}>
            Drop here to delete
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  panelColumn: { flexDirection: "row" },
  panelRow: { flexDirection: "column" },
  catsColumn: {
    width: 68,
    paddingVertical: 8,
    paddingHorizontal: 6,
    rowGap: 4,
    backgroundColor: colors.panelSoft,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  catsRow: {
    flexDirection: "row",
    padding: 6,
    columnGap: 4,
    backgroundColor: colors.panelSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cat: { alignItems: "center", rowGap: 4, paddingVertical: 8, borderRadius: radius.md },
  catCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    height: 36,
    borderRadius: radius.md,
  },
  catActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  catPressed: { backgroundColor: "#EEF1F6" },
  catDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 11, color: colors.text2 },
  catLabelCompact: { fontSize: 12 },
  listScroll: { flex: 1 },
  list: { padding: 14, rowGap: 6, alignItems: "flex-start" },
  stripScroll: { flexGrow: 0 },
  strip: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, columnGap: 8, alignItems: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "center", columnGap: 8, marginBottom: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  title: { fontSize: 15 },
  item: { paddingBottom: 6 },
  hint: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: "dashed",
    fontSize: 12,
    color: colors.text2,
    alignSelf: "stretch",
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 6,
    backgroundColor: "rgba(253,236,236,0.9)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#F5A3A6",
    borderRadius: radius.lg,
  },
  deleteOverlayHot: { backgroundColor: "rgba(253,220,221,0.97)", borderColor: colors.danger },
  deleteText: { color: colors.danger, fontSize: 13 },
});
