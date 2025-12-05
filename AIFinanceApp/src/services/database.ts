import * as SQLite from 'expo-sqlite';
import { Account, Transaction, Budget, Goal, Investment, TransactionType } from '@/src/types';

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
        console.log("Added currency column to budgets table.");
      }
    } catch (e) {
      console.error("Error migrating budgets table:", e);
    }

    try {
      const goalCols = getRowsSync("PRAGMA table_info(goals);") as any[];
      if (!goalCols.some(col => col.name === 'currency')) {
        runSqlSync("ALTER TABLE goals ADD COLUMN currency TEXT DEFAULT 'TWD';");
        console.log("Added currency column to goals table.");
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
          `INSERT INTO budgets (category, amount, period, currency) VALUES (?, ?, ?, ?);`,
          ['餐飲', 6000, 'monthly', 'TWD']
        );
        console.log("Default budget inserted.");
      }

      // 3. 檢查存錢目標 (Goals)
      const resGoals = getRowsSync(`SELECT COUNT(id) as count FROM goals;`) as any[];
      const countGoals = resGoals && resGoals.length > 0 ? resGoals[0].count : 0;

      if (countGoals === 0) {
        console.log("No initial goals found. Inserting default data...");
        runSqlSync(
          `INSERT INTO goals (name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, ?, ?, ?);`,
          ['新手機', 30000, 5000, '2025-12-31', 'TWD']
        );
        console.log("Default goal inserted.");
      }
    }

  } catch (error) {
    console.error("Error checking/inserting initial data:", error);
  }
};


