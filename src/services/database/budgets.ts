import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Budget } from '@/src/types';

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
    const result = res && res.lastInsertRowId;
    notifyListeners();
    return result;
};

export const updateBudget = async (id: number, category: string, amount: number, period: string, currency: string) => {
    runSqlSync(`UPDATE budgets SET category = ?, amount = ?, period = ?, currency = ? WHERE id = ?;`, [category, amount, period, currency, id]);
    notifyListeners();
};

export const deleteBudget = async (id: number) => {
    runSqlSync(`DELETE FROM budgets WHERE id = ?;`, [id]);
    notifyListeners();
};

export const importBudgetDB = async (b: any) => {
    runSqlSync(
        `INSERT INTO budgets (id, category, amount, period, currency) VALUES (?, ?, ?, ?, ?);`,
        [b.id, b.category, b.amount, b.period, b.currency]
    );
};
