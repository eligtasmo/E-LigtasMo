const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Redirect 'moti' imports to our lightweight shim
// This avoids the Reanimated v4 incompatibility that crashes Expo Go SDK 54
config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'moti': path.resolve(__dirname, 'src/lib/moti-shim.js'),
};

module.exports = config;
