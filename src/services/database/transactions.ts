import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Transaction, TransactionType } from '@/src/types';

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
    const result = res && res.lastInsertRowId || Date.now();
    notifyListeners();
    return result;
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
    notifyListeners();
};

/**
 * 刪除交易記錄
 */
export const deleteTransactionDB = async (id: number) => {
    runSqlSync(`DELETE FROM transactions WHERE id = ?;`, [id]);
    notifyListeners();
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
    notifyListeners();
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
    notifyListeners();
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
 * 取得指定月份的各類別支出統計
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

export const getAllTransactionsDB = async () => {
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
};

export const importTransactionDB = async (t: any) => {
    runSqlSync(
        `INSERT INTO transactions (id, amount, type, date, description, accountId, targetAccountId) 
    VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [t.id, t.amount, t.type, t.date, t.description, t.accountId, t.targetAccountId]
    );
};
