const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// NativeWind uses 14px for 1rem on native by default. 16 keeps p-4 = 16px like on the web.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
