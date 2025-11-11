// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs'); // 引入 Node.js 檔案系統模組

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ---------------------------------------------------
// Wasm 載入修復: 告訴 Metro 如何將 .wasm 檔案載入為 base64 字串
// ---------------------------------------------------

// 1. 確保 Wasm 被列為源文件擴展名，並從資產列表中移除
const assetExts = config.resolver.assetExts;
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'wasm');
config.resolver.sourceExts.push('wasm');

// 2. 創建自定義轉換器來處理 .wasm 檔案
config.transformer.get;//