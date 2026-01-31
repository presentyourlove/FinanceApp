# 💰 Finance App (智慧理財助手)

[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-52-blue)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-cyan)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![CI](https://github.com/presentyourlove/FinanceApp/workflows/CI/badge.svg)

一個基於 **React Native (Expo)** 與 **TypeScript** 打造的現代化個人理財應用程式。專注於極致的效能、優美的 UI/UX 設計，以及企業級的程式碼品質。

## ✨ 專案亮點 (Project Highlights)

* **🏗️ Repository Pattern**: 採用儲存庫模式 (Repository Pattern)，實現跨平台資料存取。Native 端使用 SQLite，Web 端使用 IndexedDB (透過 `localforage`)，確保程式碼高內聚低耦合。
* **⚡ FlashList 優化**: 使用 `@shopify/flash-list` 取代原生 FlatList，顯著提升列表滾動流暢度與記憶體效率。
* **� CI/CD 自動化**: 完整的 GitHub Actions 工作流程，自動執行 TypeScript 類型檢查、ESLint 與 Jest 測試。
* **🎨 Dark Mode 支援**: 透過 Context API 實作主題切換，支援亮色與暗色模式。
* **📊 多幣別支援**: 支援 TWD, USD, JPY, CNY 等多種貨幣，並提供匯率設定功能。
* **🔒 Type Safety**: 全專案採用 TypeScript，100% 通過類型檢查，確保類型安全與開發體驗。
* **✅ 單元測試**: 使用 Jest 與 React Testing Library 進行元件與邏輯測試。
* **� 跨平台支援**: 同時支援 iOS、Android 與 Web 平台。

## 🚀 功能特色 (Features)

* **📝 記帳功能**: 快速記錄收入、支出與轉帳，支援自訂類別。
* **📊 視覺化分析**: 透過圓餅圖、長條圖即時掌握財務狀況。
* **💰 預算管理**: 設定月度預算，即時監控消費水位。
* **🏦 多帳戶管理**: 支援現金、銀行、信用卡等多種帳戶類型。
* **☁️ 雲端同步**: 整合 Firebase Auth，支援資料備份與還原 (Optional)。
* **📉 投資追蹤**: 記錄股票與投資損益 (依據實作狀況調整)。

## 💎 程式碼品質 (Code Quality)

本專案嚴格遵循 **GEMINI Development Guidelines**，確保高可維護性與穩定性：

* **Strict Typing**: 全面採用 TypeScript，嚴格的型別檢查。
* **Linting**: 使用 ESLint 與 Prettier 確保代碼風格一致。
* **Modular Architecture**: 採用模組化設計 (Components, Services, Utils 分離)。
* **No Magic Numbers**: 所有常數與設定值皆抽離至 `src/constants/`。
* **Error Handling**: 統一的 `ErrorHandler` 機制，確保 App 不會輕易崩潰。
* **Performance**: 善用 `useMemo`, `useCallback` 優化渲染效能。

## 🛠 技術堆疊 (Tech Stack)

* **核心框架**: React Native, Expo
* **語言**: TypeScript
* **路由**: Expo Router (File-based routing)
* **資料庫**: Expo SQLite (本地儲存)
* **後端服務**: Firebase (Authentication, Storage - 選用)
* **UI 套件**: React Native Reanimated (動畫), React Native Chart Kit (圖表)
* **工具**: Husky (Git Hooks), ESLint, Prettier

## 📂 專案結構 (Project Structure)

```text
FinanceApp/
├── app/                    # Expo Router 頁面路由
│   ├── (tabs)/             # 底部導航頁面 (Home, Transaction, Analysis, Settings)
│   └── _layout.tsx         # 全局 Layout 設定
├── src/
│   ├── components/         # 可重用 UI 元件 (依功能分類)
│   ├── constants/          # 全局常數 (Categories, Colors, Layout)
│   ├── context/            # React Context (Theme, Auth)
│   ├── hooks/              # Custom Hooks
│   ├── i18n/               # 國際化語系檔
│   ├── services/           # 外部服務 (Database, Firebase, Storage)
│   ├── types/              # TypeScript 型別定義
│   └── utils/              # 工具函式 (ErrorHandler, Formatters)
├── assets/                 # 靜態資源 (Images, Fonts)
├── tsconfig.json           # TypeScript 設定
└── README.md               # 專案文件
```

## 🏁 快速開始 (Quick Start)

### 前置需求

* Node.js (LTS 版本)
* npm 或 yarn
* Expo Go App (手機端測試用)

### 安裝步驟

1. **複製專案**

    ```bash
    git clone https://github.com/your-username/FinanceApp.git
    cd FinanceApp
    ```

2. **安裝依賴**

    ```bash
    npm install
    # 或
    yarn install
    ```

3. **設定環境變數**
    複製 `.env.example` 並重新命名為 `.env`，填入您的 Firebase 設定 (若不需要雲端功能可跳過)。

    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
    ...
    ```

4. **啟動專案**

    ```bash
    npm start
    ```

    使用手機 Expo Go 掃描 QR Code 即可預覽。

## 📱 支援平台 (Supported Platforms)

* **Android**: Android 8.0+
* **iOS**: iOS 13.0+
* **Web**: 支援 (已實作 Repository Pattern 與 IndexedDB 適配)

## 📖 開發指南 (Development Guide)

* **新增頁面**: 在 `app/` 目錄下建立 `.tsx` 檔案即可自動產生路由。
* **新增元件**: 請在 `src/components/` 下依照功能建立資料夾。
* **修改常數**: 請勿直接在程式碼中寫死數值，請至 `src/constants/` 修改。
* **資料庫變更**: 修改 `src/services/database.ts` 中的 Schema 定義。

## 🧪 測試 (Testing)

目前支援單元測試與 Lint 檢查：

```bash
# 執行 ESLint 檢查
npm run lint

# 執行單元測試 (Jest)
npm test
```

## � CI/CD 自動化測試 (Continuous Integration)

本專案已配置完整的 GitHub Actions 工作流程，每次 push 或 pull request 都會自動執行以下檢查：

* **TypeScript 類型檢查**: `npm run type-check`
* **ESLint 程式碼檢查**: `npm run lint`  
* **Jest 單元測試**: `npm run test:ci`（含覆蓋率報告）

### CI 狀態徽章

專案頂部的 CI 徽章會顯示最新的測試狀態。如需更新徽章 URL，請將 `YOUR_USERNAME` 替換為您的 GitHub 使用者名稱。

### 本地執行 CI 檢查

```bash
# TypeScript 類型檢查
npm run type-check

# ESLint 檢查
npm run lint

# 執行測試（CI 模式）
npm run test:ci
```

## �📦 打包發布 (Build & Publish)

使用 EAS Build 進行打包：

```bash
# 安裝 EAS CLI
npm install -g eas-cli

# 設定 EAS
eas build:configure

# 打包 Android APK
eas build -p android --profile preview

# 打包 iOS IPA
eas build -p ios --profile preview
```

## 🌐 Web 部署 (Web Deployment)

本專案使用 **Firebase Hosting** 進行 Web 版本部署。

### 訪問 Web App

部署後的 Web 應用程式可在以下網址訪問：
* **URL**: <https://aifinanceapp-2ce60.web.app/>

### 手動部署步驟

1. **安裝 Firebase CLI** (若尚未安裝)

   ```bash
   npm install -g firebase-tools
   ```

2. **登入 Firebase**

   ```bash
   npx firebase login
   ```

3. **建置 Web 版本**

   ```bash
   npx expo export --platform web
   ```

   這會產生 `dist` 資料夾。

4. **部署到 Firebase**

   ```bash
   npx firebase deploy --only hosting
   ```

### 本地測試 Web 版本

```bash
# 啟動 Web 開發伺服器
npm run web

# 預覽生產版本 (使用 Firebase Local Server)
npx firebase serve --only hosting
```

## 🤝 貢獻 (Contribution)

歡迎提交 Pull Request 或 Issue！請確保：

1. 遵循專案的 Lint 規範。
2. 提交訊息請遵循 Conventional Commits (e.g., `feat: add new chart`).

## 📄 文件 (Documentation)

* [Implementation Plan](file:///C:/Users/USER/.gemini/antigravity/brain/ff6beec0-10d6-4c47-931b-11c2e993c4ba/implementation_plan.md)
* [Task Tracking](file:///C:/Users/USER/.gemini/antigravity/brain/ff6beec0-10d6-4c47-931b-11c2e993c4ba/task.md)
* [Change Log (Walkthrough)](file:///C:/Users/USER/.gemini/antigravity/brain/ff6beec0-10d6-4c47-931b-11c2e993c4ba/walkthrough.md)

## 👤 作者 (Author)

**FinanceApp Team** (Powered by Google Gemini Agent)

## 🙏 致謝 (Acknowledgments)

* Expo Team
* React Native Community
* Open Source Contributors

## 📝 授權 (License)

This project is licensed under the [MIT License](LICENSE).
