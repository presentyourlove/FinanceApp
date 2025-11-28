import * as SQLite from 'expo-sqlite';

// 建立資料庫連線 (同步/非同步混合處理)
// Expo SQLite 新版 API 行為：openDatabaseSync
const db = SQLite.openDatabaseSync('finance_app.db');

// 輔助：執行 SQL (無回傳值)
const runSqlSync = (sql: string, params: any[] = []) => {
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
const getRowsSync = (sql: string, params: any[] = []) => {
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
// 1. 初始化資料庫
// ===================================================
export const initDatabase = async () => {
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
    // 新增 period 欄位: 'monthly', 'weekly', 'yearly'
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly'
      );
    `);

    // 建立存錢目標表 (Goals)
    runSqlSync(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        targetAmount REAL NOT NULL,
        currentAmount REAL DEFAULT 0,
        deadline TEXT
      );
    `);

    // 檢查是否需要插入預設資料
    const resAccounts = getRowsSync(`SELECT COUNT(id) as count FROM accounts;`) as any[];
    const countAccounts = resAccounts && resAccounts.length > 0 ? resAccounts[0].count : 0;

    if (countAccounts === 0) {
      console.log("No initial accounts found. Inserting default data...");
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
      console.log("Default accounts inserted.");
    }

    // 2. 檢查預算 (Budgets)
    const resBudgets = getRowsSync(`SELECT COUNT(id) as count FROM budgets;`) as any[];
    const countBudgets = resBudgets && resBudgets.length > 0 ? resBudgets[0].count : 0;

    if (countBudgets === 0) {
      console.log("No initial budgets found. Inserting default data...");
      runSqlSync(
        `INSERT INTO budgets (category, amount, period) VALUES (?, ?, ?);`,
        ['餐飲', 6000, 'monthly']
      );
      console.log("Default budget inserted.");
    }

    // 3. 檢查存錢目標 (Goals)
    const resGoals = getRowsSync(`SELECT COUNT(id) as count FROM goals;`) as any[];
    const countGoals = resGoals && resGoals.length > 0 ? resGoals[0].count : 0;

    if (countGoals === 0) {
      console.log("No initial goals found. Inserting default data...");
      runSqlSync(
        `INSERT INTO goals (name, targetAmount, currentAmount, deadline) VALUES (?, ?, ?, ?);`,
        ['新手機', 30000, 5000, '2025-12-31']
      );
      console.log("Default goal inserted.");
    }

  } catch (error) {
    console.error("Error checking/inserting initial data:", error);
  }
};


// ===================================================
// 2. 資料庫 CRUD 操作
// ===================================================

interface Account {
  id: number;
  name: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
}

interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  date: string; // 存為字串
  description: string;
  accountId: number;
  targetAccountId?: number;
}

export interface Budget {
  id: number;
  category: string;
  amount: number;
  period: string;
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}


/**
 * 讀取所有帳本
 */
export const getAccounts = async (): Promise<Account[]> => {
  // 返回行陣列
  const rows = getRowsSync('SELECT * FROM accounts ORDER BY id ASC;') as any[];

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    initialBalance: row.initialBalance,
    currentBalance: row.currentBalance,
    currency: row.currency || 'TWD',
  }));
};

/**
 * 更新帳本餘額
 */
export const updateAccountBalanceDB = async (id: number, newBalance: number) => {
  runSqlSync(
    `UPDATE accounts SET currentBalance = ? WHERE id = ?;`,
    [newBalance, id]
  );
};

/**
 * 新增交易記錄
 */
export const addTransactionDB = async (t: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
  const dateString = t.date.toISOString();

  const res = runSqlSync(
    `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
     VALUES (?, ?, ?, ?, ?, ?);`,
    [t.amount, t.type, dateString, t.description, t.accountId, t.targetAccountId]
  );
  // runSync 的結果物件中包含 lastInsertRowId
  return res && res.lastInsertRowId || Date.now();
};

/**
 * 更新交易記錄
 */
export const updateTransactionDB = async (id: number, amount: number, type: 'income' | 'expense' | 'transfer', date: Date, description: string) => {
  const dateString = date.toISOString();
  runSqlSync(
    `UPDATE transactions SET amount = ?, type = ?, date = ?, description = ? WHERE id = ?;`,
    [amount, type, dateString, description, id]
  );
};

/**
 * 刪除交易記錄
 */
export const deleteTransactionDB = async (id: number) => {
  runSqlSync(`DELETE FROM transactions WHERE id = ?;`, [id]);
};

