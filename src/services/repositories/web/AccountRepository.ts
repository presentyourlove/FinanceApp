import { IAccountRepository } from '../interfaces';
import localforage from 'localforage';
import { Account } from '@/src/types';

const KEY_ACCOUNTS = 'accounts';

export class WebAccountRepository implements IAccountRepository {
    async getAccounts(): Promise<Account[]> {
        const accounts = await localforage.getItem<Account[]>(KEY_ACCOUNTS);
        return (accounts || []).sort((a, b) => (a.sortIndex || 0) - (b.sortIndex || 0) || a.id - b.id);
    }

    async updateAccountBalance(id: number, newBalance: number): Promise<void> {
        const accounts = await this.getAccounts();
        const index = accounts.findIndex(a => a.id === id);
        if (index !== -1) {
            accounts[index].currentBalance = newBalance;
            await localforage.setItem(KEY_ACCOUNTS, accounts);
        }
    }

    async addAccount(name: string, initialBalance: number, currency: string = 'TWD'): Promise<number> {
        const accounts = await this.getAccounts();
        const maxId = accounts.reduce((max, acc) => Math.max(max, acc.id), 0);
        const maxIndex = accounts.reduce((max, acc) => Math.max(max, acc.sortIndex || 0), -1);

        const newAccount: Account = {
            id: maxId + 1,
            name,
            initialBalance,
            currentBalance: initialBalance,
            currency,
            sortIndex: maxIndex + 1
        };

        accounts.push(newAccount);
        await localforage.setItem(KEY_ACCOUNTS, accounts);
        return newAccount.id;
    }

    async updateAccountOrder(accounts: Account[]): Promise<void> {
        // Optimization: Create a map for O(1) lookup or just overwrite entire list if 'accounts' passed is the full list.
        // The service passes the full sorted list typically? No, it might pass a reordered subset.
        // But in `updateAccountOrderDB`, it updates by ID.
        // Here, we can just update the sortIndexes of the items in storage.
        const storedAccounts = await this.getAccounts();
        const updateMap = new Map(accounts.map((a, index) => [a.id, index]));

        storedAccounts.forEach(acc => {
            if (updateMap.has(acc.id)) {
                acc.sortIndex = updateMap.get(acc.id)!;
            }
        });

        await localforage.setItem(KEY_ACCOUNTS, storedAccounts);
    }

    async deleteAccount(id: number): Promise<void> {
        // TODO: Check transactions constraints?
        // For MVP, skipping transaction check or implement simple check.
        const accounts = await this.getAccounts();
        const newAccounts = accounts.filter(a => a.id !== id);
        if (newAccounts.length !== accounts.length) {
            await localforage.setItem(KEY_ACCOUNTS, newAccounts);
        }
    }

    async importAccount(acc: any): Promise<void> {
        const accounts = await this.getAccounts();
        // Check if exists
        const index = accounts.findIndex(a => a.id === acc.id);
        if (index !== -1) {
            accounts[index] = acc;
        } else {
            accounts.push(acc);
        }
        await localforage.setItem(KEY_ACCOUNTS, accounts);
    }
}
