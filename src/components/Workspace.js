import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { useStore } from "../state/useStore";
import { actions, getSprite, getState } from "../state/store";
import { countBlocks } from "../engine/blocks";
import { endDrag, getDrag, moveDrag, startDragWithGeometry, useDrag } from "../dnd/dragStore";
import { measureGeometry, registry } from "../dnd/registry";
import { blockAt } from "../dnd/hitTest";
import { colors } from "../theme";
import { haptics } from "../haptics";
import { DropList } from "./blocks/BlockView";
import { NOTCH_D, hatPath } from "./blocks/shapes";
import SpriteArt from "./SpriteArt";
import { Txt } from "./ui/Txt";
import Icon from "./Icon";

const EMPTY = [];

function HatBlock() {
  const [size, setSize] = useState(null);
  return (
    <View
      className="h-[58px] min-w-[132px] flex-row items-center gap-x-1.5 px-3.5 pb-1 pt-4"
      accessibilityLabel="When Play is clicked"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((p) => (p && p.w === width && p.h === height ? p : { w: width, h: height }));
      }}
    >
      {size && (
        <Svg className="absolute left-0 top-0" width={size.w + 4} height={size.h + NOTCH_D + 4} pointerEvents="none">
          <Path d={hatPath(size.w, size.h)} fill={colors.run} stroke={colors.runDark} strokeWidth={1} />
        </Svg>
      )}
      <Txt w={600} className="text-sm text-white">
        when
      </Txt>
      <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-white/25">
        <Icon name="play" size={11} color="#FFFFFF" />
      </View>
      <Txt w={600} className="text-sm text-white">
        clicked
      </Txt>
    </View>
  );
}

