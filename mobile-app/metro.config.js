const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// If the issue with @motionone/dom persists, we can add a resolver alias here.
// But for now, let's stick with the default and see if the clean install fixed it.

module.exports = config;