/**
 * 執行轉帳交易
 * 同時新增交易記錄並更新兩個帳戶的餘額
 */
export const performTransfer = async (fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string) => {
  const dateString = date.toISOString();

  // 1. 新增轉帳交易
  runSqlSync(
    `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
     VALUES (?, 'transfer', ?, ?, ?, ?);`,
    [amount, dateString, description, fromAccountId, toAccountId]
  );

  // 2. 更新轉出帳戶餘額 (減少)
  const fromAccountRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [fromAccountId]) as any[];
  if (fromAccountRows && fromAccountRows.length > 0) {
    const newFromBalance = fromAccountRows[0].currentBalance - amount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newFromBalance, fromAccountId]);
  }

  // 3. 更新轉入帳戶餘額 (增加)
  const toAccountRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [toAccountId]) as any[];
  if (toAccountRows && toAccountRows.length > 0) {
    const newToBalance = toAccountRows[0].currentBalance + amount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newToBalance, toAccountId]);
  }
};

/**
 * 更新轉帳交易
 * 同時更新交易記錄並調整相關帳戶的餘額
 */
export const updateTransfer = async (
  transactionId: number,
  oldFromAccountId: number,
  oldToAccountId: number,
  oldAmount: number,
  newFromAccountId: number,
  newToAccountId: number,
  newAmount: number,
  newDate: Date,
  newDescription: string
) => {
  const dateString = newDate.toISOString();
  // 1. 恢復舊轉帳的餘額影響
  // 舊轉出帳戶：加回原金額
  const oldFromRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [oldFromAccountId]) as any[];
  if (oldFromRows && oldFromRows.length > 0) {
    const restoredBalance = oldFromRows[0].currentBalance + oldAmount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [restoredBalance, oldFromAccountId]);
  }
  // 舊轉入帳戶：減去原金額
  const oldToRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [oldToAccountId]) as any[];
  if (oldToRows && oldToRows.length > 0) {
    const restoredBalance = oldToRows[0].currentBalance - oldAmount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [restoredBalance, oldToAccountId]);
  }
  // 2. 更新交易記錄
  runSqlSync(
    `UPDATE transactions SET amount = ?, date = ?, description = ?, accountId = ?, targetAccountId = ? WHERE id = ?;`,
    [newAmount, dateString, newDescription, newFromAccountId, newToAccountId, transactionId]
  );
  // 3. 應用新轉帳的餘額影響
  // 新轉出帳戶：減去新金額
  const newFromRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [newFromAccountId]) as any[];
  if (newFromRows && newFromRows.length > 0) {
    const newBalance = newFromRows[0].currentBalance - newAmount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, newFromAccountId]);
  }
  // 新轉入帳戶：加上新金額
  const newToRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [newToAccountId]) as any[];
  if (newToRows && newToRows.length > 0) {
    const newBalance = newToRows[0].currentBalance + newAmount;
    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, newToAccountId]);
  }
};

/**
 * 讀取特定帳本的交易記錄
 */
export const getTransactionsByAccountDB = async (accountId: number): Promise<Transaction[]> => {
  // 返回行陣列
  const rows = getRowsSync(
    `SELECT * FROM transactions WHERE accountId = ? OR targetAccountId = ? ORDER BY date DESC;`,
    [accountId, accountId]
  ) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    amount: row.amount,
    type: row.type as Transaction['type'],
    date: row.date,
    description: row.description,
    accountId: row.accountId,
    targetAccountId: row.targetAccountId || undefined,
  }));
};

/**
 * 新增一個帳本
 */
export const addAccountDB = async (name: string, initialBalance: number, currency: string = 'TWD') => {
  const res = runSqlSync(
    `INSERT INTO accounts (name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?);`,
    [name, initialBalance, initialBalance, currency]
  );
  return res && res.lastInsertRowId || Date.now();
};

/**
 * 刪除一個帳本 
 */
export const deleteAccountDB = async (id: number) => {
  // 檢查是否有相關交易 (檢查 accountId 或 targetAccountId)
  const transactionCheck = getRowsSync(
    `SELECT COUNT(id) as count FROM transactions WHERE accountId = ? OR targetAccountId = ?;`,
    [id, id]
  ) as any[];
  // 修正：transactionCheck 是行陣列
  const count = transactionCheck && transactionCheck.length > 0 ? transactionCheck[0].count : 0;

  if (count > 0) {
    throw new Error("Account has transactions and cannot be deleted.");
  }

  runSqlSync(
    `DELETE FROM accounts WHERE id = ?;`,
    [id]
  );
};

