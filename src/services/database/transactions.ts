import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Transaction, TransactionType } from '@/src/types';
import { ErrorHandler } from '@/src/utils/errorHandler';

/**
 * 新增交易記錄 (Add Transaction)
 * 
 * Why: 負責將使用者的記帳資料寫入 SQLite。
 * Process:
 * 1. 轉換日期為 ISO 格式以符合資料庫儲存規範。
 * 2. 執行 SQL 插入。
 * 3. `lastInsertRowId` 用於確認寫入成功並返回 ID。
 * 4. 通知監聽器 (Observer) 刷新 UI。
 * 
 * @param t 交易物件 (不含 id)
 * @returns 新增的交易 ID
 */
export const addTransactionDB = async (t: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'addTransactionDB');
        throw error;
    }
};

/**
 * 更新交易記錄 (Update Transaction)
 * 
 * Why: 允許使用者修改錯誤的記帳資訊。
 * Note: 此操作僅更新交易本身，若涉及轉帳會由 updateTransfer 處理。
 * 
 * @param id 交易ID
 * @param amount 新金額
 * @param type 新類別
 * @param date 新日期
 * @param description 新描述
 */
export const updateTransactionDB = async (id: number, amount: number, type: TransactionType, date: Date, description: string) => {
    try {
        const dateString = date.toISOString();
        runSqlSync(
            `UPDATE transactions SET amount = ?, type = ?, date = ?, description = ? WHERE id = ?;`,
            [amount, type, dateString, description, id]
        );
        notifyListeners();
    } catch (error) {
        ErrorHandler.handleError(error, 'updateTransactionDB');
        throw error;
    }
};

/**
 * 刪除交易記錄 (Delete Transaction)
 * 
 * Why: 移除不需要的交易資料。
 * Note: 若是轉帳交易，通常建議透過 updateTransfer 或特定邏輯處理餘額回滾，此處為基礎刪除。
 * 
 * @param id 交易ID
 */
export const deleteTransactionDB = async (id: number) => {
    try {
        runSqlSync(`DELETE FROM transactions WHERE id = ?;`, [id]);
        notifyListeners();
    } catch (error) {
        ErrorHandler.handleError(error, 'deleteTransactionDB');
        throw error;
    }
};

/**
 * 執行轉帳交易 (Perform Transfer)
 * 
 * Why:轉帳涉及「新增交易記錄」與「兩個帳戶餘額變動」原子性操作。
 * Process:
 * 1. 新增一筆類型為 TRANSFER 的交易。
 * 2. 扣除來源帳戶餘額。
 * 3. 增加目的帳戶餘額。
 * 4. 觸發 UI 更新。
 * 
 * @param fromAccountId 轉出帳戶ID
 * @param toAccountId 轉入帳戶ID
 * @param amount 金額
 * @param date 日期
 * @param description 備註
 */
export const performTransfer = async (fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string) => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'performTransfer');
        throw error;
    }
};

/**
 * 更新轉帳交易 (Update Transfer)
 * 
 * Why: 轉帳資料修改複雜，需「回滾舊餘額」並「應用新餘額」。
 * Logic:
 * 1. Revert: 將舊金額加回舊轉出帳戶，從舊轉入帳戶扣除。
 * 2. Update: 更新交易記錄本身 (包含可能的帳戶變更)。
 * 3. Apply: 將新金額從新轉出帳戶扣除，加到新轉入帳戶。
 * 
 * @param transactionId 交易ID
 * @param oldFromAccountId 舊轉出帳戶
 * @param oldToAccountId 舊轉入帳戶
 * @param oldAmount 舊金額
 * @param newFromAccountId 新轉出帳戶
 * @param newToAccountId 新轉入帳戶
 * @param newAmount 新金額
 * @param newDate 新日期
 * @param newDescription 新備註
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
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'updateTransfer');
        throw error;
    }
};

/**
 * 讀取特定帳本的交易記錄 (Get Transactions by Account)
 * 
 * Why: 用於帳戶詳情頁面，顯示該帳戶的所有相關交易 (含轉入與轉出)。
 * Note: 使用 OR targetAccountId 來抓取作為轉入方的轉帳。
 * 
 * @param accountId 帳戶ID
 * @returns 交易列表
 */
export const getTransactionsByAccountDB = async (accountId: number): Promise<Transaction[]> => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'getTransactionsByAccountDB');
        throw error;
    }
};

/**
 * 取得包含帳戶資訊的交易記錄 (Get Transactions with Account Info)
 * 
 * Why: 用於主頁或全域交易列表，需同時顯示交易幣別 (來自 Account)。
 * Optimization: 使用 SQL JOIN 減少 N+1 查詢問題，一次撈取 Currency。
 * Feature: 支援 server-side (SQL-side) 日期篩選，提升效能。
 * 
 * @param startDate 起始日期 (YYYY-MM-DD)
 * @param endDate 結束日期 (YYYY-MM-DD)
 * @returns 擴充交易物件列表
 */
export const getTransactionsWithAccount = async (startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'getTransactionsWithAccount');
        throw error;
    }
};

/**
 * 取得指定月份的各類別支出統計 (Get Category Spending)
 * 
 * Why: 用於分析頁面 (Analysis) 的圓餅圖數據。
 * Logic: 使用 SQL GROUP BY 直接在資料庫層級聚合數據，避免前端大量計算。
 * 
 * @param year 年分
 * @param month 月份 (1-12)
 * @returns { 類別名稱: 總金額 }
 */
export const getCategorySpending = async (year: number, month: number): Promise<{ [key: string]: number }> => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'getCategorySpending');
        throw error;
    }
};

/**
 * 取得所有已使用的支出類別 (Get Distinct Categories)
 * 
 * Why: 用於自動完成或類別篩選清單。
 * 
 * @returns 類別名稱列表
 */
export const getDistinctCategories = async (): Promise<string[]> => {
    try {
        const rows = getRowsSync(
            `SELECT DISTINCT description FROM transactions WHERE type = '${TransactionType.EXPENSE}' ORDER BY description;`
        ) as any[];
        return rows.map((row: any) => row.description).filter((d: string) => d);
    } catch (error) {
        ErrorHandler.handleError(error, 'getDistinctCategories');
        throw error;
    }
};

/**
 * 取得所有交易 (Get All Transactions)
 * 
 * Why: 備份功能需要匯出所有原始數據。
 */
export const getAllTransactionsDB = async () => {
    try {
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
    } catch (error) {
        ErrorHandler.handleError(error, 'getAllTransactionsDB');
        throw error;
    }
};

/**
 * 匯入交易 (Import Transaction)
 * 
 * Why: 從備份還原資料時使用。
 * Note: 需保留原有的 ID 以維持關聯性。
 */
export const importTransactionDB = async (t: any) => {
    try {
        runSqlSync(
            `INSERT INTO transactions (id, amount, type, date, description, accountId, targetAccountId) 
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [t.id, t.amount, t.type, t.date, t.description, t.accountId, t.targetAccountId]
        );
    } catch (error) {
        ErrorHandler.handleError(error, 'importTransactionDB');
        throw error;
    }
};
