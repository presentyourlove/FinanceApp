import { IBudgetRepository } from '../interfaces';
import localforage from 'localforage';
import { Budget } from '@/src/types';

const KEY_BUDGETS = 'budgets';

export class WebBudgetRepository implements IBudgetRepository {
    private async getAll(): Promise<Budget[]> {
        return (await localforage.getItem<Budget[]>(KEY_BUDGETS)) || [];
    }
    private async saveAll(items: Budget[]) {
        await localforage.setItem(KEY_BUDGETS, items);
    }

    async getBudgets(): Promise<Budget[]> {
        return this.getAll();
    }

    async addBudget(category: string, amount: number, period: string, currency: string): Promise<number> {
        const items = await this.getAll();
        const maxId = items.reduce((max, i) => Math.max(max, i.id), 0);
        const newItem: Budget = {
            id: maxId + 1,
            category,
            amount,
            period,
            currency
        };
        items.push(newItem);
        await this.saveAll(items);
        return newItem.id;
    }

    async updateBudget(id: number, category: string, amount: number, period: string, currency: string): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], category, amount, period, currency };
            await this.saveAll(items);
        }
    }

    async deleteBudget(id: number): Promise<void> {
        const items = await this.getAll();
        const newItems = items.filter(i => i.id !== id);
        await this.saveAll(newItems);
    }

    async importBudget(b: any): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === b.id);
        if (index !== -1) {
            items[index] = b;
        } else {
            items.push(b);
        }
        await this.saveAll(items);
    }
}
