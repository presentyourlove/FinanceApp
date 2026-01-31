import { accountRepository } from '../repositories';
import { Account } from '@/src/types';

export const getAccounts = async (): Promise<Account[]> => {
    return accountRepository.getAccounts();
};

export const updateAccountBalanceDB = async (id: number, newBalance: number) => {
    return accountRepository.updateAccountBalance(id, newBalance);
};

export const addAccountDB = async (name: string, initialBalance: number, currency: string = 'TWD') => {
    return accountRepository.addAccount(name, initialBalance, currency);
};

export const updateAccountOrderDB = async (accounts: Account[]) => {
    return accountRepository.updateAccountOrder(accounts);
};

export const deleteAccountDB = async (id: number) => {
    return accountRepository.deleteAccount(id);
};

export const importAccountDB = async (acc: any) => {
    return accountRepository.importAccount(acc);
};
