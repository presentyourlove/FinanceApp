import * as SQLite from 'expo-sqlite';

// 建立資料庫連線 (同步/非同步混合處理)
// Expo SQLite 新版 API 行為：openDatabaseSync
const db = SQLite.openDatabaseSync('finance_app.db');

// 輔助：執行 SQL (無回傳值)
export const runSqlSync = (sql: string, params: any[] = []) => {
  try {
    const statement = db.prepareSync(sql);
    const result = statement.executeSync(params);
    // result 包含 lastInsertRowId, changes 等
    return result;
  } catch (error) {
    console.error(`Error running SQL: ${sql}`, error);
    throw error;
  }
};

// 輔助：查詢 SQL (回傳單一結果或列表)
export const getRowsSync = (sql: string, params: any[] = []) => {
  try {
    const statement = db.prepareSync(sql);
    const result = statement.executeSync(params);
    const allRows = result.getAllSync();
    return allRows;
  } catch (error) {
    console.error(`Error querying SQL: ${sql}`, error);
    throw error;
  }
};

// ===================================================
// Observer Pattern for Data Changes
// ===================================================
type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];

export const addDataChangeListener = (listener: DataChangeListener) => {
  if (!listeners.includes(listener)) {
    listeners.push(listener);
  }
};

export const removeDataChangeListener = (listener: DataChangeListener) => {
  const index = listeners.indexOf(listener);
  if (index > -1) {
    listeners.splice(index, 1);
  }
};

export const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// ===================================================
// 1. 初始化資料庫
// ===================================================
export const initDatabase = async (skipDefaultData: boolean = false) => {
  try {
    // 啟用外鍵約束
    runSqlSync('PRAGMA foreign_keys = ON;');

    // 建立帳本表 (Accounts)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        initialBalance REAL NOT NULL,
        currentBalance REAL NOT NULL,
        currency TEXT DEFAULT 'TWD'
      );
    `);

    // 建立交易表 (Transactions)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        type TEXT NOT NULL, -- 'income', 'expense', 'transfer'
        date TEXT NOT NULL,
        description TEXT,
        accountId INTEGER NOT NULL,
        targetAccountId INTEGER, -- 用於轉帳
        FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
      );
    `);

    // 建立預算表 (Budgets)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly',
        currency TEXT DEFAULT 'TWD'
      );
    `);

    // 建立存錢目標表 (Goals)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        targetAmount REAL NOT NULL,
        currentAmount REAL DEFAULT 0,
        deadline TEXT,
        currency TEXT DEFAULT 'TWD'
      );
    `);

    // --- Migration: Add currency column if missing ---
    try {
      const budgetCols = getRowsSync("PRAGMA table_info(budgets);") as any[];
      if (!budgetCols.some(col => col.name === 'currency')) {
        runSqlSync("ALTER TABLE budgets ADD COLUMN currency TEXT DEFAULT 'TWD';");
        console.info("Added currency column to budgets table.");
      }
    } catch (e) {
      console.error("Error migrating budgets table:", e);
    }

    try {
      const goalCols = getRowsSync("PRAGMA table_info(goals);") as any[];
      if (!goalCols.some(col => col.name === 'currency')) {
        runSqlSync("ALTER TABLE goals ADD COLUMN currency TEXT DEFAULT 'TWD';");
        console.info("Added currency column to goals table.");
      }
    } catch (e) {
      console.error("Error migrating goals table:", e);
    }
    // -------------------------------------------------

    // 建立投資表 (Investments)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS investments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'stock', 'fixed_deposit', 'savings'
        amount REAL NOT NULL,
        costPrice REAL, -- Total Cost for stock
        currentPrice REAL, -- Unit Price for stock
        currency TEXT DEFAULT 'TWD',
        date TEXT NOT NULL,
        maturityDate TEXT,
        interestRate REAL,
        interestFrequency TEXT, -- 'daily', 'monthly', 'yearly'
        handlingFee REAL,
        purchaseMethod TEXT,
        notes TEXT,
        sourceAccountId INTEGER,
        linkedTransactionId INTEGER,
        status TEXT DEFAULT 'active' -- 'active', 'sold', 'closed'
      );
    `);


    // 檢查是否需要插入預設資料
    if (!skipDefaultData) {
      const resAccounts = getRowsSync(`SELECT COUNT(id) as count FROM accounts;`) as any[];
      const countAccounts = resAccounts && resAccounts.length > 0 ? resAccounts[0].count : 0;

      if (countAccounts === 0) {
        console.info("No initial accounts found. Inserting default data...");
        const initialAccounts = [
          { name: '錢包', initialBalance: 500, currentBalance: 500, currency: 'TWD' },
          { name: '銀行戶口', initialBalance: 50000, currentBalance: 50000, currency: 'TWD' },
          { name: '信用卡', initialBalance: 0, currentBalance: 0, currency: 'TWD' },
        ];
        for (const acc of initialAccounts) {
          runSqlSync(
            `INSERT INTO accounts (name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?);`,
            [acc.name, acc.initialBalance, acc.currentBalance, acc.currency]
          );
        }
        console.info("Default accounts inserted.");
      }

      // 2. 檢查預算 (Budgets)
      const resBudgets = getRowsSync(`SELECT COUNT(id) as count FROM budgets;`) as any[];
      const countBudgets = resBudgets && resBudgets.length > 0 ? resBudgets[0].count : 0;

      if (countBudgets === 0) {
        console.info("No initial budgets found. Inserting default data...");
        runSqlSync(
          `INSERT INTO budgets (category, amount, period, currency) VALUES (?, ?, ?, ?);`,
          ['餐飲', 6000, 'monthly', 'TWD']
        );
        console.info("Default budget inserted.");
      }

      // 3. 檢查存錢目標 (Goals)
      const resGoals = getRowsSync(`SELECT COUNT(id) as count FROM goals;`) as any[];
      const countGoals = resGoals && resGoals.length > 0 ? resGoals[0].count : 0;

      if (countGoals === 0) {
        console.info("No initial goals found. Inserting default data...");
        runSqlSync(
          `INSERT INTO goals (name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, ?, ?, ?);`,
          ['新手機', 30000, 5000, '2025-12-31', 'TWD']
        );
        console.info("Default goal inserted.");
      }
    }

  } catch (error) {
    console.error("Error checking/inserting initial data:", error);
  }
};
