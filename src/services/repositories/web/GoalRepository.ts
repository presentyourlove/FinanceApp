import { IGoalRepository } from '../interfaces';
import localforage from 'localforage';
import { Goal } from '@/src/types';

const KEY_GOALS = 'goals';

export class WebGoalRepository implements IGoalRepository {
    private async getAll(): Promise<Goal[]> {
        return (await localforage.getItem<Goal[]>(KEY_GOALS)) || [];
    }
    private async saveAll(items: Goal[]) {
        await localforage.setItem(KEY_GOALS, items);
    }

    async getGoals(): Promise<Goal[]> {
        return this.getAll();
    }

    async addGoal(name: string, targetAmount: number, deadline?: string, currency: string = 'TWD'): Promise<number> {
        const items = await this.getAll();
        const maxId = items.reduce((max, i) => Math.max(max, i.id), 0);
        const newItem: Goal = {
            id: maxId + 1,
            name,
            targetAmount,
            currentAmount: 0,
            deadline,
            currency
        };
        items.push(newItem);
        await this.saveAll(items);
        return newItem.id;
    }

    async updateGoalAmount(id: number, currentAmount: number): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index].currentAmount = currentAmount;
            await this.saveAll(items);
        }
    }

    async updateGoal(id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD'): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], name, targetAmount, deadline, currency };
            await this.saveAll(items);
        }
    }

    async deleteGoal(id: number): Promise<void> {
        const items = await this.getAll();
        const newItems = items.filter(i => i.id !== id);
        await this.saveAll(newItems);
    }

    async importGoal(g: any): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === g.id);
        if (index !== -1) {
            items[index] = g;
        } else {
            items.push(g);
        }
        await this.saveAll(items);
    }
}