function DotGrid() {
  return (
    <Svg className="absolute inset-0" width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <Circle cx="10" cy="10" r="1" fill={colors.dot} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

const PILL = "h-[22px] flex-row items-center gap-x-1 rounded-full border px-2";

export default function Workspace({ compact }) {
  const spriteId = useStore((s) => s.selectedId);
  const name = useStore((s) => (getSprite(s.selectedId, s) || {}).name);
  const costume = useStore((s) => (getSprite(s.selectedId, s) || {}).costume);
  const program = useStore((s) => (getSprite(s.selectedId, s) || {}).program || EMPTY);
  const running = useStore((s) => s.running);
  const error = useStore((s) => s.errors[s.selectedId]);
  const dragging = useDrag((d) => Boolean(d.payload));
  const count = countBlocks(program);

  const viewportRef = useRef(null);
  const scrollRef = useRef(null);
  const active = useRef(false);
  const finger = useRef({ x: 0, y: 0 });
  const mine = useRef(null);

  useEffect(() => {
    registry.workspace = viewportRef;
    registry.scrollTo = (y) => scrollRef.current && scrollRef.current.scrollTo({ y, animated: false });
    return () => {
      if (registry.workspace === viewportRef) {
        registry.workspace = null;
        registry.scrollTo = null;
      }
    };
  }, []);

  // new sprite, new script, start at the top
  useEffect(() => {
    registry.scrollY = 0;
    if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false });
  }, [spriteId]);

  const beginBlockDrag = useCallback((x, y) => {
    measureGeometry().then((geo) => {
      if (!active.current) return; // finger was lifted before measuring finished
      const s = getState();
      const sp = getSprite(s.selectedId, s);
      if (!sp) return;
      const hit = blockAt(x, y, geo, sp.program);
      if (!hit) return;
      const payload = { kind: "block", blockId: hit.id, spriteId: sp.id };
      mine.current = payload;
      actions.selectBlock(null);
      haptics.pickUp();
      startDragWithGeometry(payload, finger.current.x, finger.current.y, geo.blocks[hit.id].root, geo);
    });
  }, []);

  // One pan for the whole script instead of one per block. It needs a long press first,
  // so a normal swipe still scrolls. Once it fires we work out which block is under the finger.
  // (the compiler lint thinks these callbacks read refs during render, they don't)
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activateAfterLongPress(260)
        .onStart((e) => {
          active.current = true;
          finger.current = { x: e.absoluteX, y: e.absoluteY };
          beginBlockDrag(e.absoluteX, e.absoluteY);
        })
        .onUpdate((e) => {
          finger.current = { x: e.absoluteX, y: e.absoluteY };
          moveDrag(e.absoluteX, e.absoluteY);
        })
        .onEnd((e, success) => {
          active.current = false;
          if (mine.current && getDrag().payload === mine.current) {
            const target = getDrag().target;
            if (success && target) (target.type === "delete" ? haptics.remove : haptics.snap)();
            endDrag(success);
          }
          mine.current = null;
        })
        .onFinalize(() => {
          active.current = false;
          if (mine.current && getDrag().payload === mine.current) endDrag(false);
          mine.current = null;
        }),
    [beginBlockDrag]
  );
  /* eslint-enable react-hooks/refs */

  return (
    <View className="flex-1 overflow-hidden rounded-lg border border-line bg-panel">
      <View className={`flex-row items-center gap-x-2 border-b border-line py-2 pr-2.5 ${compact ? "min-h-11 pl-2.5" : "min-h-12 pl-3.5"}`}>
        <View className="h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-soft">
          <SpriteArt costume={costume} size={22} />
        </View>
        <Txt w={600} className="shrink text-base text-ink" numberOfLines={1}>
          {name}
          <Txt w={500} className="text-base text-ink-3">
            {" "}
            · script
          </Txt>
        </Txt>
        <View className={`${PILL} border-line bg-panel-soft`}>
          <Txt w={500} className="text-xs text-ink-2">
            {count} {count === 1 ? "block" : "blocks"}
          </Txt>
        </View>
        {running && (
          <View className={`${PILL} border-run-border bg-run-soft`}>
            <View className="h-[7px] w-[7px] rounded-full bg-run" />
            <Txt w={500} className="text-xs text-run-dark">
              Running
            </Txt>
          </View>
        )}
        <View className="flex-1" />
        <Pressable
          onPress={() => actions.clearProgram(spriteId)}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear script"
          className={`h-8 min-w-9 flex-row items-center justify-center gap-x-1.5 rounded-md border border-line px-2.5 active:bg-panel-soft ${
            count === 0 ? "opacity-[0.45]" : ""
          }`}
        >
          <Icon name="trash" size={15} color={colors.text2} />
          {!compact && (
            <Txt w={600} className="text-sm text-ink-2">
              Clear
            </Txt>
          )}
        </Pressable>
      </View>

      <View
        ref={viewportRef}
        collapsable={false}
        className="flex-1 bg-canvas"
        onLayout={(e) => {
          registry.viewportHeight = e.nativeEvent.layout.height;
        }}
      >
        <DotGrid />
        <ScrollView
          ref={scrollRef}
          scrollEnabled={!dragging}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          scrollEventThrottle={16}
          onScroll={(e) => {
            registry.scrollY = e.nativeEvent.contentOffset.y;
          }}
          onContentSizeChange={(w, h) => {
            registry.contentHeight = h;
          }}
          contentContainerClassName="grow"
        >
          <GestureDetector gesture={pan}>
            <Pressable
              onPress={() => actions.selectBlock(null)}
              className={`grow items-start pb-40 ${compact ? "px-3 pt-3.5" : "px-[22px] pt-5"}`}
              accessible={false}
            >
              <HatBlock />
              <DropList parentId={null} blocks={program} spriteId={spriteId} />
              {program.length === 0 && (
                <View className="mt-[18px] max-w-[300px] items-center rounded-lg border-2 border-dashed border-line-strong bg-white/90 p-[18px]">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-[#EEF4FF]">
                    <Icon name="sparkles" size={22} color={colors.motion} />
                  </View>
                  <Txt w={600} className="mb-1 mt-2 text-base text-ink">
                    {name}’s script is empty
                  </Txt>
                  <Txt className="text-center text-sm leading-[19px] text-ink-2">
                    {compact
                      ? "Drag a block down from the palette and snap it under “when ▶ clicked”, or tap a block to add it."
                      : "Drag blocks from the palette and snap them under “when ▶ clicked”, or tap a block to add it."}
                  </Txt>
                </View>
              )}
              {program.length > 0 && <Txt className="mt-[22px] text-xs text-ink-3">Tap a block for options · long-press to drag it</Txt>}
            </Pressable>
          </GestureDetector>
        </ScrollView>
      </View>

      {error ? (
        <View className="m-2.5 flex-row items-center gap-x-2 rounded-md border border-[#F5C2C4] bg-danger-soft p-2.5" accessibilityRole="alert">
          <Icon name="alert" size={16} color="#A3262B" />
          <Txt className="shrink text-sm text-[#A3262B]">Script stopped: {error}</Txt>
        </View>
      ) : null}
    </View>
  );
}
