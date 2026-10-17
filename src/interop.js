// NativeWind only knows about the core RN components. These come from libraries,
// so tell it which prop each className should turn into.
import { cssInterop } from "nativewind";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import Svg from "react-native-svg";

cssInterop(GestureHandlerRootView, { className: "style" });
cssInterop(ScrollView, { className: "style", contentContainerClassName: "contentContainerStyle" });
cssInterop(Svg, { className: "style" });
