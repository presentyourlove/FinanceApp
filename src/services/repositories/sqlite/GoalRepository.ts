import { IGoalRepository } from '../interfaces';
import { runSqlSync, getRowsSync, notifyListeners } from '../../database/core';
import { Goal } from '@/src/types';

export class SqliteGoalRepository implements IGoalRepository {
    async getGoals(): Promise<Goal[]> {
        const rows = getRowsSync('SELECT * FROM goals;') as any[];
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            targetAmount: row.targetAmount,
            currentAmount: row.currentAmount,
            deadline: row.deadline,
            currency: row.currency || 'TWD',
        }));
    }

    async addGoal(name: string, targetAmount: number, deadline?: string, currency: string = 'TWD'): Promise<number> {
        const res = runSqlSync(
            `INSERT INTO goals (name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, 0, ?, ?);`,
            [name, targetAmount, deadline || null, currency]
        );
        const result = res && res.lastInsertRowId || Date.now();
        notifyListeners();
        return result;
    }

    async updateGoalAmount(id: number, currentAmount: number): Promise<void> {
        runSqlSync(`UPDATE goals SET currentAmount = ? WHERE id = ?;`, [currentAmount, id]);
        notifyListeners();
    }

    async updateGoal(id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD'): Promise<void> {
        runSqlSync(
            `UPDATE goals SET name = ?, targetAmount = ?, deadline = ?, currency = ? WHERE id = ?;`,
            [name, targetAmount, deadline || null, currency, id]
        );
        notifyListeners();
    }

    async deleteGoal(id: number): Promise<void> {
        runSqlSync(`DELETE FROM goals WHERE id = ?;`, [id]);
        notifyListeners();
    }

    async importGoal(g: any): Promise<void> {
        runSqlSync(
            `INSERT INTO goals (id, name, targetAmount, currentAmount, deadline, currency) VALUES (?, ?, ?, ?, ?, ?);`,
            [g.id, g.name, g.targetAmount, g.currentAmount, g.deadline, g.currency]
        );
    }
}
