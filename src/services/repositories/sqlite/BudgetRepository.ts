import { IBudgetRepository } from '../interfaces';
import { runSqlSync, getRowsSync, notifyListeners } from '../../database/core';
import { Budget } from '@/src/types';

export class SqliteBudgetRepository implements IBudgetRepository {
    async getBudgets(): Promise<Budget[]> {
        const rows = getRowsSync('SELECT * FROM budgets;') as any[];
        return rows.map((row: any) => ({
            id: row.id,
            category: row.category,
            amount: row.amount,
            period: row.period,
            currency: row.currency || 'TWD',
        }));
    }

    async addBudget(category: string, amount: number, period: string = 'monthly', currency: string = 'TWD'): Promise<number> {
        const res = runSqlSync(
            `INSERT INTO budgets (category, amount, period, currency) VALUES (?, ?, ?, ?);`,
            [category, amount, period, currency]
        );
        const result = res && res.lastInsertRowId || Date.now();
        notifyListeners();
        return result;
    }

    async updateBudget(id: number, category: string, amount: number, period: string, currency: string): Promise<void> {
        runSqlSync(`UPDATE budgets SET category = ?, amount = ?, period = ?, currency = ? WHERE id = ?;`, [category, amount, period, currency, id]);
        notifyListeners();
    }

    async deleteBudget(id: number): Promise<void> {
        runSqlSync(`DELETE FROM budgets WHERE id = ?;`, [id]);
        notifyListeners();
    }

    async importBudget(b: any): Promise<void> {
        runSqlSync(
            `INSERT INTO budgets (id, category, amount, period, currency) VALUES (?, ?, ?, ?, ?);`,
            [b.id, b.category, b.amount, b.period, b.currency]
        );
    }
}
