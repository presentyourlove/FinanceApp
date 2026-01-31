import { ITransactionRepository } from '../interfaces';
import { runSqlSync, getRowsSync, notifyListeners } from '../../database/core';
import { Transaction, TransactionType } from '@/src/types';
import { ErrorHandler } from '@/src/utils/errorHandler';

export class SqliteTransactionRepository implements ITransactionRepository {
    async addTransaction(t: Omit<Transaction, 'id' | 'date'> & { date: Date }): Promise<number> {
        try {
            const dateString = t.date.toISOString();
            const res = runSqlSync(
                `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [t.amount, t.type, dateString, t.description, t.accountId, t.targetAccountId]
            );
            const result = res && res.lastInsertRowId || Date.now();
            notifyListeners();
            return result;
        } catch (error) {
            ErrorHandler.handleError(error, 'addTransactionDB');
            throw error;
        }
    }

    async updateTransaction(id: number, amount: number, type: TransactionType, date: Date, description: string): Promise<void> {
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
    }

    async deleteTransaction(id: number): Promise<void> {
        try {
            runSqlSync(`DELETE FROM transactions WHERE id = ?;`, [id]);
            notifyListeners();
        } catch (error) {
            ErrorHandler.handleError(error, 'deleteTransactionDB');
            throw error;
        }
    }

    async performTransfer(fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string): Promise<void> {
        try {
            const dateString = date.toISOString();
            runSqlSync(
                `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
                 VALUES (?, '${TransactionType.TRANSFER}', ?, ?, ?, ?);`,
                [amount, dateString, description, fromAccountId, toAccountId]
            );

            const fromAccountRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [fromAccountId]) as any[];
            if (fromAccountRows && fromAccountRows.length > 0) {
                const newFromBalance = fromAccountRows[0].currentBalance - amount;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newFromBalance, fromAccountId]);
            }

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
    }

    async updateTransfer(transactionId: number, oldFromAccountId: number, oldToAccountId: number, oldAmount: number, newFromAccountId: number, newToAccountId: number, newAmount: number, newDate: Date, newDescription: string): Promise<void> {
        try {
            const dateString = newDate.toISOString();
            // Revert old
            const oldFromRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [oldFromAccountId]) as any[];
            if (oldFromRows && oldFromRows.length > 0) {
                const restoredBalance = oldFromRows[0].currentBalance + oldAmount;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [restoredBalance, oldFromAccountId]);
            }
            const oldToRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [oldToAccountId]) as any[];
            if (oldToRows && oldToRows.length > 0) {
                const restoredBalance = oldToRows[0].currentBalance - oldAmount;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [restoredBalance, oldToAccountId]);
            }

            // Update transaction
            runSqlSync(
                `UPDATE transactions SET amount = ?, date = ?, description = ?, accountId = ?, targetAccountId = ? WHERE id = ?;`,
                [newAmount, dateString, newDescription, newFromAccountId, newToAccountId, transactionId]
            );

            // Apply new
            const newFromRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [newFromAccountId]) as any[];
            if (newFromRows && newFromRows.length > 0) {
                const newBalance = newFromRows[0].currentBalance - newAmount;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, newFromAccountId]);
            }
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
    }

    async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
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
    }

    async getTransactionsWithAccount(startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> {
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
    }

    async getCategorySpending(year: number, month: number): Promise<{ [key: string]: number }> {
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
    }

    async getDistinctCategories(): Promise<string[]> {
        const rows = getRowsSync(
            `SELECT DISTINCT description FROM transactions WHERE type = '${TransactionType.EXPENSE}' ORDER BY description;`
        ) as any[];
        return rows.map((row: any) => row.description).filter((d: string) => d);
    }

    async getAllTransactions(): Promise<Transaction[]> {
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
    }

    async importTransaction(t: any): Promise<void> {
        runSqlSync(
            `INSERT INTO transactions (id, amount, type, date, description, accountId, targetAccountId) 
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [t.id, t.amount, t.type, t.date, t.description, t.accountId, t.targetAccountId]
        );
    }
}
