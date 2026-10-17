import React, { forwardRef } from "react";
import { Platform, Text, TextInput } from "react-native";
import { colors, fontFor } from "../../theme";

// w = font weight. The font family has to go through style because it depends on
// whether Inter loaded, everything else is className.
export function Txt({ w = 400, className = "", style, ...props }) {
  return <Text {...props} className={className} style={[fontFor(w), style]} />;
}

// TextInput without the Android underline and extra font padding
export const Field = forwardRef(function Field({ w = 500, className = "", style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.text3}
      underlineColorAndroid="transparent"
      autoCorrect={false}
      autoCapitalize="none"
      {...props}
      className={`py-0 ${className}`}
      style={[{ includeFontPadding: false }, fontFor(w), style]}
    />
  );
});

// iOS "numeric" has no minus key, and you need that for move -10
export const numberKeyboard = Platform.select({ ios: "numbers-and-punctuation", default: "numeric" });
