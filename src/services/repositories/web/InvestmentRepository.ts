import { IInvestmentRepository } from '../interfaces';
import localforage from 'localforage';
import { Investment, TransactionType } from '@/src/types';
import { WebTransactionRepository } from './TransactionRepository'; // To reuse logic if needed, or better, instantiate in factory.
// We'll instantiate a fresh Repo or use logic here.
// For Web, easy enough to re-verify dependencies.

const KEY_INVESTMENTS = 'investments';
const KEY_TRANSACTIONS = 'transactions';
const KEY_ACCOUNTS = 'accounts';

export class WebInvestmentRepository implements IInvestmentRepository {
    private async getAll(): Promise<Investment[]> {
        const items = await localforage.getItem<Investment[]>(KEY_INVESTMENTS);
        return items || [];
    }
    private async saveAll(items: Investment[]) {
        await localforage.setItem(KEY_INVESTMENTS, items);
    }

    // Helpers to mimic DB operations
    private async runTransactionOp(op: () => Promise<void>) {
        // Localforage isn't transactional, so we just run op.
        await op();
    }

    async addInvestment(data: Omit<Investment, 'id' | 'status'>, syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }): Promise<number> {
        const investments = await this.getAll();
        const maxId = investments.reduce((max, i) => Math.max(max, i.id), 0);

        let linkedTransactionId: number | undefined = undefined;

        // Sync Logic
        if (syncOptions.syncToTransaction && syncOptions.sourceAccountId) {
            let totalExpense = 0;
            if (data.type === 'stock') {
                totalExpense = (data.costPrice || 0) + (data.handlingFee || 0);
            } else {
                totalExpense = data.amount + (data.handlingFee || 0);
            }

            if (totalExpense > 0) {
                // Manually add transaction and update account to avoid circular dep issues or complex factory injection here
                const transactions = await localforage.getItem<any[]>(KEY_TRANSACTIONS) || [];
                const maxTId = transactions.reduce((max, t) => Math.max(max, t.id), 0);
                linkedTransactionId = maxTId + 1;

                const newT = {
                    id: linkedTransactionId,
                    amount: totalExpense,
                    type: TransactionType.EXPENSE,
                    date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString(),
                    description: `投資: ${data.name}`,
                    accountId: syncOptions.sourceAccountId,
                };
                transactions.push(newT);
                await localforage.setItem(KEY_TRANSACTIONS, transactions);

                const accounts = await localforage.getItem<any[]>(KEY_ACCOUNTS) || [];
                const acc = accounts.find(a => a.id === syncOptions.sourceAccountId);
                if (acc) {
                    acc.currentBalance -= totalExpense;
                    await localforage.setItem(KEY_ACCOUNTS, accounts);
                }
            }
        }

        const newInvestment: Investment = {
            ...data,
            id: maxId + 1,
            linkedTransactionId,
            status: 'active'
        };
        investments.push(newInvestment);
        await this.saveAll(investments);
        return newInvestment.id;
    }

    async getInvestments(): Promise<Investment[]> {
        const all = await this.getAll();
        return all.filter(i => i.status === 'active').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async updateInvestment(id: number, data: Partial<Investment>): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...data };
            await this.saveAll(items);
        }
    }

    async processInvestmentAction(id: number, actionType: 'sell' | 'close' | 'withdraw', data: { amount?: number; returnAmount?: number; date: string }, syncOptions: { syncToTransaction: boolean; targetAccountId?: number }): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) throw new Error("Investment not found");

        const inv = items[index];
        let newStatus = inv.status;
        let newAmount = inv.amount;

        if (inv.type === 'stock' && actionType === 'sell') {
            const sellShares = data.amount || 0;
            newAmount = inv.amount - sellShares;
            if (newAmount <= 0) {
                newAmount = 0;
                newStatus = 'sold';
            }
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
        }

        items[index].amount = newAmount;
        items[index].status = newStatus;
        await this.saveAll(items);

        if (syncOptions.syncToTransaction && syncOptions.targetAccountId && data.returnAmount && data.returnAmount > 0) {
            const transactions = await localforage.getItem<any[]>(KEY_TRANSACTIONS) || [];
            const maxTId = transactions.reduce((max, t) => Math.max(max, t.id), 0);

            const newT = {
                id: maxTId + 1,
                amount: data.returnAmount,
                type: TransactionType.INCOME,
                date: data.date,
                description: `投資回收: ${inv.name} (${actionType})`,
                accountId: syncOptions.targetAccountId,
            };
            transactions.push(newT);
            await localforage.setItem(KEY_TRANSACTIONS, transactions);

            const accounts = await localforage.getItem<any[]>(KEY_ACCOUNTS) || [];
            const acc = accounts.find(a => a.id === syncOptions.targetAccountId);
            if (acc) {
                acc.currentBalance += data.returnAmount;
                await localforage.setItem(KEY_ACCOUNTS, accounts);
            }
        }
    }

    async updateStockPrice(name: string, price: number): Promise<void> {
        const items = await this.getAll();
        items.forEach(i => {
            if (i.name === name && i.type === 'stock' && i.status === 'active') {
                i.currentPrice = price;
            }
        });
        await this.saveAll(items);
    }

    async getAllInvestments(): Promise<Investment[]> {
        return this.getAll();
    }

    async importInvestment(inv: any): Promise<void> {
        const items = await this.getAll();
        const index = items.findIndex(i => i.id === inv.id);
        if (index !== -1) items[index] = inv;
        else items.push(inv);
        await this.saveAll(items);
    }
}
