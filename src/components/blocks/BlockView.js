import React, { Fragment, memo, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BLOCK_DEFS, createBlock, findBlock, toNumber } from "../../engine/blocks";
import { actions, getSprite } from "../../state/store";
import { useStore } from "../../state/useStore";
import { useDrag } from "../../dnd/dragStore";
import { registerBlock } from "../../dnd/registry";
import { categoryColors, colors } from "../../theme";
import { ARM_W, FOOT_H, NOTCH_D, cPath, stackPath } from "./shapes";
import { Field, Txt, numberKeyboard } from "../ui/Txt";
import Icon from "../Icon";

export const BLOCK_ICONS = {
  move: "move",
  turn: "rotate",
  goTo: "target",
  say: "message",
  think: "thought",
  repeat: "repeat",
  repeatForever: "infinity",
};

// for screen readers
const PARAM_LABELS = { steps: "steps", degrees: "degrees", x: "x coordinate", y: "y coordinate", message: "message", seconds: "seconds", times: "repeat count" };

// "move 10 steps", used for accessibility labels
export function describeBlock(block) {
  const def = BLOCK_DEFS[block.type];
  return def.label.map((part) => (typeof part === "string" ? part : String(block.params[part.param] ?? ""))).join(" ");
}

// rough width from the character count. measuring the text properly
// would mean an extra layout pass for every input
function inputWidth(str, isNumber) {
  const chars = Math.max(isNumber ? 2 : 3, Math.min(18, str.length));
  return Math.round(chars * 8.2 + 20);
}

function ParamInput({ spriteId, block, part, readOnly }) {
  const str = String(block.params[part.param] ?? "");
  const isNumber = part.kind === "number";
  const invalid = isNumber && str.trim() !== "" && !Number.isFinite(toNumber(str, NaN));
  const width = inputWidth(str, isNumber); // computed, so it stays inline
  const pill = `h-[26px] min-w-8 items-center justify-center bg-white ${isNumber ? "rounded-[13px]" : "rounded-sm"}`;
  const label = "text-center text-sm text-ink";

  if (readOnly) {
    return (
      <View className={`${pill} border border-black/[0.12] px-2`} style={{ width }}>
        <Txt w={600} className={label} numberOfLines={1}>
          {str}
        </Txt>
      </View>
    );
  }
  return (
    <Field
      w={600}
      className={`${pill} ${label} px-1.5 ${invalid ? "border-2 border-danger" : "border border-black/[0.12]"}`}
      style={{ width }}
      value={str}
      keyboardType={isNumber ? numberKeyboard : "default"}
      maxLength={isNumber ? 12 : 60}
      selectTextOnFocus
      returnKeyType="done"
      accessibilityLabel={PARAM_LABELS[part.param] || part.param}
      onChangeText={(t) => actions.updateParam(spriteId, block.id, part.param, t)}
      onEndEditing={(e) => {
        // left a number empty? put a 0 back
        if (isNumber && String(e.nativeEvent.text ?? str).trim() === "") actions.updateParam(spriteId, block.id, part.param, "0");
      }}
    />
  );
}

