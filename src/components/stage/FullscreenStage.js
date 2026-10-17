import React from "react";
import { Modal, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useStore } from "../../state/useStore";
import { play, reset, stop } from "../../engine/runtime";
import { shadow } from "../../theme";
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
      <GestureHandlerRootView className="flex-1 bg-[#EEF1F6]">
        <StatusBar style="dark" />
        {/* the safe-area insets are only known at runtime, so the padding stays inline */}
        <View
          className="flex-row items-center gap-x-2.5 border-b border-line bg-panel"
          style={[shadow.sm, { paddingTop: insets.top, height: BAR_H + insets.top, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 }]}
        >
          <View className="flex-row gap-x-2">
            <IconButton icon="play" label={running ? "Running" : "Play"} tone="go" onPress={play} disabled={running} showLabel={!narrow} />
            <IconButton icon="stop" label="Stop" tone="danger" onPress={stop} disabled={!running} showLabel={!narrow} />
            <IconButton icon="reset" label="Reset" accessibilityLabel="Reset stage" tone="outline" onPress={reset} showLabel={!narrow} />
          </View>
          <View className="min-w-0 flex-1 flex-row items-center justify-center gap-x-2">
            {!narrow && (
              <Txt w={600} numberOfLines={1} className="shrink text-base text-ink">
                {title}
              </Txt>
            )}
            <SwapPill />
          </View>
          <IconButton icon="minimize" label="Exit" accessibilityLabel="Exit full screen" tone="outline" onPress={onExit} showLabel={!narrow} />
        </View>
        <View className="flex-1 items-center justify-center" style={{ paddingBottom: insets.bottom }}>
          <View className="rounded-md bg-white" style={shadow.lg}>
            <Stage width={stageW} />
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
