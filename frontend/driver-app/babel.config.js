module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 (required by expo-router 56) needs the Worklets Babel plugin.
    // It MUST be the last plugin in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};
