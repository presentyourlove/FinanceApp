// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 如果您需要新增任何額外的自訂配置，請在這裡修改 config 物件

module.exports = config;