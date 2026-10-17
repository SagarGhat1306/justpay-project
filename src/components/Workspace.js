import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg";
import { useStore } from "../state/useStore";
import { actions, getSprite, getState } from "../state/store";
import { countBlocks } from "../engine/blocks";
import { endDrag, getDrag, moveDrag, startDragWithGeometry, useDrag } from "../dnd/dragStore";
import { measureGeometry, registry } from "../dnd/registry";
import { blockAt } from "../dnd/hitTest";
import { colors, radius } from "../theme";
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
      style={styles.hat}
      accessibilityLabel="When Play is clicked"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((p) => (p && p.w === width && p.h === height ? p : { w: width, h: height }));
      }}
    >
      {size && (
        <Svg style={styles.shape} width={size.w + 4} height={size.h + NOTCH_D + 4} pointerEvents="none">
          <Path d={hatPath(size.w, size.h)} fill={colors.run} stroke={colors.runDark} strokeWidth={1} />
        </Svg>
      )}
      <Txt w={600} style={styles.hatText}>
        when
      </Txt>
      <View style={styles.hatFlag}>
        <Icon name="play" size={11} color="#FFFFFF" />
      </View>
      <Txt w={600} style={styles.hatText}>
        clicked
      </Txt>
    </View>
  );
}

function DotGrid() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <Circle cx="10" cy="10" r="1" fill={colors.dot} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

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
    <View style={styles.panel}>
      <View style={[styles.head, compact && styles.headCompact]}>
        <View style={styles.avatar}>
          <SpriteArt costume={costume} size={22} />
        </View>
        <Txt w={600} style={styles.title} numberOfLines={1}>
          {name}
          <Txt w={500} style={styles.muted}>
            {" "}
            · script
          </Txt>
        </Txt>
        <View style={styles.pill}>
          <Txt w={500} style={styles.pillText}>
            {count} {count === 1 ? "block" : "blocks"}
          </Txt>
        </View>
        {running && (
          <View style={[styles.pill, styles.pillRun]}>
            <View style={styles.runDot} />
            <Txt w={500} style={[styles.pillText, { color: colors.runDark }]}>
              Running
            </Txt>
          </View>
        )}
        <View style={styles.spacer} />
        <Pressable
          onPress={() => actions.clearProgram(spriteId)}
          disabled={count === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear script"
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed, count === 0 && styles.disabled]}
        >
          <Icon name="trash" size={15} color={colors.text2} />
          {!compact && (
            <Txt w={600} style={styles.ghostBtnText}>
              Clear
            </Txt>
          )}
        </Pressable>
      </View>

      <View
        ref={viewportRef}
        collapsable={false}
        style={styles.viewport}
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
          contentContainerStyle={styles.scrollContent}
        >
          <GestureDetector gesture={pan}>
            <Pressable onPress={() => actions.selectBlock(null)} style={[styles.script, compact && styles.scriptCompact]} accessible={false}>
              <HatBlock />
              <DropList parentId={null} blocks={program} spriteId={spriteId} />
              {program.length === 0 && (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Icon name="sparkles" size={22} color={colors.motion} />
                  </View>
                  <Txt w={600} style={styles.emptyTitle}>
                    {name}’s script is empty
                  </Txt>
                  <Txt style={styles.emptyText}>
                    {compact
                      ? "Drag a block down from the palette and snap it under “when ▶ clicked”, or tap a block to add it."
                      : "Drag blocks from the palette and snap them under “when ▶ clicked”, or tap a block to add it."}
                  </Txt>
                </View>
              )}
              {program.length > 0 && (
                <Txt style={styles.tip}>Tap a block for options · long-press to drag it</Txt>
              )}
            </Pressable>
          </GestureDetector>
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Icon name="alert" size={16} color="#A3262B" />
          <Txt style={styles.bannerText}>Script stopped: {error}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
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
  headCompact: { minHeight: 44, paddingLeft: 10 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 14, flexShrink: 1 },
  muted: { color: colors.text3, fontSize: 14 },
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
  pillRun: { backgroundColor: colors.runSoft, borderColor: colors.runBorder },
  pillText: { fontSize: 12, color: colors.text2 },
  runDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.run },
  spacer: { flex: 1 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    height: 32,
    minWidth: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostBtnPressed: { backgroundColor: colors.panelSoft },
  ghostBtnText: { fontSize: 13, color: colors.text2 },
  disabled: { opacity: 0.45 },
  viewport: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { flexGrow: 1 },
  script: { flexGrow: 1, alignItems: "flex-start", paddingTop: 20, paddingHorizontal: 22, paddingBottom: 160 },
  scriptCompact: { paddingHorizontal: 12, paddingTop: 14 },
  hat: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    minWidth: 132,
    height: 58,
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 14,
  },
  shape: { position: "absolute", left: 0, top: 0 },
  hatText: { color: "#FFFFFF", fontSize: 13 },
  hatFlag: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  empty: {
    maxWidth: 300,
    marginTop: 18,
    padding: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
  },
  emptyTitle: { marginTop: 8, marginBottom: 4, fontSize: 14 },
  emptyText: { fontSize: 13, color: colors.text2, textAlign: "center", lineHeight: 19 },
  tip: { marginTop: 22, fontSize: 12, color: colors.text3 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
    margin: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#F5C2C4",
  },
  bannerText: { fontSize: 13, color: "#A3262B", flexShrink: 1 },
});
