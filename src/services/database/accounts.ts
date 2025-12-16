import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Account } from '@/src/types';

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
    notifyListeners();
};

/**
 * 新增一個帳本
 */
export const addAccountDB = async (name: string, initialBalance: number, currency: string = 'TWD') => {
    const res = runSqlSync(
        `INSERT INTO accounts (name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?);`,
        [name, initialBalance, initialBalance, currency]
    );
    const result = res && res.lastInsertRowId || Date.now();
    notifyListeners();
    return result;
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
    notifyListeners();
};

// Import helper
export const importAccountDB = async (acc: any) => {
    runSqlSync(
        `INSERT INTO accounts (id, name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?, ?);`,
        [acc.id, acc.name, acc.initialBalance, acc.currentBalance, acc.currency]
    );
};
