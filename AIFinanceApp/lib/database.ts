import * as SQLite from 'expo-sqlite';

// 建立或開啟資料庫 (使用同步 API: openDatabaseSync)
const db = SQLite.openDatabaseSync('finance_app.db');

// ===================================================
// 1. 資料庫底層操作 (同步執行)
// ===================================================

/**
 * 執行 INSERT, UPDATE, DELETE 語句 (沒有結果集返回，但有 insertId)
 * @param sql 要執行的 SQL 語句
 * @param params 參數陣列
 * @returns 包含 insertId 或 changes 的結果物件 (類型為 any)
 */
const runSqlSync = (sql: string, params: any[] = []): any => { 
  try {
    // 使用 runSync 執行單條 SQL 語句
    return db.runSync(sql, params);
  } catch (error) {
    console.error(`SQL Run Sync Error (${sql}):`, error);
    throw error;
  }
};

/**
 * 執行 SELECT 查詢語句 (返回結果集)
 * @param sql 要執行的 SQL 語句
 * @param params 參數陣列
 * @returns 包含 rows 的結果物件 (類型為 any)
 */
const getRowsSync = (sql: string, params: any[] = []): any[] => {
  try {
    // 使用 getAllSync 執行查詢並返回結果行陣列
    return db.getAllSync(sql, params);
  } catch (error) {
    console.error(`SQL Get Rows Sync Error (${sql}):`, error);
    throw error;
  }
};


/**
 * 初始化資料庫，建立表格。
 */
export const initDatabase = async () => {
  try {
    // 帳本表格 (accounts)
    runSqlSync(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY NOT NULL, 
        name TEXT NOT NULL, 
        initialBalance REAL NOT NULL, 
        currentBalance REAL NOT NULL
      );`
    );

    // 交易表格 (transactions)
    runSqlSync(
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY NOT NULL, 
        amount REAL NOT NULL, 
        type TEXT NOT NULL, 
        date TEXT NOT NULL, 
        description TEXT, 
        accountId INTEGER NOT NULL,
        targetAccountId INTEGER,
        FOREIGN KEY(accountId) REFERENCES accounts(id)
      );`
    );

    console.log("Database initialized successfully (Sync Mode).");
    
    // 檢查並插入初始數據
    await checkAndInsertInitialData();

  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};


/**
 * 檢查 accounts 表中是否有數據，如果沒有，則插入預設帳本。
 */
const checkAndInsertInitialData = async () => {
  try {
    // 執行查詢並返回結果行陣列
    const res = getRowsSync(`SELECT COUNT(id) as count FROM accounts;`);
    
    // 修正：res 現在是行陣列，不再需要 .rows 屬性
    const count = res && res.length > 0 ? res[0].count : 0;

    if (count === 0) {
      console.log("No initial accounts found. Inserting default data...");
      
      const initialAccounts = [
        { name: '錢包', initialBalance: 500, currentBalance: 500 },
        { name: '銀行戶口', initialBalance: 50000, currentBalance: 50000 },
        { name: '信用卡', initialBalance: 0, currentBalance: 0 },
      ];
      
      for (const acc of initialAccounts) {
        runSqlSync(
          `INSERT INTO accounts (name, initialBalance, currentBalance) VALUES (?, ?, ?);`,
          [acc.name, acc.initialBalance, acc.currentBalance]
        );
      }
      console.log("Default accounts inserted.");
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


/**
 * 讀取所有帳本
 */
export const getAccounts = async (): Promise<Account[]> => {
  // 返回行陣列
  const rows = getRowsSync('SELECT * FROM accounts ORDER BY id ASC;');
  
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    initialBalance: row.initialBalance,
    currentBalance: row.currentBalance,
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
 * 讀取特定帳本的交易記錄
 */
export const getTransactionsByAccountDB = async (accountId: number): Promise<Transaction[]> => {
  // 返回行陣列
  const rows = getRowsSync(
    `SELECT * FROM transactions WHERE accountId = ? OR targetAccountId = ? ORDER BY date DESC;`,
    [accountId, accountId]
  );
  
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
export const addAccountDB = async (name: string, initialBalance: number) => {
  const res = runSqlSync(
    `INSERT INTO accounts (name, initialBalance, currentBalance) VALUES (?, ?, ?);`,
    [name, initialBalance, initialBalance]
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
    );
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

// 匯出所有公開操作
export const dbOperations = {
  initDatabase,
  getAccounts,
  updateAccountBalanceDB,
  addTransactionDB,
  getTransactionsByAccountDB,
  addAccountDB,
  deleteAccountDB,
  // 為了方便除錯，可以新增清除所有數據的函數
  clearAllData: async () => {
    runSqlSync(`DROP TABLE IF EXISTS transactions;`);
    runSqlSync(`DROP TABLE IF EXISTS accounts;`);
    await initDatabase();
  }
};