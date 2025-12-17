# AIFinanceApp - 智慧理財助手

AIFinanceApp 是一個基於 React Native 與 Expo 開發的現代化智慧理財應用程式。透過直觀的介面與強大的功能，協助使用者輕鬆追蹤收支、規劃預算、設定存錢目標，並透過圖表分析財務狀況。

**目前版本狀態**：🚀 **極度優化 (Deep Polished)**

- **Code Quality**: 嚴格遵循 TypeScript 規範，0 Lint Errors。
- **UI Design**: 導入全域樣式系統 (`src/styles/common.ts`)，視覺體驗一致且流暢。
- **Performance**: 針對列表渲染進行效能優化 (`React.memo`, `useCallback`)。

**跨平台支援**：

- 📱 **原生 App** (Android/iOS)：使用 SQLite 本地資料庫，支援離線使用
- 🌐 **Web 版本**：使用 localStorage 持久化，支援雲端同步
- ☁️ **Firebase 整合**：跨裝置資料同步，確保您的財務數據安全無虞

**線上體驗**：[https://aifinanceapp-2ce60.web.app/](https://aifinanceapp-2ce60.web.app/)

## ✨ 主要功能 (Features)

### 1. 📝 記帳 (Transactions)

- **收支記錄**：快速記錄每日收入與支出，支援多種分類。
- **轉帳功能**：支援帳戶間的資金轉移。
- **智慧篩選**：可按「今日」、「本月」、「本年」及「全部」快速篩選交易紀錄。

### 2. 💰 預算 (Budgets)

- **預算設定**：針對不同類別（如餐飲、交通）設定每月預算。
- **進度追蹤**：即時顯示預算使用百分比，避免超支。

### 3. 🎯 規劃 (Planning)

- **存錢目標**：設定具體的存錢目標（如買車、旅遊），追蹤達成進度。
- **投資追蹤**：記錄股票、定存等投資項目，掌握資產增值狀況。

### 4. 📊 分析 (Analysis)

- **圖表分析**：提供圓餅圖與長條圖，清晰呈現資金流向與消費結構。
- **趨勢洞察**：分析長期財務趨勢，協助做出更好的財務決策。

### 5. ⚙️ 設定 (Settings)

- **雲端同步**：整合 Firebase，支援資料備份與還原，跨裝置無縫接軌。
- **個人化**：支援深色模式 (Dark Mode) 與多種主題色系。
- **匯出功能**：支援匯出交易記錄為 CSV 格式。

### 6. 🌐 Web 版本特性

- **localStorage 持久化**：網頁重新整理後資料不會遺失，提供接近原生 App 的體驗。
- **自動導向同步頁面**：Web 使用者首次進入時自動導向「同步備份」頁面，方便快速設定雲端同步。
- **響應式設計**：完美適配桌面與行動裝置瀏覽器。

## 🛠️ 技術堆疊 (Tech Stack)

- **核心框架**: [React Native](https://reactnative.dev/) (v0.81), [Expo](https://expo.dev/) (v54)
- **開發語言**: [TypeScript](https://www.typescriptlang.org/)
- **路由管理**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **資料庫**:
  - Native: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
  - Web: localStorage (Web Storage API)
- **後端服務**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Hosting)
- **架構設計**: 模組化服務層 (Modular Service Layer) 與 元件化設計 (Component-Based Architecture)

## 🚀 安裝與執行 (Installation & Setup)

1. **複製專案 (Clone Repository)**

    ```bash
    git clone https://github.com/presentyourlove/FinanceApp.git
    cd FinanceApp
    ```

2. **安裝相依套件 (Install Dependencies)**

    ```bash
    npm install
    # 或
    yarn install
    ```

3. **設定環境變數 (Environment Variables)**

    請在 `AIFinanceApp` 目錄下 (與 `package.json` 同層) 建立 `.env` 檔案，並填入您的 Firebase 設定：

    ```env
    EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4. **啟動應用程式 (Start Application)**

    ```bash
    npx expo start
    ```

    啟動後，使用手機上的 Expo Go App 掃描終端機顯示的 QR Code 即可預覽。

5. **打包應用程式 (Build Application)**

    **Android APK**:

    ```bash
    npx eas-cli build --platform android --profile apk
    ```

    **Web 版本部署**:

    ```bash
    npx expo export -p web
    npx firebase deploy --only hosting
    ```

## ❓ 故障排除 (Troubleshooting)

### Node.js v24 啟動崩潰 (Expo CLI Crash)

如果您使用 **Node.js v24** 執行 `npx expo start` 時遇到 `TypeError: Body is unusable` 錯誤，這是因為新版 Node.js 內建的 `undici` 與 Expo CLI 衝突所致。

**解決方案**：
請在 `.env` 檔案中加入以下設定，開啟離線模式以跳過依賴檢查：

```env
EXPO_OFFLINE=1
```

## 📂 專案結構 (Project Structure)

```text
AIFinanceApp/
├── app/                 # Expo Router 頁面路由
│   ├── (tabs)/          # 底部導航 (index, budget, planning, analysis, settings)
│   └── _layout.tsx      # 全域佈局設定
├── src/
│   ├── components/      # UI 元件庫
│   │   ├── common/      # 通用元件 (ModalPage, PickerOverlay...)
│   │   ├── transaction/ # 記帳元件
│   │   ├── investment/  # 投資元件
│   │   └── ...
│   ├── styles/          # 全域樣式定義
│   │   └── common.ts    # 共用樣式 (Shadows, Cards, Buttons)
│   ├── hooks/           # Custom Hooks (useBudgets, useInvestments...)
│   ├── services/        # 核心邏輯層
│   │   ├── database/    # 資料庫模組 (SQLite & Web)
│   │   └── storage/     # 本地儲存 (Theme, Settings)
│   ├── context/         # React Context (ThemeContext)
│   ├── i18n/            # 國際化設定
│   └── types.ts         # TypeScript 型別定義
├── assets/              # 靜態資源
└── package.json         # 專案配置
```

## 📄 授權 (License)

本專案採用 [MIT License](LICENSE) 授權。