// ===================================================
// 2. 資料庫 CRUD 操作
// ===================================================

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
export const updateTransactionDB = async (id: number, amount: number, type: TransactionType, date: Date, description: string) => {
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
     VALUES (?, '${TransactionType.TRANSFER}', ?, ?, ?, ?);`,
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
 * 取得包含帳戶資訊的交易記錄 (支援日期範圍過濾)
 * 優化：使用 JOIN 一次取得幣別資訊，並支援 SQL 層級的日期過濾
 */
export const getTransactionsWithAccount = async (startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> => {
  let sql = `
    SELECT t.*, a.currency as accountCurrency 
    FROM transactions t 
    JOIN accounts a ON t.accountId = a.id 
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (startDate) {
    conditions.push(`date(t.date) >= date(?)`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`date(t.date) <= date(?)`);
    params.push(endDate);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY t.date DESC;`;

  const rows = getRowsSync(sql, params) as any[];

  return rows.map((row: any) => ({
    id: row.id,
    amount: row.amount,
    type: row.type as Transaction['type'],
    date: row.date,
    description: row.description,
    accountId: row.accountId,
    targetAccountId: row.targetAccountId || undefined,
    accountCurrency: row.accountCurrency || 'TWD',
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
    currency: row.currency || 'TWD',
  }));
};

export const addBudget = async (category: string, amount: number, period: string = 'monthly', currency: string = 'TWD') => {
  const res = runSqlSync(
    `INSERT INTO budgets (category, amount, period, currency) VALUES (?, ?, ?, ?);`,
    [category, amount, period, currency]
  );
  return res && res.lastInsertRowId;
};

export const updateBudget = async (id: number, category: string, amount: number, period: string, currency: string) => {
  runSqlSync(`UPDATE budgets SET category = ?, amount = ?, period = ?, currency = ? WHERE id = ?;`, [category, amount, period, currency, id]);
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
    currency: row.currency || 'TWD',
  }));
};

export const addGoal = async (name: string, targetAmount: number, deadline: string | undefined = undefined, currency: string = 'TWD') => {
  const res = runSqlSync(
    `INSERT INTO goals (name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, 0, ?, ?);`,
    [name, targetAmount, deadline || null, currency]
  );
  return res && res.lastInsertRowId;
};

export const updateGoalAmount = async (id: number, currentAmount: number) => {
  runSqlSync(`UPDATE goals SET currentAmount = ? WHERE id = ?;`, [currentAmount, id]);
};

export const updateGoal = async (id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD') => {
  runSqlSync(
    `UPDATE goals SET name = ?, targetAmount = ?, deadline = ?, currency = ? WHERE id = ?;`,
    [name, targetAmount, deadline || null, currency, id]
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
     WHERE type = '${TransactionType.EXPENSE}' AND strftime('%Y-%m', date) = ?
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
    `SELECT DISTINCT description FROM transactions WHERE type = '${TransactionType.EXPENSE}' ORDER BY description;`
  ) as any[];
  return rows.map((row: any) => row.description).filter((d: string) => d);
};

// --- 投資功能 (Investments) ---

export const addInvestment = async (
  data: Omit<Investment, 'id' | 'status'>,
  syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }
) => {
  const {
    name, type, amount, costPrice, currentPrice, currency, date,
    maturityDate, interestRate, interestFrequency, handlingFee,
    purchaseMethod, notes
  } = data;

  let linkedTransactionId: number | undefined = undefined;

  // 1. 同步記帳邏輯
  if (syncOptions.syncToTransaction && syncOptions.sourceAccountId) {
    let totalExpense = 0;
    if (type === 'stock') {
      totalExpense = (costPrice || 0) + (handlingFee || 0);
    } else {
      totalExpense = amount + (handlingFee || 0);
    }

    if (totalExpense > 0) {
      const transId = await addTransactionDB({
        amount: totalExpense,
        type: TransactionType.EXPENSE,
        date: new Date(date),
        description: `投資: ${name}`,
        accountId: syncOptions.sourceAccountId,
      });
      linkedTransactionId = transId;

      const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.sourceAccountId]) as any[];
      if (accRows && accRows.length > 0) {
        const newBalance = accRows[0].currentBalance - totalExpense;
        runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.sourceAccountId]);
      }
    }
  }

  // 2. 新增投資紀錄
  const res = runSqlSync(
    `INSERT INTO investments (
      name, type, amount, costPrice, currentPrice, currency, date,
      maturityDate, interestRate, interestFrequency, handlingFee,
      purchaseMethod, notes, sourceAccountId, linkedTransactionId, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active');`,
    [
      name, type, amount, costPrice, currentPrice, currency, date,
      maturityDate, interestRate, interestFrequency, handlingFee,
      purchaseMethod, notes, syncOptions.sourceAccountId, linkedTransactionId
    ]
  );
  return res && res.lastInsertRowId;
};

export const getInvestments = async (): Promise<Investment[]> => {
  const rows = getRowsSync(`SELECT * FROM investments WHERE status = 'active' ORDER BY date DESC;`) as any[];
  return rows.map((row: any) => ({
    ...row,
    amount: Number(row.amount),
    costPrice: row.costPrice ? Number(row.costPrice) : undefined,
    currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
    interestRate: row.interestRate ? Number(row.interestRate) : undefined,
    handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
  }));
};

export const updateInvestment = async (id: number, data: Partial<Investment>) => {
  const fields = Object.keys(data).filter(k => k !== 'id');
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => (data as any)[f]);

  runSqlSync(`UPDATE investments SET ${setClause} WHERE id = ?;`, [...values, id]);
};

export const processInvestmentAction = async (
  id: number,
  actionType: 'sell' | 'close' | 'withdraw',
  data: {
    amount?: number;
    returnAmount?: number;
    date: string;
  },
  syncOptions: { syncToTransaction: boolean; targetAccountId?: number }
) => {
  const rows = getRowsSync(`SELECT * FROM investments WHERE id = ?;`, [id]) as any[];
  if (!rows || rows.length === 0) throw new Error("Investment not found");
  const inv = rows[0];

  let newStatus = inv.status;
  let newAmount = inv.amount;

  if (inv.type === 'stock' && actionType === 'sell') {
    const sellShares = data.amount || 0;
    newAmount = inv.amount - sellShares;
    if (newAmount <= 0) {
      newAmount = 0;
      newStatus = 'sold';
    }
    runSqlSync(`UPDATE investments SET amount = ?, status = ? WHERE id = ?;`, [newAmount, newStatus, id]);

  } else if (actionType === 'close' || actionType === 'withdraw') {
    if (inv.type === 'fixed_deposit') {
      newStatus = 'closed';
      newAmount = 0;
    } else if (inv.type === 'savings') {
      const withdrawAmount = data.amount || 0;
      newAmount = inv.amount - withdrawAmount;
      if (newAmount <= 0) {
        newAmount = 0;
        newStatus = 'closed';
      }
    }
    runSqlSync(`UPDATE investments SET amount = ?, status = ? WHERE id = ?;`, [newAmount, newStatus, id]);
  }

  if (syncOptions.syncToTransaction && syncOptions.targetAccountId && data.returnAmount && data.returnAmount > 0) {
    await addTransactionDB({
      amount: data.returnAmount,
      type: TransactionType.INCOME,
      date: new Date(data.date),
      description: `投資回收: ${inv.name} (${actionType})`,
      accountId: syncOptions.targetAccountId,
    });

    const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.targetAccountId]) as any[];
    if (accRows && accRows.length > 0) {
      const newBalance = accRows[0].currentBalance + data.returnAmount;
      runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.targetAccountId]);
    }
  }
};