// --- 預算操作 ---

export const getBudgets = async (): Promise<Budget[]> => {
  const rows = getRowsSync('SELECT * FROM budgets;') as any[];
  return rows.map((row: any) => ({
    id: row.id,
    category: row.category,
    amount: row.amount,
    period: row.period,
  }));
};

export const addBudget = async (category: string, amount: number, period: string = 'monthly') => {
  const res = runSqlSync(
    `INSERT INTO budgets (category, amount, period) VALUES (?, ?, ?);`,
    [category, amount, period]
  );
  return res && res.lastInsertRowId;
};

export const updateBudget = async (id: number, category: string, amount: number, period: string) => {
  runSqlSync(`UPDATE budgets SET category = ?, amount = ?, period = ? WHERE id = ?;`, [category, amount, period, id]);
};

export const deleteBudget = async (id: number) => {
  runSqlSync(`DELETE FROM budgets WHERE id = ?;`, [id]);
};

// --- 存錢目標操作 ---

export const getGoals = async (): Promise<Goal[]> => {
  const rows = getRowsSync('SELECT * FROM goals;') as any[];
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    targetAmount: row.targetAmount,
    currentAmount: row.currentAmount,
    deadline: row.deadline,
  }));
};

export const addGoal = async (name: string, targetAmount: number, deadline?: string) => {
  const res = runSqlSync(
    `INSERT INTO goals (name, targetAmount, currentAmount, deadline) VALUES (?, ?, 0, ?);`,
    [name, targetAmount, deadline || null]
  );
  return res && res.lastInsertRowId;
};

export const updateGoalAmount = async (id: number, currentAmount: number) => {
  runSqlSync(`UPDATE goals SET currentAmount = ? WHERE id = ?;`, [currentAmount, id]);
};

export const updateGoal = async (id: number, name: string, targetAmount: number, deadline?: string) => {
  runSqlSync(
    `UPDATE goals SET name = ?, targetAmount = ?, deadline = ? WHERE id = ?;`,
    [name, targetAmount, deadline || null, id]
  );
};

export const deleteGoal = async (id: number) => {
  runSqlSync(`DELETE FROM goals WHERE id = ?;`, [id]);
};

// --- 統計與輔助查詢 ---

/**
 * 取得指定月份的各類別支出統計
 * @param year 西元年 (例如 2023)
 * @param month 月份 (1-12)
 * @returns 物件 { "餐飲": 5000, "交通": 1200 }
 */
export const getCategorySpending = async (year: number, month: number): Promise<{ [key: string]: number }> => {
  const targetMonthStr = `${year}-${month.toString().padStart(2, '0')}`;

  const rows = getRowsSync(
    `SELECT description as category, SUM(amount) as total 
     FROM transactions 
     WHERE type = 'expense' AND strftime('%Y-%m', date) = ?
     GROUP BY description;`,
    [targetMonthStr]
  ) as any[];

  const result: { [key: string]: number } = {};
  rows.forEach((row: any) => {
    if (row.category) {
      result[row.category] = row.total;
    }
  });
  return result;
};

/**
 * 取得所有已使用的支出類別
 */
export const getDistinctCategories = async (): Promise<string[]> => {
  const rows = getRowsSync(
    `SELECT DISTINCT description FROM transactions WHERE type = 'expense' ORDER BY description;`
  ) as any[];
  return rows.map((row: any) => row.description).filter((d: string) => d);
};

// 匯出所有公開操作
export const dbOperations = {
  initDatabase,
  getAccounts,
  updateAccountBalanceDB,
  addTransactionDB,
  updateTransactionDB,
  deleteTransactionDB,
  performTransfer,
  updateTransfer,
  getTransactionsByAccountDB,
  addAccountDB,
  deleteAccountDB,
  // Budgets
  getBudgets,
  addBudget,
  updateBudget,
  deleteBudget,
  // Goals
  getGoals,
  addGoal,
  updateGoalAmount,
  updateGoal,
  deleteGoal,
  // Stats
  getCategorySpending,
  getDistinctCategories,
  // 為了方便除錯，可以新增清除所有數據的函數
  clearAllData: async () => {
    runSqlSync(`DROP TABLE IF EXISTS transactions;`);
    runSqlSync(`DROP TABLE IF EXISTS accounts;`);
    runSqlSync(`DROP TABLE IF EXISTS budgets;`);
    runSqlSync(`DROP TABLE IF EXISTS goals;`);
    await initDatabase();
  }
};