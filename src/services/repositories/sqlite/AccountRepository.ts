import { IAccountRepository } from '../interfaces';
import { runSqlSync, getRowsSync, notifyListeners } from '../../database/core';
import { Account } from '@/src/types';

export class SqliteAccountRepository implements IAccountRepository {
    async getAccounts(): Promise<Account[]> {
        const rows = getRowsSync('SELECT * FROM accounts ORDER BY sortIndex ASC, id ASC;') as any[];
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            initialBalance: row.initialBalance,
            currentBalance: row.currentBalance,
            currency: row.currency || 'TWD',
            sortIndex: row.sortIndex
        }));
    }

    async updateAccountBalance(id: number, newBalance: number): Promise<void> {
        runSqlSync(
            `UPDATE accounts SET currentBalance = ? WHERE id = ?;`,
            [newBalance, id]
        );
        notifyListeners();
    }

    async addAccount(name: string, initialBalance: number, currency: string = 'TWD'): Promise<number> {
        const resCount = getRowsSync('SELECT MAX(sortIndex) as maxIndex FROM accounts;') as any[];
        const maxIndex = (resCount && resCount.length > 0 && resCount[0].maxIndex !== null) ? resCount[0].maxIndex : -1;
        const nextIndex = maxIndex + 1;

        const res = runSqlSync(
            `INSERT INTO accounts (name, initialBalance, currentBalance, currency, sortIndex) VALUES (?, ?, ?, ?, ?);`,
            [name, initialBalance, initialBalance, currency, nextIndex]
        );
        const result = res && res.lastInsertRowId || Date.now();
        notifyListeners();
        return result;
    }

    async updateAccountOrder(accounts: Account[]): Promise<void> {
        runSqlSync('BEGIN TRANSACTION;');
        try {
            for (let i = 0; i < accounts.length; i++) {
                runSqlSync(
                    `UPDATE accounts SET sortIndex = ? WHERE id = ?;`,
                    [i, accounts[i].id]
                );
            }
            runSqlSync('COMMIT;');
            notifyListeners();
        } catch (e) {
            runSqlSync('ROLLBACK;');
            console.error("Error updating account order:", e);
            throw e;
        }
    }

    async deleteAccount(id: number): Promise<void> {
        const transactionCheck = getRowsSync(
            `SELECT COUNT(id) as count FROM transactions WHERE accountId = ? OR targetAccountId = ?;`,
            [id, id]
        ) as any[];
        const count = transactionCheck && transactionCheck.length > 0 ? transactionCheck[0].count : 0;

        if (count > 0) {
            throw new Error("Account has transactions and cannot be deleted.");
        }

        runSqlSync(
            `DELETE FROM accounts WHERE id = ?;`,
            [id]
        );
        notifyListeners();
    }

    async importAccount(acc: any): Promise<void> {
        runSqlSync(
            `INSERT INTO accounts (id, name, initialBalance, currentBalance, currency) VALUES (?, ?, ?, ?, ?);`,
            [acc.id, acc.name, acc.initialBalance, acc.currentBalance, acc.currency]
        );
    }
}
