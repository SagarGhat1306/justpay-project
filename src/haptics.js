import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Haptics are a nice-to-have. Some devices/simulators throw or reject, we don't care.
const safe = (fn) => {
  if (Platform.OS === "web") return;
  try {
    const p = fn();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // no haptics on this device
  }
};

export const haptics = {
  pickUp: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  snap: () => safe(() => Haptics.selectionAsync()),
  remove: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  collide: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
