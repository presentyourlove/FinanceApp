import { IInvestmentRepository } from '../interfaces';
import { runSqlSync, getRowsSync, notifyListeners } from '../../database/core';
import { Investment, TransactionType } from '@/src/types';
// Note: We implement transaction logic directly with SQL to avoid circular dependency

export class SqliteInvestmentRepository implements IInvestmentRepository {
    async addInvestment(data: Omit<Investment, 'id' | 'status'>, syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }): Promise<number> {
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
                // Dependency: We need to add a transaction.
                // In a perfect world, we inject TransactionRepo.
                // For now, let's assume valid SQL.
                // Re-implementing simplified transaction add here to avoid circular dep for now? 
                // OR use runSql directly.
                const dateString = new Date(date).toISOString();
                const res = runSqlSync(
                    `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
                     VALUES (?, ?, ?, ?, ?, ?);`,
                    [totalExpense, TransactionType.EXPENSE, dateString, `投資: ${name}`, syncOptions.sourceAccountId, null]
                );
                linkedTransactionId = res && res.lastInsertRowId;

                const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.sourceAccountId]) as any[];
                if (accRows && accRows.length > 0) {
                    const newBalance = accRows[0].currentBalance - totalExpense;
                    runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.sourceAccountId]);
                }
            }
        }

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
        const result = res && res.lastInsertRowId || Date.now();
        notifyListeners();
        return result;
    }

    async getInvestments(): Promise<Investment[]> {
        const rows = getRowsSync(`SELECT * FROM investments WHERE status = 'active' ORDER BY date DESC;`) as any[];
        return rows.map((row: any) => ({
            ...row,
            amount: Number(row.amount),
            costPrice: row.costPrice ? Number(row.costPrice) : undefined,
            currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
            interestRate: row.interestRate ? Number(row.interestRate) : undefined,
            handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
        }));
    }

    async updateInvestment(id: number, data: Partial<Investment>): Promise<void> {
        const fields = Object.keys(data).filter(k => k !== 'id');
        if (fields.length === 0) return;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => (data as any)[f]);

        runSqlSync(`UPDATE investments SET ${setClause} WHERE id = ?;`, [...values, id]);
        notifyListeners();
    }

    async processInvestmentAction(id: number, actionType: 'sell' | 'close' | 'withdraw', data: { amount?: number; returnAmount?: number; date: string }, syncOptions: { syncToTransaction: boolean; targetAccountId?: number }): Promise<void> {
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
            // Direct SQL for transaction to avoid circular dependency
            const dateString = new Date(data.date).toISOString();
            runSqlSync(
                `INSERT INTO transactions (amount, type, date, description, accountId, targetAccountId) 
                 VALUES (?, ?, ?, ?, ?, ?);`,
                [data.returnAmount, TransactionType.INCOME, dateString, `投資回收: ${inv.name} (${actionType})`, syncOptions.targetAccountId, null]
            );

            const accRows = getRowsSync(`SELECT currentBalance FROM accounts WHERE id = ?;`, [syncOptions.targetAccountId]) as any[];
            if (accRows && accRows.length > 0) {
                const newBalance = accRows[0].currentBalance + data.returnAmount;
                runSqlSync(`UPDATE accounts SET currentBalance = ? WHERE id = ?;`, [newBalance, syncOptions.targetAccountId]);
            }
        }
        notifyListeners();
    }

    async updateStockPrice(name: string, price: number): Promise<void> {
        runSqlSync(`UPDATE investments SET currentPrice = ? WHERE name = ? AND type = 'stock' AND status = 'active';`, [price, name]);
        notifyListeners();
    }

    async getAllInvestments(): Promise<Investment[]> {
        const rows = getRowsSync(`SELECT * FROM investments;`) as any[];
        return rows.map((row: any) => ({
            ...row,
            amount: Number(row.amount),
            costPrice: row.costPrice ? Number(row.costPrice) : undefined,
            currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
            interestRate: row.interestRate ? Number(row.interestRate) : undefined,
            handlingFee: row.handlingFee ? Number(row.handlingFee) : undefined,
        }));
    }

    async importInvestment(inv: any): Promise<void> {
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
}
