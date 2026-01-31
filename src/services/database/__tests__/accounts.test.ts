import { addAccountDB, getAccounts, updateAccountOrderDB } from '../accounts';
import { accountRepository } from '@/src/services/repositories';

// Mock the repository module
jest.mock('@/src/services/repositories', () => ({
    accountRepository: {
        getAccounts: jest.fn(),
        addAccount: jest.fn(),
        updateAccountOrder: jest.fn(),
    }
}));

describe('accounts database service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should delegate getAccounts to repository', async () => {
        const mockAccounts = [
            { id: 1, name: 'Acc1', sortIndex: 0 },
            { id: 2, name: 'Acc2', sortIndex: 1 },
        ];
        (accountRepository.getAccounts as jest.Mock).mockResolvedValue(mockAccounts);

        const accounts = await getAccounts();

        expect(accountRepository.getAccounts).toHaveBeenCalled();
        expect(accounts).toBe(mockAccounts);
    });

    it('should delegate addAccountDB to repository', async () => {
        (accountRepository.addAccount as jest.Mock).mockResolvedValue(10);

        const newId = await addAccountDB('New Acc', 100);

        expect(accountRepository.addAccount).toHaveBeenCalledWith('New Acc', 100, 'TWD');
        expect(newId).toBe(10);
    });

    it('should delegate updateAccountOrderDB to repository', async () => {
        const accounts = [
            { id: 1, name: 'A', sortIndex: 0 },
            { id: 2, name: 'B', sortIndex: 1 },
        ] as any[];

        await updateAccountOrderDB(accounts);

        expect(accountRepository.updateAccountOrder).toHaveBeenCalledWith(accounts);
    });
});
