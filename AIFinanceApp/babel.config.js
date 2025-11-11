module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // 確保這裡包含 'babel-preset-expo'
      ['babel-preset-expo', { jsxRuntime: 'automatic' }],
    ],
    plugins: [
      // 這裡應該是空的，或者只有您未來需要新增的其他插件
    ],
  };
};