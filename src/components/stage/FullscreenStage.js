import React from "react";
import { Modal, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useStore } from "../../state/useStore";
import { play, reset, stop } from "../../engine/runtime";
import { colors, radius, shadow } from "../../theme";
import { IconButton, SwapPill } from "../ui/Buttons";
import { Txt } from "../ui/Txt";
import Stage from "./Stage";

const BAR_H = 60;

// Full screen stage with its own Play/Stop/Reset. Picks the biggest 4:3 size that fits,
// so turning the phone sideways gives you a bigger stage. Back button closes it.
export default function FullscreenStage({ visible, onExit }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const running = useStore((s) => s.running);
  const title = useStore((s) => s.title);
  const narrow = width < 560;

  const pad = narrow ? 8 : 16;
  const availW = width - insets.left - insets.right - pad * 2;
  const availH = height - insets.top - insets.bottom - BAR_H - pad * 2;
  const stageW = Math.max(120, Math.floor(Math.min(availW, (availH * 4) / 3)));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onExit}
    >
      {/* Modal is a separate native root on Android, so gestures need their own root view */}
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <View style={[styles.bar, { paddingTop: insets.top, height: BAR_H + insets.top, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}>
          <View style={styles.controls}>
            <IconButton icon="play" label={running ? "Running" : "Play"} tone="go" onPress={play} disabled={running} showLabel={!narrow} />
            <IconButton icon="stop" label="Stop" tone="danger" onPress={stop} disabled={!running} showLabel={!narrow} />
            <IconButton icon="reset" label="Reset" accessibilityLabel="Reset stage" tone="outline" onPress={reset} showLabel={!narrow} />
          </View>
          <View style={styles.titleWrap}>
            {!narrow && (
              <Txt w={600} numberOfLines={1} style={styles.title}>
                {title}
              </Txt>
            )}
            <SwapPill />
          </View>
          <IconButton icon="minimize" label="Exit" accessibilityLabel="Exit full screen" tone="outline" onPress={onExit} showLabel={!narrow} />
        </View>
        <View style={[styles.body, { paddingBottom: insets.bottom }]}>
          <View style={styles.stageShadow}>
            <Stage width={stageW} />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF1F6" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.sm,
  },
  controls: { flexDirection: "row", columnGap: 8 },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", columnGap: 8, minWidth: 0 },
  title: { fontSize: 14, flexShrink: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  stageShadow: { borderRadius: radius.md, ...shadow.lg, backgroundColor: "#FFFFFF" },
});
