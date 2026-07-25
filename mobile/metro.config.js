const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

/**
 * withNativeWind inyecta la hoja de estilos de Tailwind en el bundle.
 * input: ruta al archivo global.css
 */
module.exports = withNativeWind(config, { input: "./global.css" });
