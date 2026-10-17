import React, { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
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
import { colors, fontState, radius } from "./src/theme";

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
      style={[styles.tab, active && styles.tabActive]}
    >
      <Icon name={icon} size={16} color={active ? colors.text : colors.text2} />
      <Txt w={600} style={[styles.tabText, active && { color: colors.text }]}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Tabs({ tab, setTab }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
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
    <View style={styles.app}>
      <Header onPlay={onPlay} onStop={stop} onReset={reset} size={mode} />
      {mode !== "wide" && (
        <View style={styles.tabRow}>
          <Tabs tab={tab} setTab={setTab} />
          {compact && <CompactHistory />}
        </View>
      )}
      <View style={[styles.layout, compact && styles.layoutCompact]}>
        {mode === "wide" && (
          <>
            <View style={styles.paletteCol}>
              <Palette orientation="column" />
            </View>
            <View style={styles.flex}>
              <Workspace />
            </View>
            <View style={styles.previewCol}>
              <PreviewArea />
            </View>
          </>
        )}
        {mode === "medium" &&
          (tab === "code" ? (
            <>
              <View style={styles.paletteColMedium}>
                <Palette orientation="column" />
              </View>
              <View style={styles.flex}>
                <Workspace />
              </View>
            </>
          ) : (
            <View style={styles.previewCentered}>
              <PreviewArea />
            </View>
          ))}
        {mode === "narrow" &&
          (tab === "code" ? (
            <View style={[styles.flex, styles.stack]}>
              <Palette orientation="row" />
              <Workspace compact />
            </View>
          ) : (
            <View style={styles.flex}>
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
          {ready ? (
            <Studio />
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.motion} />
            </View>
          )}
        </SafeAreaView>
        <DragLayer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  app: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0 },
  stack: { rowGap: 8 },
  layout: { flex: 1, flexDirection: "row", columnGap: 12, paddingHorizontal: 12, paddingBottom: 12 },
  layoutCompact: { columnGap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  paletteCol: { width: 340 },
  paletteColMedium: { width: 300 },
  previewCol: { width: 380 },
  previewCentered: { flex: 1, maxWidth: 720, width: "100%", alignSelf: "center", marginHorizontal: "auto" },
  tabRow: { flexDirection: "row", alignItems: "center", columnGap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  tabs: {
    flex: 1,
    flexDirection: "row",
    columnGap: 4,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: "#E9EDF3",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    height: 36,
    borderRadius: radius.md,
  },
  tabActive: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  tabText: { fontSize: 13, color: colors.text2 },
});
