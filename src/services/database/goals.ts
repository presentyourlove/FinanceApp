import { runSqlSync, getRowsSync, notifyListeners } from './core';
import { Goal } from '@/src/types';

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
    const result = res && res.lastInsertRowId;
    notifyListeners();
    return result;
};

export const updateGoalAmount = async (id: number, currentAmount: number) => {
    runSqlSync(`UPDATE goals SET currentAmount = ? WHERE id = ?;`, [currentAmount, id]);
    notifyListeners();
};

export const updateGoal = async (id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD') => {
    runSqlSync(
        `UPDATE goals SET name = ?, targetAmount = ?, deadline = ?, currency = ? WHERE id = ?;`,
        [name, targetAmount, deadline || null, currency, id]
    );
    notifyListeners();
};

export const deleteGoal = async (id: number) => {
    runSqlSync(`DELETE FROM goals WHERE id = ?;`, [id]);
    notifyListeners();
};

export const importGoalDB = async (g: any) => {
    runSqlSync(
        `INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, ?, ?, ?, ?);`,
        [g.id, g.name, g.targetAmount, g.currentAmount, g.deadline, g.currency]
    );
};
