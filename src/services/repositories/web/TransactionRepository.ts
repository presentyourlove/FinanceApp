import { ITransactionRepository } from '../interfaces';
import localforage from 'localforage';
import { Transaction, TransactionType } from '@/src/types';

const KEY_TRANSACTIONS = 'transactions';
const KEY_ACCOUNTS = 'accounts'; // Needed for transfers

export class WebTransactionRepository implements ITransactionRepository {
    private async getTransactions(): Promise<Transaction[]> {
        const data = await localforage.getItem<Transaction[]>(KEY_TRANSACTIONS);
        return data || [];
    }

    private async saveTransactions(transactions: Transaction[]) {
        await localforage.setItem(KEY_TRANSACTIONS, transactions);
    }

    private async getAccounts(): Promise<any[]> {
        return (await localforage.getItem<any[]>(KEY_ACCOUNTS)) || [];
    }

    private async saveAccounts(accounts: any[]) {
        await localforage.setItem(KEY_ACCOUNTS, accounts);
    }

    async addTransaction(t: Omit<Transaction, 'id' | 'date'> & { date: Date }): Promise<number> {
        const transactions = await this.getTransactions();
        const maxId = transactions.reduce((max, tr) => Math.max(max, tr.id), 0);
        const newTrans: Transaction = {
            ...t,
            id: maxId + 1,
            date: t.date.toISOString(),
            targetAccountId: t.targetAccountId || undefined // ensure undefined if null
        };
        transactions.push(newTrans);
        await this.saveTransactions(transactions);
        return newTrans.id;
    }

    async updateTransaction(id: number, amount: number, type: TransactionType, date: Date, description: string): Promise<void> {
        const transactions = await this.getTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], amount, type, date: date.toISOString(), description };
            await this.saveTransactions(transactions);
        }
    }

    async deleteTransaction(id: number): Promise<void> {
        const transactions = await this.getTransactions();
        const newTransactions = transactions.filter(t => t.id !== id);
        await this.saveTransactions(newTransactions);
    }

    async performTransfer(fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string): Promise<void> {
        // 1. Add Transaction
        const tId = await this.addTransaction({
            amount,
            type: TransactionType.TRANSFER,
            date,
            description,
            accountId: fromAccountId,
            targetAccountId: toAccountId
        });

        // 2. Update Balances
        const accounts = await this.getAccounts();
        const fromAcc = accounts.find(a => a.id === fromAccountId);
        const toAcc = accounts.find(a => a.id === toAccountId);

        if (fromAcc) fromAcc.currentBalance -= amount;
        if (toAcc) toAcc.currentBalance += amount;

        await this.saveAccounts(accounts);
    }

    async updateTransfer(transactionId: number, oldFromAccountId: number, oldToAccountId: number, oldAmount: number, newFromAccountId: number, newToAccountId: number, newAmount: number, newDate: Date, newDescription: string): Promise<void> {
        // Revert old
        const accounts = await this.getAccounts();
        const oldFrom = accounts.find(a => a.id === oldFromAccountId);
        const oldTo = accounts.find(a => a.id === oldToAccountId);
        if (oldFrom) oldFrom.currentBalance += oldAmount;
        if (oldTo) oldTo.currentBalance -= oldAmount;

        // Apply new
        const newFrom = accounts.find(a => a.id === newFromAccountId);
        const newTo = accounts.find(a => a.id === newToAccountId);
        if (newFrom) newFrom.currentBalance -= newAmount;
        if (newTo) newTo.currentBalance += newAmount;

        await this.saveAccounts(accounts);

        // Update Transaction
        await this.updateTransaction(transactionId, newAmount, TransactionType.TRANSFER, newDate, newDescription);
        // Note: updateTransaction doesn't update accountId/targetAccountId. Need to handle that.
        // My updateTransaction signature matches the interface, checking implementation...
        // Interface: updateTransaction(id, amount, type, date, description) -> MISSING accounts!
        // The SQLite implementation updates transactions table but NOT account IDs? 
        // Checking SqliteRepo... `UPDATE transactions SET ...` -> It DOES NOT update accountId in `updateTransaction` !!
        // Wait, `updateTransactionDB` signature in `transactions.ts` did NOT include accountId.
        // BUT `updateTransfer` DOES.

        // I need to manually update the transaction's accountIds here since I'm implementing `updateTransfer`.
        const transactions = await this.getTransactions();
        const tIndex = transactions.findIndex(t => t.id === transactionId);
        if (tIndex !== -1) {
            transactions[tIndex].accountId = newFromAccountId;
            transactions[tIndex].targetAccountId = newToAccountId;
            await this.saveTransactions(transactions);
        }
    }

    async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
        const transactions = await this.getTransactions();
        return transactions
            .filter(t => t.accountId === accountId || t.targetAccountId === accountId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async getTransactionsWithAccount(startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> {
        const transactions = await this.getTransactions();
        const accounts = await this.getAccounts();
        const accMap = new Map(accounts.map(a => [a.id, a]));

        let filtered = transactions;
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }

        return filtered.map(t => ({
            ...t,
            accountCurrency: accMap.get(t.accountId)?.currency || 'TWD'
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async getCategorySpending(year: number, month: number): Promise<{ [key: string]: number }> {
        const transactions = await this.getTransactions();

        const result: { [key: string]: number } = {};

        transactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                const d = new Date(t.date);
                if (d.getFullYear() === year && d.getMonth() + 1 === month) { // JS Month is 0-indexed
                    result[t.description || 'Other'] = (result[t.description || 'Other'] || 0) + t.amount;
                }
            }
        });
        return result;
    }

    async getDistinctCategories(): Promise<string[]> {
        const transactions = await this.getTransactions();
        const categories = new Set<string>();
        transactions.forEach(t => {
            if (t.type === TransactionType.EXPENSE && t.description) {
                categories.add(t.description);
            }
        });
        return Array.from(categories).sort();
    }

    async getAllTransactions(): Promise<Transaction[]> {
        return this.getTransactions();
    }

    async importTransaction(t: any): Promise<void> {
        const transactions = await this.getTransactions();
        const index = transactions.findIndex(tr => tr.id === t.id);
        const newT = { ...t, date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString() };
        if (index !== -1) {
            transactions[index] = newT;
        } else {
            transactions.push(newT);
        }
        await this.saveTransactions(transactions);
    }
}
