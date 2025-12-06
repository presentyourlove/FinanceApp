# AIFinanceApp - 智慧理財助手

AIFinanceApp 是一個基於 React Native 與 Expo 開發的現代化智慧理財應用程式。透過直觀的介面與強大的功能，協助使用者輕鬆追蹤收支、規劃預算、設定存錢目標，並透過圖表分析財務狀況。支援雲端同步，確保您的財務數據安全無虞。

## ✨ 主要功能 (Features)

### 1. 📝 記帳 (Transactions)

* **收支記錄**：快速記錄每日收入與支出，支援多種分類。
* **轉帳功能**：支援帳戶間的資金轉移。
* **智慧篩選**：可按「今日」、「本月」、「本年」及「全部」快速篩選交易紀錄。

### 2. 💰 預算 (Budgets)

* **預算設定**：針對不同類別（如餐飲、交通）設定每月預算。
* **進度追蹤**：即時顯示預算使用百分比，避免超支。

### 3. 🎯 規劃 (Planning)

* **存錢目標**：設定具體的存錢目標（如買車、旅遊），追蹤達成進度。
* **投資追蹤**：記錄股票、定存等投資項目，掌握資產增值狀況。

### 4. 📊 分析 (Analysis)

* **圖表分析**：提供圓餅圖與長條圖，清晰呈現資金流向與消費結構。
* **趨勢洞察**：分析長期財務趨勢，協助做出更好的財務決策。

### 5. ⚙️ 設定 (Settings)

* **雲端同步**：整合 Firebase，支援資料備份與還原，跨裝置無縫接軌。
* **個人化**：支援深色模式 (Dark Mode) 與多種主題色系。
* **匯出功能**：支援匯出交易記錄為 CSV 格式。

## 🛠️ 技術堆疊 (Tech Stack)

* **核心框架**: [React Native](https://reactnative.dev/) (v0.76), [Expo](https://expo.dev/) (v52)
* **語言**: [TypeScript](https://www.typescriptlang.org/)
* **路由管理**: [Expo Router](https://docs.expo.dev/router/introduction/)
* **本地資料庫**: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
* **雲端服務**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
* **圖表套件**: [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
* **UI 元件**: React Native Elements, Expo Vector Icons

## 📋 環境需求 (Prerequisites)

* **Node.js**: 建議 v20.0.0 或以上版本。
* **npm** 或 **yarn**: 套件管理工具。
* **Expo Go**: 請在您的 iOS 或 Android 手機上下載 Expo Go App 以進行測試。

## 🚀 安裝與執行 (Installation & Setup)

1. **複製專案 (Clone Repository)**

    ```bash
    git clone https://github.com/presentyourlove/AIFinanceApp.git
    cd AIFinanceApp/AIFinanceApp
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

    ```bash
    npx eas-cli build --platform android --profile apk
    ```

    打包後，您可以在 `AIFinanceApp` 目錄下找到生成的 APK 檔案。

## 📂 專案結構 (Project Structure)

```text
AIFinanceApp/            # 專案根目錄
├── AIFinanceApp/        # 應用程式原始碼 (Expo Project)
│   ├── app/             # Expo Router 頁面路由
│   │   ├── (tabs)/      # 底部導航頁籤 (index, budget, planning, analysis, settings)
│   │   └── _layout.tsx  # 全域佈局設定
│   ├── src/
│   │   ├── components/  # 可重用 UI 元件 (按功能分類)
│   │   │   ├── transaction/ # 記帳相關元件
│   │   │   ├── common/  # 通用元件
│   │   │   └── ...
│   │   ├── services/    # 外部服務與資料庫邏輯
│   │   │   ├── database.ts  # SQLite 資料庫操作
│   │   │   ├── firebaseConfig.ts # Firebase 設定
│   │   │   └── sync.ts  # 雲端同步邏輯
│   │   ├── utils/       # 工具函式 (格式化、儲存輔助)
│   │   └── types.ts     # TypeScript 型別定義
│   ├── assets/          # 靜態資源 (圖片、字型)
│   └── package.json     # 專案設定與相依套件
└── README.md            # 專案說明文件
```

## 📄 授權 (License)

本專案採用 [MIT License](LICENSE) 授權。
