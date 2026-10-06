const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withUniwindConfig } = require('uniwind/metro');

// Config de Expo con lo que Sentry necesita para los mapas de código.
const config = getSentryExpoConfig(__dirname);

// withUniwindConfig tiene que ser el wrapper más externo.
module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
