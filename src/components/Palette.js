import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import { CATEGORIES, PALETTE } from "../engine/blocks";
import { actions, getState } from "../state/store";
import { endDrag, getDrag, moveDrag, startDrag, useDrag } from "../dnd/dragStore";
import { registry } from "../dnd/registry";
import { categoryColors, colors } from "../theme";
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
        className="pb-1.5"
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
  const shape = compact ? "h-9 flex-1 flex-row justify-center gap-x-1.5" : "gap-y-1 py-2";
  const state = active ? "border border-line bg-panel" : "active:bg-[#EEF1F6]";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={`items-center rounded-md ${shape} ${state}`}
    >
      {/* category colour comes from JS, so it stays inline */}
      <View
        className={`h-[26px] w-[26px] items-center justify-center rounded-full ${active ? "border-[3px]" : ""}`}
        style={[{ backgroundColor: c.fill }, active && { borderColor: c.fill + "55" }]}
      >
        <Icon name={cat.icon} size={13} color="#FFFFFF" strokeWidth={2.4} />
      </View>
      <Txt w={600} className={`${compact ? "text-xs" : "text-2xs"} ${active ? "text-ink" : "text-ink-2"}`}>
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
    <View
      ref={rootRef}
      collapsable={false}
      className={`overflow-hidden rounded-lg border border-line bg-panel ${row ? "flex-col" : "flex-row"}`}
    >
      <View
        className={row ? "flex-row gap-x-1 border-b border-line bg-panel-soft p-1.5" : "w-[68px] gap-y-1 border-r border-line bg-panel-soft px-1.5 py-2"}
        accessibilityRole="tablist"
      >
        {CATEGORIES.map((c) => (
          <CategoryButton key={c.id} cat={c} compact={row} active={c.id === category} onPress={() => setCategory(c.id)} />
        ))}
      </View>

      <ScrollView
        horizontal={row}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        className={row ? "grow-0" : "flex-1"}
        contentContainerClassName={row ? "items-start gap-x-2 px-2.5 pb-3 pt-2.5" : "items-start gap-y-1.5 p-3.5"}
      >
        {!row && (
          <View className="mb-1.5 flex-row items-center gap-x-2">
            <View className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: categoryColors[category].fill }} />
            <Txt w={600} className="text-md text-ink">
              {current.label}
            </Txt>
          </View>
        )}
        {PALETTE[category].map((type) => (
          <PaletteItem key={type} type={type} orientation={orientation} />
        ))}
        {!row && (
          <Txt className="mt-2.5 self-stretch border-t border-dashed border-line pt-2.5 text-xs text-ink-2">
            {category === "control" ? "Drop blocks inside a Repeat to loop them." : "Drag a block into the script, or tap to add it."}
          </Txt>
        )}
      </ScrollView>

      {draggingBlock && (
        <View
          pointerEvents="none"
          className={`absolute inset-0 items-center justify-center gap-y-1.5 rounded-lg border-2 border-dashed ${
            overDelete ? "border-danger bg-[rgba(253,220,221,0.97)]" : "border-[#F5A3A6] bg-[rgba(253,236,236,0.9)]"
          }`}
        >
          <Icon name="trash" size={22} color={colors.danger} />
          <Txt w={600} className="text-sm text-danger">
            Drop here to delete
          </Txt>
        </View>
      )}
    </View>
  );
}