const updateStockPrice = async (name: string, price: number) => {
  runSqlSync(`UPDATE investments SET currentPrice = ? WHERE name = ? AND type = 'stock' AND status = 'active';`, [price, name]);
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
  getTransactionsWithAccount,
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
  // Investments
  addInvestment,
  getInvestments,
  updateInvestment,
  processInvestmentAction,
  updateStockPrice,
  // 為了方便除錯，可以新增清除所有數據的函數
  clearAllData: async () => {
    runSqlSync(`DROP TABLE IF EXISTS transactions;`);
    runSqlSync(`DROP TABLE IF EXISTS accounts;`);
    runSqlSync(`DROP TABLE IF EXISTS budgets;`);
    runSqlSync(`DROP TABLE IF EXISTS goals;`);
    runSqlSync(`DROP TABLE IF EXISTS investments;`);
    await initDatabase(true);
  },
  // Backup helpers
  getAllTransactionsDB: async () => {
    const rows = getRowsSync(`SELECT * FROM transactions;`) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      amount: row.amount,
      type: row.type,
      date: row.date,
      description: row.description,
      accountId: row.accountId,
      targetAccountId: row.targetAccountId
    }));
  },
  getAllInvestmentsDB: async () => {
    const rows = getRowsSync(`SELECT * FROM investments;`) as any[];
    return rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      costPrice: row.costPrice ? Number(row.costPrice) : undefined,
      currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
      interestRate: row.interestRate ? Number(row.interestRate) : undefined,
      handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
    }));
  },
  // Import helpers (Preserve IDs)
  importAccountDB: async (acc: any) => {
    runSqlSync(
      `INSERT INTO accounts (id, name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?, ?);`,
      [acc.id, acc.name, acc.initialBalance, acc.currentBalance, acc.currency]
    );
  },
  importTransactionDB: async (t: any) => {
    runSqlSync(
      `INSERT INTO transactions (id, amount, type, date, description, accountId, targetAccountId) 
    VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [t.id, t.amount, t.type, t.date, t.description, t.accountId, t.targetAccountId]
    );
  },
  importBudgetDB: async (b: any) => {
    runSqlSync(
      `INSERT INTO budgets (id, category, amount, period, currency) VALUES (?, ?, ?, ?, ?);`,
      [b.id, b.category, b.amount, b.period, b.currency]
    );
  },
  importGoalDB: async (g: any) => {
    runSqlSync(
      `INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, ?, ?, ?, ?);`,
      [g.id, g.name, g.targetAmount, g.currentAmount, g.deadline, g.currency]
    );
  },
  importInvestmentDB: async (inv: any) => {
    runSqlSync(
      `INSERT INTO investments (
      id, name, type, amount, costPrice, currentPrice, currency, date,
      maturityDate, interestRate, interestFrequency, handlingFee,
      purchaseMethod, notes, sourceAccountId, linkedTransactionId, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        inv.id, inv.name, inv.type, inv.amount, inv.costPrice, inv.currentPrice, inv.currency, inv.date,
        inv.maturityDate, inv.interestRate, inv.interestFrequency, inv.handlingFee,
        inv.purchaseMethod, inv.notes, inv.sourceAccountId, inv.linkedTransactionId, inv.status
      ]
    );
  }
};
// Re-export types for convenience
export type { Account, Transaction, Budget, Goal, Investment } from '@/src/types';
