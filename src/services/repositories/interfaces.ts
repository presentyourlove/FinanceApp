import { Account, Transaction, Budget, Goal, Investment, TransactionType } from '@/src/types';

export interface IAccountRepository {
    getAccounts(): Promise<Account[]>;
    addAccount(name: string, initialBalance: number, currency: string): Promise<number>;
    updateAccountBalance(id: number, newBalance: number): Promise<void>;
    updateAccountOrder(accounts: Account[]): Promise<void>;
    deleteAccount(id: number): Promise<void>;
    importAccount(acc: any): Promise<void>;
}

export interface ITransactionRepository {
    addTransaction(t: Omit<Transaction, 'id' | 'date'> & { date: Date }): Promise<number>;
    updateTransaction(id: number, amount: number, type: TransactionType, date: Date, description: string): Promise<void>;
    deleteTransaction(id: number): Promise<void>;
    performTransfer(fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string): Promise<void>;
    updateTransfer(transactionId: number, oldFromAccountId: number, oldToAccountId: number, oldAmount: number, newFromAccountId: number, newToAccountId: number, newAmount: number, newDate: Date, newDescription: string): Promise<void>;
    getTransactionsByAccount(accountId: number): Promise<Transaction[]>;
    getTransactionsWithAccount(startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]>;
    getCategorySpending(year: number, month: number): Promise<{ [key: string]: number }>;
    getDistinctCategories(): Promise<string[]>;
    getAllTransactions(): Promise<Transaction[]>;
    importTransaction(t: any): Promise<void>;
}

export interface IBudgetRepository {
    getBudgets(): Promise<Budget[]>;
    addBudget(category: string, amount: number, period: string, currency: string): Promise<number>;
    updateBudget(id: number, category: string, amount: number, period: string, currency: string): Promise<void>;
    deleteBudget(id: number): Promise<void>;
    importBudget(b: any): Promise<void>;
}

export interface IGoalRepository {
    getGoals(): Promise<Goal[]>;
    addGoal(name: string, targetAmount: number, deadline?: string, currency?: string): Promise<number>;
    updateGoalAmount(id: number, currentAmount: number): Promise<void>;
    updateGoal(id: number, name: string, targetAmount: number, deadline?: string, currency?: string): Promise<void>;
    deleteGoal(id: number): Promise<void>;
    importGoal(g: any): Promise<void>;
}

export interface IInvestmentRepository {
    addInvestment(data: Omit<Investment, 'id' | 'status'>, syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }): Promise<number>;
    getInvestments(): Promise<Investment[]>;
    updateInvestment(id: number, data: Partial<Investment>): Promise<void>;
    processInvestmentAction(id: number, actionType: 'sell' | 'close' | 'withdraw', data: { amount?: number; returnAmount?: number; date: string }, syncOptions: { syncToTransaction: boolean; targetAccountId?: number }): Promise<void>;
    updateStockPrice(name: string, price: number): Promise<void>;
    getAllInvestments(): Promise<Investment[]>;
    importInvestment(inv: any): Promise<void>;
}
