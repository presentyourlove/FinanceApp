module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // 確保這裡包含 'babel-preset-expo'
      ['babel-preset-expo', { jsxRuntime: 'automatic' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};