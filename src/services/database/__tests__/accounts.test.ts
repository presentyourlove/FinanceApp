import { addAccountDB, getAccounts, updateAccountOrderDB } from '../accounts';
import { runSqlSync, getRowsSync } from '../core';

// Mock core database functions
jest.mock('../core', () => ({
    runSqlSync: jest.fn(),
    getRowsSync: jest.fn(),
    notifyListeners: jest.fn(),
    initDatabase: jest.fn(),
    addDataChangeListener: jest.fn(),
    removeDataChangeListener: jest.fn(),
}));

describe('accounts database service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get accounts ordered by sortIndex and id', async () => {
        const mockAccounts = [
            { id: 1, name: 'Acc1', sortIndex: 0 },
            { id: 2, name: 'Acc2', sortIndex: 1 },
        ];
        (getRowsSync as jest.Mock).mockReturnValue(mockAccounts);

        const accounts = await getAccounts();

        expect(getRowsSync).toHaveBeenCalledWith('SELECT * FROM accounts ORDER BY sortIndex ASC, id ASC;');
        expect(accounts).toHaveLength(2);
        expect(accounts[0].name).toBe('Acc1');
    });

    it('should add account with next sortIndex', async () => {
        // Mock existing max index
        (getRowsSync as jest.Mock).mockReturnValueOnce([{ maxIndex: 5 }]);
        // Mock insert result
        (runSqlSync as jest.Mock).mockReturnValueOnce({ lastInsertRowId: 10 });

        const newId = await addAccountDB('New Acc', 100);

        expect(getRowsSync).toHaveBeenCalledWith('SELECT MAX(sortIndex) as maxIndex FROM accounts;');
        expect(runSqlSync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO accounts'),
            ['New Acc', 100, 100, 'TWD', 6] // 5 + 1 = 6
        );
        expect(newId).toBe(10);
    });

    it('should update account order', async () => {
        const accounts = [
            { id: 1, name: 'A', sortIndex: 0 },
            { id: 2, name: 'B', sortIndex: 1 },
        ] as any[];

        await updateAccountOrderDB(accounts);

        expect(runSqlSync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
        expect(runSqlSync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE accounts SET sortIndex = ? WHERE id = ?;'),
            [0, 1]
        );
        expect(runSqlSync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE accounts SET sortIndex = ? WHERE id = ?;'),
            [1, 2]
        );
        expect(runSqlSync).toHaveBeenCalledWith('COMMIT;');
    });
});
