import { transactionRepository } from '../repositories';
import { Transaction, TransactionType } from '@/src/types';

export const addTransactionDB = async (t: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    return transactionRepository.addTransaction(t);
};

export const updateTransactionDB = async (id: number, amount: number, type: TransactionType, date: Date, description: string) => {
    return transactionRepository.updateTransaction(id, amount, type, date, description);
};

export const deleteTransactionDB = async (id: number) => {
    return transactionRepository.deleteTransaction(id);
};

export const performTransfer = async (fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string) => {
    return transactionRepository.performTransfer(fromAccountId, toAccountId, amount, date, description);
};

export const updateTransfer = async (
    transactionId: number,
    oldFromAccountId: number,
    oldToAccountId: number,
    oldAmount: number,
    newFromAccountId: number,
    newToAccountId: number,
    newAmount: number,
    newDate: Date,
    newDescription: string
) => {
    return transactionRepository.updateTransfer(transactionId, oldFromAccountId, oldToAccountId, oldAmount, newFromAccountId, newToAccountId, newAmount, newDate, newDescription);
};

export const getTransactionsByAccountDB = async (accountId: number): Promise<Transaction[]> => {
    return transactionRepository.getTransactionsByAccount(accountId);
};

export const getTransactionsWithAccount = async (startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> => {
    return transactionRepository.getTransactionsWithAccount(startDate, endDate);
};

export const getCategorySpending = async (year: number, month: number): Promise<{ [key: string]: number }> => {
    return transactionRepository.getCategorySpending(year, month);
};

export const getDistinctCategories = async (): Promise<string[]> => {
    return transactionRepository.getDistinctCategories();
};

export const getAllTransactionsDB = async () => {
    return transactionRepository.getAllTransactions();
};

export const importTransactionDB = async (t: any) => {
    return transactionRepository.importTransaction(t);
};
