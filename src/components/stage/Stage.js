import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useStore } from "../../state/useStore";
import { actions, getSprite, getState } from "../../state/store";
import { HALF_H, HALF_W, STAGE_HEIGHT, STAGE_WIDTH, round, toScreen } from "../../engine/coords";
import { prefersReducedMotion } from "../../engine/runtime";
import { colors, radius, shadow } from "../../theme";
import { haptics } from "../../haptics";
import SpriteArt from "../SpriteArt";
import { Txt } from "../ui/Txt";
import Icon from "../Icon";

const nativeDriver = Platform.OS !== "web";

// A hit we're seeing for the first time should animate. One that's old (say the stage
// tab was opened after the collision happened) shouldn't replay.
const isFresh = (hit) => Boolean(hit) && Date.now() - hit.at < 400;

function SpriteNode({ sprite, scale, selected, running }) {
  const { left, top } = toScreen(sprite.x, sprite.y, scale);
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const start = useRef({ x: 0, y: 0 });

  // On a hit the sprite squashes and gets knocked away from the other one, then
  // springs back. side is -1 / 1 depending on which side of the impact it's on.
  const hitN = useStore((s) => (s.lastHit && s.lastHit.ids.includes(sprite.id) ? s.lastHit.n : 0));
  const side = useStore((s) => {
    const hit = s.lastHit;
    if (!hit || !hit.ids.includes(sprite.id)) return 0;
    const me = getSprite(sprite.id, s);
    return Math.sign((me ? me.x : 0) - hit.x) || (hit.ids[0] === sprite.id ? -1 : 1);
  });
  const [bump] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!hitN || prefersReducedMotion() || !isFresh(getState().lastHit)) return undefined;
    bump.setValue(1);
    // JS driver on purpose: the same transform also holds the position, which changes every frame
    const anim = Animated.spring(bump, { toValue: 0, speed: 14, bounciness: 16, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [hitN, bump]);

  // keep the latest x/y in a ref so the gesture doesn't have to be rebuilt every time it moves
  const pos = useRef({ x: sprite.x, y: sprite.y });
  useEffect(() => {
    pos.current = { x: sprite.x, y: sprite.y };
  }, [sprite.x, sprite.y]);

  // the compiler lint thinks these callbacks read refs during render, they don't
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e, success) => {
        if (success) actions.selectSprite(sprite.id);
      });
    // drag to move a sprite around (not while running, the script owns it then)
    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(!running)
      .minDistance(3)
      .onStart(() => {
        actions.selectSprite(sprite.id);
        start.current = { ...pos.current };
      })
      .onUpdate((e) => {
        actions.placeSprite(sprite.id, {
          x: Math.round(start.current.x + e.translationX / scale),
          y: Math.round(start.current.y - e.translationY / scale),
        });
      });
    return Gesture.Race(pan, tap);
  }, [sprite.id, running, scale]);
  /* eslint-enable react-hooks/refs */

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${sprite.name} at x ${Math.round(sprite.x)}, y ${Math.round(sprite.y)}, direction ${Math.round(sprite.direction)}`}
        style={[
          styles.sprite,
          {
            width: w,
            height: h,
            transform: [
              // knockback goes first so it's along the stage, not along the sprite's rotation
              { translateX: bump.interpolate({ inputRange: [0, 1], outputRange: [0, side * 12 * scale] }) },
              { translateX: left - w / 2 },
              { translateY: top - h / 2 },
              { rotate: `${sprite.direction - 90}deg` },
            ],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              { scaleX: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] }) },
              { scaleY: bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) },
            ],
          }}
        >
          <SpriteArt costume={sprite.costume} size={w} />
        </Animated.View>
        {selected && <View pointerEvents="none" style={styles.selection} />}
      </Animated.View>
    </GestureDetector>
  );
}

// Say/think bubble. Goes above the sprite, or below if there's no room. It's pushed
// sideways to stay on the stage, and the tail moves so it still points at the sprite.
function Bubble({ sprite, bubble, scale, stageW, stageH }) {
  const { left, top } = toScreen(sprite.x, sprite.y, scale);
  const halfH = (sprite.height * scale) / 2;
  const below = top - halfH < 60;
  const maxW = Math.min(180, stageW - 16);
  // guess the width from the text length, good enough for short messages
  const estW = Math.min(maxW, Math.max(44, String(bubble.text).length * 7.6 + 28));
  const x = Math.min(stageW - 8 - estW / 2, Math.max(8 + estW / 2, left));
  const tail = Math.max(14, Math.min(estW - 14, estW / 2 + (left - x)));
  const think = bubble.kind === "think";
  const pos = below ? { top: top + halfH + 10 } : { bottom: stageH - (top - halfH) + 10 };

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.bubble, think && styles.think, { left: x - estW / 2, width: estW }, pos]}
    >
      <Txt w={600} style={[styles.bubbleText, think && { color: "#4B2A99" }]}>
        {bubble.text || " "}
      </Txt>
      {think ? (
        <>
          <View style={[styles.thinkDot, styles.thinkDotBig, { left: tail - 5 }, below ? { top: -14 } : { bottom: -14 }]} />
          <View style={[styles.thinkDot, styles.thinkDotSmall, { left: tail - 11 }, below ? { top: -24 } : { bottom: -24 }]} />
        </>
      ) : (
        <View style={[styles.tail, { left: tail - 7 }, below ? styles.tailUp : styles.tailDown]} />
      )}
    </View>
  );
}

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

// The "pow" where two sprites meet: a quick flash, a ring that spreads out, sparks
// flying off and a lightning icon that pops. t starts at 1 (everything invisible)
// and only runs 0 -> 1 for a fresh hit, so a stale one never shows.
function CollisionBurst({ scale }) {
  const hit = useStore((s) => s.lastHit);
  const [t] = useState(() => new Animated.Value(1));
  const [doneFor, setDoneFor] = useState(0);

  useEffect(() => {
    if (!isFresh(hit)) return undefined;
    haptics.collide();
    if (prefersReducedMotion()) return undefined;
    t.setValue(0);
    const anim = Animated.timing(t, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver });
    anim.start(({ finished }) => finished && setDoneFor(hit.n));
    return () => anim.stop();
  }, [hit, t]);

  if (!hit || doneFor === hit.n) return null;

  const { left, top } = toScreen(hit.x, hit.y, scale);
  const r = 48 * scale;
  const box = { left: left - r, top: top - r, width: r * 2, height: r * 2 };
  const fade = (from, to) => t.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 1, 1, 0], extrapolate: "clamp" });

  return (
    <View pointerEvents="none" style={[styles.burst, box]}>
      <Animated.View
        style={[
          styles.flash,
          { borderRadius: r, opacity: fade(0.05, 0.2), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            borderRadius: r,
            borderWidth: Math.max(2, 4 * scale),
            opacity: fade(0.02, 0.5),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) }],
          },
        ]}
      />
      {SPARKS.map((deg, i) => (
        <View key={deg} style={[StyleSheet.absoluteFill, styles.center, { transform: [{ rotate: `${deg}deg` }] }]}>
          <Animated.View
            style={{
              width: Math.max(3, 5 * scale),
              height: Math.max(8, 14 * scale),
              borderRadius: 4,
              backgroundColor: i % 2 ? colors.motion : colors.control,
              opacity: fade(0.02, 0.6),
              transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-r * 0.2, -r * 1.05] }) }],
            }}
          />
        </View>
      ))}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.center,
          {
            opacity: fade(0.02, 0.65),
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1.3, 0.9] }) }],
          },
        ]}
      >
        <Icon name="zap" size={Math.max(20, 34 * scale)} color={colors.controlDark} strokeWidth={2.4} />
      </Animated.View>
    </View>
  );
}

function SwapToast() {
  const lastSwap = useStore((s) => s.lastSwap);
  const [hiddenFor, setHiddenFor] = useState(0); // which swap's toast already timed out
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!lastSwap) return undefined;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: Platform.OS !== "web" }).start();
    const t = setTimeout(() => setHiddenFor(lastSwap.n), 1800);
    return () => clearTimeout(t);
  }, [lastSwap, fade]);
  if (!lastSwap || hiddenFor === lastSwap.n) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity: fade }]} accessibilityLiveRegion="polite">
      <Icon name="zap" size={13} color={colors.control} />
      <Txt w={600} style={styles.toastText}>
        {lastSwap.names[0]} ⇄ {lastSwap.names[1]}: moves swapped
      </Txt>
    </Animated.View>
  );
}

// Always 480x360 in stage units, just scaled to fit. Pass `width` for a fixed size
// (full screen), otherwise it fills whatever space it gets.
export default function Stage({ width: fixedWidth, rounded = true }) {
  const [measured, setMeasured] = useState(0);
  const width = fixedWidth || measured;
  const scale = width > 0 ? width / STAGE_WIDTH : 0;
  const height = STAGE_HEIGHT * scale;
  const sprites = useStore((s) => s.sprites);
  const bubbles = useStore((s) => s.bubbles);
  const selectedId = useStore((s) => s.selectedId);
  const running = useStore((s) => s.running);
  const sel = useStore((s) => getSprite(s.selectedId, s));

  return (
    <View
      onLayout={fixedWidth ? undefined : (e) => setMeasured(e.nativeEvent.layout.width)}
      style={fixedWidth ? { width: fixedWidth } : styles.measure}
    >
      {scale > 0 && (
        <View
          style={[styles.stage, rounded && styles.rounded, running && styles.stageRunning, { width, height }]}
          accessibilityLabel="Stage, 480 by 360. Origin at the centre, x to the right, y up."
        >
          <View pointerEvents="none" style={[styles.axisV, { left: HALF_W * scale }]} />
          <View pointerEvents="none" style={[styles.axisH, { top: HALF_H * scale }]} />
          {sprites.map((sp) => (
            <SpriteNode key={sp.id} sprite={sp} scale={scale} selected={sp.id === selectedId} running={running} />
          ))}
          {sprites.map((sp) =>
            bubbles[sp.id] ? <Bubble key={`b-${sp.id}`} sprite={sp} bubble={bubbles[sp.id]} scale={scale} stageW={width} stageH={height} /> : null
          )}
          <CollisionBurst scale={scale} />
          <SwapToast />
          <View pointerEvents="none" style={styles.coords}>
            <Txt w={500} style={styles.coordsText}>
              {sel ? `${sel.name}  x: ${round(sel.x, 0)}  y: ${round(sel.y, 0)}` : "(0, 0) = centre"}
            </Txt>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  measure: { alignSelf: "stretch" },
  stage: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  rounded: { borderRadius: radius.md },
  stageRunning: { borderColor: "#A6DCA6" },
  axisV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "#EDF0F5" },
  axisH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#EDF0F5" },
  sprite: { position: "absolute", left: 0, top: 0 },
  burst: { position: "absolute" },
  center: { alignItems: "center", justifyContent: "center" },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255, 214, 102, 0.55)" },
  ring: { ...StyleSheet.absoluteFillObject, borderColor: colors.control },
  selection: {
    position: "absolute",
    left: -3,
    top: -3,
    right: -3,
    bottom: -3,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(76,151,255,0.75)",
    borderRadius: 10,
  },
  bubble: {
    position: "absolute",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#C5CCD8",
    ...shadow.md,
  },
  think: { borderRadius: 22, borderStyle: "dashed", backgroundColor: "#FBFAFF" },
  bubbleText: { fontSize: 13, lineHeight: 17, textAlign: "center" },
  tail: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: "#FFFFFF",
    borderColor: "#C5CCD8",
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 3,
  },
  tailDown: { bottom: -9, transform: [{ rotate: "45deg" }] },
  tailUp: { top: -9, transform: [{ rotate: "-135deg" }] },
  thinkDot: { position: "absolute", backgroundColor: "#FBFAFF", borderWidth: 2, borderColor: "#C5CCD8", borderRadius: 8 },
  thinkDotBig: { width: 11, height: 11 },
  thinkDotSmall: { width: 7, height: 7 },
  toast: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.text,
    ...shadow.md,
  },
  toastText: { color: "#FFFFFF", fontSize: 12 },
  coords: {
    position: "absolute",
    right: 6,
    bottom: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  coordsText: { fontSize: 11, color: colors.text2, fontVariant: ["tabular-nums"] },
});