function ActionButton({ icon, label, onPress, danger, color }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-7 w-[30px] items-center justify-center rounded-sm bg-black/[0.16] ${danger ? "active:bg-danger" : "active:bg-black/30"}`}
    >
      <Icon name={icon} size={15} color={color} strokeWidth={2.4} />
    </Pressable>
  );
}

const prefersReducedMotion = { value: false };
export const setBlockReducedMotion = (v) => {
  prefersReducedMotion.value = Boolean(v);
};

// One component for every place a block shows up:
//   workspace - in the script, editable
//   palette   - the templates on the left
//   ghost     - the copy following your finger while dragging
//   marker    - grey preview of where it will drop
function BlockViewImpl({ block, spriteId, mode = "workspace" }) {
  const def = BLOCK_DEFS[block.type];
  const cat = categoryColors[def.category];
  const editable = mode === "workspace";
  const marker = mode === "marker";
  const active = useStore((s) => editable && s.activeBlocks[spriteId] === block.id);
  const selected = useStore((s) => editable && s.selectedBlockId === block.id);
  const placed = useStore((s) => (editable && s.lastPlaced && s.lastPlaced.id === block.id ? s.lastPlaced.n : 0));
  const isSource = useDrag((d) => editable && Boolean(d.payload) && d.payload.kind === "block" && d.payload.blockId === block.id);

  const rootRef = useRef(null);
  const rowRef = useRef(null);
  const mouthRef = useRef(null);
  const footRef = useRef(null);
  const [row, setRow] = useState(null);
  const [mouthH, setMouthH] = useState(24);
  const [bump] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!editable) return undefined;
    return registerBlock(block.id, {
      root: rootRef,
      row: rowRef,
      mouth: def.container ? mouthRef : null,
      foot: def.container ? footRef : null,
    });
  }, [editable, block.id, def.container]);

  // little bounce when it snaps in
  useEffect(() => {
    if (!placed || prefersReducedMotion.value) return;
    bump.setValue(1);
    Animated.spring(bump, { toValue: 0, useNativeDriver: Platform.OS !== "web", speed: 28, bounciness: 10 }).start();
  }, [placed, bump]);

  const onRowLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setRow((p) => (p && Math.abs(p.w - width) < 0.5 && Math.abs(p.h - height) < 0.5 ? p : { w: width, h: height }));
  };
  const onMouthLayout = (e) => {
    const h = e.nativeEvent.layout.height;
    setMouthH((p) => (Math.abs(p - h) < 0.5 ? p : h));
  };

  // The puzzle shape is drawn as an SVG behind the row, sized from onLayout. Until the
  // first layout comes in we just show a plain rounded rect so there's no flash.
  const fill = marker ? colors.markerFill : cat.fill;
  const stroke = marker ? colors.markerStroke : active || selected ? "#FFFFFF" : cat.dark;
  const textColor = cat.text;
  let shape = null;
  if (row) {
    const d = def.container ? cPath(row.w, row.h, mouthH) : stackPath(row.w, row.h);
    const height = (def.container ? row.h + mouthH + FOOT_H : row.h) + NOTCH_D + 4;
    const width = Math.max(row.w, def.container ? 160 : 60) + 4;
    shape = (
      <Svg className="absolute left-0 top-0" width={width} height={height} pointerEvents="none">
        {(active || selected) && (
          <Path d={d} fill="none" stroke={active ? colors.run : colors.focus} strokeWidth={6} strokeLinejoin="round" opacity={0.55} />
        )}
        <Path d={d} fill={fill} stroke={stroke} strokeWidth={active || selected ? 2 : 1} strokeLinejoin="round" />
      </Svg>
    );
  }

  const content = (
    <>
      <View className={`h-[22px] w-[22px] items-center justify-center rounded-sm ${def.category === "control" ? "bg-white/35" : "bg-white/20"}`}>
        <Icon name={BLOCK_ICONS[block.type]} size={14} color={textColor} strokeWidth={2.4} />
      </View>
      {def.label.map((part, i) =>
        typeof part === "string" ? (
          <Txt key={i} w={500} className="text-sm" style={{ color: textColor }}>
            {part}
          </Txt>
        ) : (
          <ParamInput key={i} spriteId={spriteId} block={block} part={part} readOnly={!editable} />
        )
      )}
      {selected && (
        <View className="ml-1 flex-row gap-x-1">
          <ActionButton icon="up" label="Move block up" color={textColor} onPress={() => actions.nudgeBlock(spriteId, block.id, -1)} />
          <ActionButton icon="down" label="Move block down" color={textColor} onPress={() => actions.nudgeBlock(spriteId, block.id, 1)} />
          <ActionButton icon="trash" label="Delete block" danger color={textColor} onPress={() => actions.deleteBlock(spriteId, block.id)} />
        </View>
      )}
    </>
  );

  const rowClass = [
    "min-h-11 max-w-[560px] flex-row flex-wrap items-center gap-x-1.5 gap-y-1 px-2.5 pb-[7px] pt-[9px]",
    def.container ? "min-w-40" : "",
    marker ? "opacity-0" : "",
    row ? "" : "rounded-sm",
  ].join(" ");
  // before the first layout there's no SVG yet, so paint the block colour directly
  const rowStyle = row ? undefined : { backgroundColor: fill };
  const rowView = editable ? (
    <Pressable
      ref={rowRef}
      collapsable={false}
      onLayout={onRowLayout}
      onPress={() => actions.selectBlock(selected ? null : block.id)}
      accessibilityRole="button"
      accessibilityLabel={`${describeBlock(block)}${active ? ", running" : ""}`}
      accessibilityHint="Tap for options, long-press to drag"
      className={rowClass}
      style={rowStyle}
    >
      {content}
    </Pressable>
  ) : (
    <View ref={rowRef} collapsable={false} onLayout={onRowLayout} className={rowClass} style={rowStyle}>
      {content}
    </View>
  );

  // Animated.View gets plain style objects only, NativeWind doesn't handle classes on it
  const bumpStyle = editable && {
    transform: [
      { translateY: bump.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
      { scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
    ],
  };

  return (
    <Animated.View
      ref={rootRef}
      collapsable={false}
      style={[{ alignSelf: "flex-start", alignItems: "flex-start", overflow: "visible" }, isSource && { opacity: 0.3 }, bumpStyle]}
    >
      {shape}
      {rowView}
      {def.container && (
        <>
          <View ref={mouthRef} collapsable={false} onLayout={onMouthLayout} className="min-h-6 self-stretch" style={{ paddingLeft: ARM_W }}>
            {editable ? (
              <DropList parentId={block.id} blocks={block.children} spriteId={spriteId} />
            ) : (
              <View className="items-start">
                {(block.children || []).map((c) => (
                  <BlockView key={c.id} block={c} spriteId={spriteId} mode={mode} />
                ))}
                {!(block.children || []).length && <View className="h-6 w-[140px]" />}
              </View>
            )}
          </View>
          <View
            ref={footRef}
            collapsable={false}
            className={`flex-row items-center justify-end pr-2.5 pt-0.5 ${marker ? "opacity-0" : ""}`}
            style={{ height: FOOT_H, width: row ? Math.max(row.w, 160) : 160 }}
          >
            <Icon name={block.type === "repeatForever" ? "infinity" : "repeat"} size={13} color={textColor} />
          </View>
        </>
      )}
    </Animated.View>
  );
}

export const BlockView = memo(BlockViewImpl);

const templateCache = {};
export const templateBlock = (type) => templateCache[type] || (templateCache[type] = { ...createBlock(type), id: `tpl-${type}` });

export function useDraggedBlock() {
  const payload = useDrag((d) => d.payload);
  const fromScript = useStore((s) => {
    if (!payload || payload.kind !== "block") return null;
    const sp = getSprite(payload.spriteId, s);
    return sp ? findBlock(sp.program, payload.blockId) : null;
  });
  if (!payload) return null;
  return payload.kind === "palette" ? templateBlock(payload.type) : fromScript;
}

// The grey placeholder. It's the actual dragged block drawn grey so the size
// matches exactly what will be dropped.
function InsertionMarker() {
  const block = useDraggedBlock();
  if (!block) return null;
  return (
    <View pointerEvents="none" className="opacity-80">
      <BlockView block={block} mode="marker" />
    </View>
  );
}

// a list of blocks you can drop into: the top level (parentId null) or inside a repeat
export const DropList = memo(function DropList({ parentId, blocks, spriteId }) {
  const key = parentId || "";
  const targetIndex = useDrag((d) => {
    const t = d.target;
    if (!t || t.type !== "list" || t.key !== key) return -1;
    return Math.min(t.index, blocks.length);
  });
  return (
    <View className="items-start">
      {blocks.map((b, i) => (
        <Fragment key={b.id}>
          {targetIndex === i && <InsertionMarker />}
          <BlockView block={b} spriteId={spriteId} mode="workspace" />
        </Fragment>
      ))}
      {targetIndex === blocks.length && <InsertionMarker />}
      {parentId && blocks.length === 0 && targetIndex < 0 && <View className="h-6 w-[140px]" />}
    </View>
  );
});
