import React, { forwardRef } from "react";
import { Platform, Text, TextInput } from "react-native";
import { colors, fontFor } from "../../theme";

// w = font weight
export function Txt({ w = 400, style, ...props }) {
  return <Text {...props} style={[{ color: colors.text, fontSize: 14 }, fontFor(w), style]} />;
}

// TextInput without the Android underline and extra font padding
export const Field = forwardRef(function Field({ w = 500, style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.text3}
      underlineColorAndroid="transparent"
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
      style={[{ color: colors.text, fontSize: 14, paddingVertical: 0, includeFontPadding: false }, fontFor(w), style]}
    />
  );
});

// iOS "numeric" has no minus key, and you need that for move -10
export const numberKeyboard = Platform.select({ ios: "numbers-and-punctuation", default: "numeric" });
