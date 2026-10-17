import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useStore } from "../../state/useStore";
import { actions, getSprite, getState } from "../../state/store";
import { HALF_H, HALF_W, STAGE_HEIGHT, STAGE_WIDTH, round, toScreen } from "../../engine/coords";
import { prefersReducedMotion } from "../../engine/runtime";
import { colors, shadow } from "../../theme";
import { haptics } from "../../haptics";
import SpriteArt from "../SpriteArt";
import { Txt } from "../ui/Txt";
import Icon from "../Icon";

const nativeDriver = Platform.OS !== "web";

// A hit we're seeing for the first time should animate. One that's old (say the stage
// tab was opened after the collision happened) shouldn't replay.
const isFresh = (hit) => Boolean(hit) && Date.now() - hit.at < 400;

// Animated.View doesn't take className, so the animated parts use plain style objects
const fill = { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 };
const centered = { ...fill, alignItems: "center", justifyContent: "center" };

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
          {
            position: "absolute",
            left: 0,
            top: 0,
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
        {selected && (
          <View pointerEvents="none" className="absolute -inset-[3px] rounded-[10px] border-2 border-dashed border-[rgba(76,151,255,0.75)]" />
        )}
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

  const dot = "absolute rounded-lg border-2 border-[#C5CCD8] bg-[#FBFAFF]";

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      className={`absolute border-2 border-[#C5CCD8] px-2.5 py-[7px] ${think ? "rounded-[22px] border-dashed bg-[#FBFAFF]" : "rounded-[14px] bg-white"}`}
      style={[shadow.md, { left: x - estW / 2, width: estW }, pos]}
    >
      <Txt w={600} className={`text-center text-sm leading-[17px] ${think ? "text-[#4B2A99]" : "text-ink"}`}>
        {bubble.text || " "}
      </Txt>
      {think ? (
        <>
          <View className={`${dot} h-[11px] w-[11px]`} style={[{ left: tail - 5 }, below ? { top: -14 } : { bottom: -14 }]} />
          <View className={`${dot} h-[7px] w-[7px]`} style={[{ left: tail - 11 }, below ? { top: -24 } : { bottom: -24 }]} />
        </>
      ) : (
        <View
          className={`absolute h-3.5 w-3.5 rounded-br-[3px] border-b-2 border-r-2 border-[#C5CCD8] bg-white ${below ? "-top-[9px] -rotate-[135deg]" : "-bottom-[9px] rotate-45"}`}
          style={{ left: tail - 7 }}
        />
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
    <View pointerEvents="none" className="absolute" style={box}>
      <Animated.View
        style={[
          fill,
          {
            backgroundColor: "rgba(255, 214, 102, 0.55)",
            borderRadius: r,
            opacity: fade(0.05, 0.2),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.1] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          fill,
          {
            borderColor: colors.control,
            borderRadius: r,
            borderWidth: Math.max(2, 4 * scale),
            opacity: fade(0.02, 0.5),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) }],
          },
        ]}
      />
      {SPARKS.map((deg, i) => (
        <View key={deg} className="absolute inset-0 items-center justify-center" style={{ transform: [{ rotate: `${deg}deg` }] }}>
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
          centered,
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
    <View pointerEvents="none" className="absolute top-2 self-center" accessibilityLiveRegion="polite">
      <Animated.View style={{ opacity: fade }}>
        <View className="flex-row items-center gap-x-1.5 rounded-full bg-ink px-3 py-1.5" style={shadow.md}>
          <Icon name="zap" size={13} color={colors.control} />
          <Txt w={600} className="text-xs text-white">
            {lastSwap.names[0]} ⇄ {lastSwap.names[1]}: moves swapped
          </Txt>
        </View>
      </Animated.View>
    </View>
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
      className={fixedWidth ? "" : "self-stretch"}
      style={fixedWidth ? { width: fixedWidth } : undefined}
    >
      {scale > 0 && (
        <View
          className={`overflow-hidden border bg-white ${rounded ? "rounded-md" : ""} ${running ? "border-[#A6DCA6]" : "border-line-strong"}`}
          style={{ width, height }}
          accessibilityLabel="Stage, 480 by 360. Origin at the centre, x to the right, y up."
        >
          <View pointerEvents="none" className="absolute bottom-0 top-0 w-px bg-[#EDF0F5]" style={{ left: HALF_W * scale }} />
          <View pointerEvents="none" className="absolute left-0 right-0 h-px bg-[#EDF0F5]" style={{ top: HALF_H * scale }} />
          {sprites.map((sp) => (
            <SpriteNode key={sp.id} sprite={sp} scale={scale} selected={sp.id === selectedId} running={running} />
          ))}
          {sprites.map((sp) =>
            bubbles[sp.id] ? <Bubble key={`b-${sp.id}`} sprite={sp} bubble={bubbles[sp.id]} scale={scale} stageW={width} stageH={height} /> : null
          )}
          <CollisionBurst scale={scale} />
          <SwapToast />
          <View pointerEvents="none" className="absolute bottom-[5px] right-1.5 rounded bg-white/[0.88] px-1.5 py-0.5">
            <Txt w={500} className="text-2xs text-ink-2 tabular-nums">
              {sel ? `${sel.name}  x: ${round(sel.x, 0)}  y: ${round(sel.y, 0)}` : "(0, 0) = centre"}
            </Txt>
          </View>
        </View>
      )}
    </View>
  );
}
