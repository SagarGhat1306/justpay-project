import "./global.css";
import "./src/interop";
import React, { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { loadAsync } from "expo-font";
// importing from the package root pulls in every weight, we only use these four
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import Header, { CompactHistory } from "./src/components/Header";
import Palette from "./src/components/Palette";
import Workspace from "./src/components/Workspace";
import PreviewArea from "./src/components/PreviewArea";
import DragLayer from "./src/components/blocks/DragLayer";
import { setBlockReducedMotion } from "./src/components/blocks/BlockView";
import { Txt } from "./src/components/ui/Txt";
import Icon from "./src/components/Icon";
import { actions, getState, hydrate } from "./src/state/store";
import { startAutosave } from "./src/state/persistence";
import { dispose, play, reset, setReducedMotion, stop } from "./src/engine/runtime";
import { setDropHandler } from "./src/dnd/dragStore";
import { colors, fontState } from "./src/theme";

// from the palette = add a new block, from the script = move it, onto the palette = delete
function handleDrop(payload, target) {
  const spriteId = getState().selectedId;
  if (target.type === "delete") {
    if (payload.kind === "block") actions.deleteBlock(payload.spriteId, payload.blockId);
    return;
  }
  if (target.type !== "list") return;
  if (payload.kind === "palette") actions.addBlock(spriteId, payload.type, target.parentId, target.index);
  else if (payload.kind === "block") actions.moveBlock(payload.spriteId, payload.blockId, target.parentId, target.index);
}

// wide (big tablets / landscape): everything side by side, same as the web version
// medium (tablets): Code and Stage tabs, palette as a column next to the script
// narrow (phones): same tabs, palette becomes a strip above the script
function useLayoutMode() {
  const { width } = useWindowDimensions();
  if (width >= 1024) return "wide";
  if (width >= 700) return "medium";
  return "narrow";
}

function Tab({ id, icon, label, tab, setTab }) {
  const active = tab === id;
  return (
    <Pressable
      onPress={() => setTab(id)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={`h-9 flex-1 flex-row items-center justify-center gap-x-1.5 rounded-md ${active ? "border border-line bg-panel" : ""}`}
    >
      <Icon name={icon} size={16} color={active ? colors.text : colors.text2} />
      <Txt w={600} className={`text-sm ${active ? "text-ink" : "text-ink-2"}`}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <View className="flex-1 flex-row gap-x-1 rounded-lg bg-[#E9EDF3] p-1" accessibilityRole="tablist">
      <Tab id="code" icon="code" label="Code" tab={tab} setTab={setTab} />
      <Tab id="stage" icon="monitor" label="Stage & sprites" tab={tab} setTab={setTab} />
    </View>
  );
}

const FONTS = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };

function Studio() {
  const mode = useLayoutMode();
  const [tab, setTab] = useState("code");
  const compact = mode === "narrow";

  useEffect(() => startAutosave(), []);
  useEffect(() => () => dispose(), []);
  useEffect(() => {
    setDropHandler(handleDrop);
    return () => setDropHandler(null);
  }, []);

  const onPlay = useCallback(() => {
    play();
    if (mode !== "wide") setTab("stage"); // otherwise you press Play and see nothing happen
  }, [mode]);

  return (
    <View className="flex-1">
      <Header onPlay={onPlay} onStop={stop} onReset={reset} size={mode} />
      {mode !== "wide" && (
        <View className="flex-row items-center gap-x-2 px-3 pb-2.5">
          <Tabs tab={tab} setTab={setTab} />
          {compact && <CompactHistory />}
        </View>
      )}
      <View className={`flex-1 flex-row ${compact ? "gap-x-2 px-2 pb-2" : "gap-x-3 px-3 pb-3"}`}>
        {mode === "wide" && (
          <>
            <View className="w-[340px]">
              <Palette orientation="column" />
            </View>
            <View className="min-w-0 flex-1">
              <Workspace />
            </View>
            <View className="w-[380px]">
              <PreviewArea />
            </View>
          </>
        )}
        {mode === "medium" &&
          (tab === "code" ? (
            <>
              <View className="w-[300px]">
                <Palette orientation="column" />
              </View>
              <View className="min-w-0 flex-1">
                <Workspace />
              </View>
            </>
          ) : (
            <View className="mx-auto w-full max-w-[720px] flex-1 self-center">
              <PreviewArea />
            </View>
          ))}
        {mode === "narrow" &&
          (tab === "code" ? (
            <View className="min-w-0 flex-1 gap-y-2">
              <Palette orientation="row" />
              <Workspace compact />
            </View>
          ) : (
            <View className="min-w-0 flex-1">
              <PreviewArea compact />
            </View>
          ))}
      </View>
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // if Inter fails to load we just fall back to the system font, not worth blocking on
    const fonts = loadAsync(FONTS)
      .then(() => {
        fontState.loaded = true;
      })
      .catch(() => {});
    Promise.all([fonts, hydrate()]).finally(() => alive && setReady(true));

    const applyReducedMotion = (v) => {
      setReducedMotion(v);
      setBlockReducedMotion(v);
    };
    AccessibilityInfo.isReduceMotionEnabled().then(applyReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", applyReducedMotion);
    return () => {
      alive = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView className="flex-1 bg-app">
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView className="flex-1 bg-app" edges={["top", "left", "right", "bottom"]}>
          {ready ? (
            <Studio />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={colors.motion} />
            </View>
          )}
        </SafeAreaView>
        <DragLayer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
