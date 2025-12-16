import { Account, Transaction, Budget, Goal, Investment, TransactionType } from '@/src/types';

/**
 * Web-specific implementation of the database service using In-Memory storage.
 * Data is lost on page refresh unless restored from Cloud or persisted to localStorage (future).
 */

// ===================================================
// Observer Pattern
// ===================================================
// ===================================================
// Observer Pattern & Persistence
// ===================================================
type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];
const STORAGE_KEY = 'aifinance_web_db';

const saveDataToStorage = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
    } catch (e) {
        console.error('Failed to save data to localStorage:', e);
    }
};

export const addDataChangeListener = (listener: DataChangeListener) => {
    if (!listeners.includes(listener)) {
        listeners.push(listener);
    }
};

export const removeDataChangeListener = (listener: DataChangeListener) => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
        listeners.splice(index, 1);
    }
};

const notifyListeners = () => {
    // Persist on every change
    saveDataToStorage();
    listeners.forEach(listener => listener());
};

// ===================================================
// In-Memory Data Store
// ===================================================
const memoryStore = {
    accounts: [] as any[],
    transactions: [] as any[],
    budgets: [] as any[],
    goals: [] as any[],
    investments: [] as any[],
};

// ===================================================
// Core Operations
// ===================================================

export const initDatabase = async (skipDefaultData: boolean = false) => {
    console.info("Initializing In-Memory Database for Web...");

    // Try to load from localStorage first
    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed) {
                console.info("Restoring data from localStorage...");
                memoryStore.accounts = parsed.accounts || [];
                memoryStore.transactions = parsed.transactions || [];
                memoryStore.budgets = parsed.budgets || [];
                memoryStore.goals = parsed.goals || [];
                memoryStore.investments = parsed.investments || [];
                notifyListeners();
                return;
            }
        }
    } catch (e) {
        console.error("Failed to load data from localStorage:", e);
    }

    if (!skipDefaultData && memoryStore.accounts.length === 0) {
        console.info("Inserting default data for Web...");
        // Add default accounts
        const initialAccounts = [
            { id: 1, name: '錢包', initialBalance: 500, currentBalance: 500, currency: 'TWD' },
            { id: 2, name: '銀行戶口', initialBalance: 50000, currentBalance: 50000, currency: 'TWD' },
            { id: 3, name: '信用卡', initialBalance: 0, currentBalance: 0, currency: 'TWD' },
        ];
        memoryStore.accounts.push(...initialAccounts);

        // Add default budget
        memoryStore.budgets.push({ id: 1, category: '餐飲', amount: 6000, period: 'monthly', currency: 'TWD' });

        // Add default goal
        memoryStore.goals.push({ id: 1, name: '新手機', targetAmount: 30000, currentAmount: 5000, deadline: '2025-12-31', currency: 'TWD' });

        // Initial save
        saveDataToStorage();
    }
    notifyListeners();
};

// ===================================================
// Accounts
// ===================================================
export const getAccounts = async (): Promise<Account[]> => {
    return [...memoryStore.accounts];
};

export const updateAccountBalanceDB = async (id: number, newBalance: number) => {
    const acc = memoryStore.accounts.find(a => a.id === id);
    if (acc) {
        acc.currentBalance = newBalance;
        notifyListeners();
    }
};

export const addAccountDB = async (name: string, initialBalance: number, currency: string = 'TWD') => {
    const newId = Date.now();
    memoryStore.accounts.push({
        id: newId,
        name,
        initialBalance,
        currentBalance: initialBalance,
        currency
    });
    notifyListeners();
    return newId;
};

export const deleteAccountDB = async (id: number) => {
    const hasTrans = memoryStore.transactions.some(t => t.accountId === id || t.targetAccountId === id);
    if (hasTrans) throw new Error("Account has transactions and cannot be deleted.");

    const idx = memoryStore.accounts.findIndex(a => a.id === id);
    if (idx > -1) {
        memoryStore.accounts.splice(idx, 1);
        notifyListeners();
    }
};

// ===================================================
// Transactions
// ===================================================
export const addTransactionDB = async (t: Omit<Transaction, 'id' | 'date'> & { date: Date }) => {
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    memoryStore.transactions.push({
        id: newId,
        amount: t.amount,
        type: t.type,
        date: t.date.toISOString(),
        description: t.description,
        accountId: t.accountId,
        targetAccountId: t.targetAccountId
    });
    notifyListeners();
    return newId;
};

export const updateTransactionDB = async (id: number, amount: number, type: TransactionType, date: Date, description: string) => {
    const t = memoryStore.transactions.find(tr => tr.id === id);
    if (t) {
        t.amount = amount;
        t.type = type;
        t.date = date.toISOString();
        t.description = description;
        notifyListeners();
    }
};

export const deleteTransactionDB = async (id: number) => {
    const idx = memoryStore.transactions.findIndex(t => t.id === id);
    if (idx > -1) {
        memoryStore.transactions.splice(idx, 1);
        notifyListeners();
    }
};

export const performTransfer = async (fromAccountId: number, toAccountId: number, amount: number, date: Date, description: string) => {
    await addTransactionDB({
        amount,
        type: TransactionType.TRANSFER,
        date,
        description,
        accountId: fromAccountId,
        targetAccountId: toAccountId
    });

    const fromAcc = memoryStore.accounts.find(a => a.id === fromAccountId);
    if (fromAcc) fromAcc.currentBalance -= amount;

    const toAcc = memoryStore.accounts.find(a => a.id === toAccountId);
    if (toAcc) toAcc.currentBalance += amount;

    notifyListeners();
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
    // Revert old
    const oldFrom = memoryStore.accounts.find(a => a.id === oldFromAccountId);
    if (oldFrom) oldFrom.currentBalance += oldAmount;

    const oldTo = memoryStore.accounts.find(a => a.id === oldToAccountId);
    if (oldTo) oldTo.currentBalance -= oldAmount;

    // Update transaction
    const t = memoryStore.transactions.find(tr => tr.id === transactionId);
    if (t) {
        t.amount = newAmount;
        t.date = newDate.toISOString();
        t.description = newDescription;
        t.accountId = newFromAccountId;
        t.targetAccountId = newToAccountId;
    }

    // Apply new
    const newFrom = memoryStore.accounts.find(a => a.id === newFromAccountId);
    if (newFrom) newFrom.currentBalance -= newAmount;

    const newTo = memoryStore.accounts.find(a => a.id === newToAccountId);
    if (newTo) newTo.currentBalance += newAmount;

    notifyListeners();
};

export const getTransactionsByAccountDB = async (accountId: number): Promise<Transaction[]> => {
    const rows = memoryStore.transactions.filter(t => t.accountId === accountId || t.targetAccountId === accountId);
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(row => ({
        ...row,
        type: row.type as Transaction['type']
    }));
};

export const getTransactionsWithAccount = async (startDate?: string, endDate?: string): Promise<(Transaction & { accountCurrency: string })[]> => {
    let rows = [...memoryStore.transactions];

    if (startDate) {
        rows = rows.filter(t => t.date >= startDate); // Simple string comparison works for ISO dates
    }
    if (endDate) {
        rows = rows.filter(t => t.date.split('T')[0] <= endDate);
    }

    // Join with account currency
    return rows.map(t => {
        const acc = memoryStore.accounts.find(a => a.id === t.accountId);
        return {
            ...t,
            type: t.type as Transaction['type'],
            accountCurrency: acc ? acc.currency : 'TWD'
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// ===================================================
// Budgets
// ===================================================
export const getBudgets = async (): Promise<Budget[]> => {
    return [...memoryStore.budgets];
};

export const addBudget = async (category: string, amount: number, period: string = 'monthly', currency: string = 'TWD') => {
    const newId = Date.now();
    memoryStore.budgets.push({ id: newId, category, amount, period, currency });
    notifyListeners();
    return newId;
};

export const updateBudget = async (id: number, category: string, amount: number, period: string, currency: string) => {
    const b = memoryStore.budgets.find(bg => bg.id === id);
    if (b) {
        b.category = category;
        b.amount = amount;
        b.period = period;
        b.currency = currency;
        notifyListeners();
    }
};

export const deleteBudget = async (id: number) => {
    const idx = memoryStore.budgets.findIndex(b => b.id === id);
    if (idx > -1) {
        memoryStore.budgets.splice(idx, 1);
        notifyListeners();
    }
};

// ===================================================
// Goals
// ===================================================
export const getGoals = async (): Promise<Goal[]> => {
    return [...memoryStore.goals];
};

export const addGoal = async (name: string, targetAmount: number, deadline: string | undefined = undefined, currency: string = 'TWD') => {
    const newId = Date.now();
    memoryStore.goals.push({ id: newId, name, targetAmount, currentAmount: 0, deadline, currency });
    notifyListeners();
    return newId;
};

export const updateGoalAmount = async (id: number, currentAmount: number) => {
    const g = memoryStore.goals.find(goal => goal.id === id);
    if (g) {
        g.currentAmount = currentAmount;
        notifyListeners();
    }
};

export const updateGoal = async (id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD') => {
    const g = memoryStore.goals.find(goal => goal.id === id);
    if (g) {
        g.name = name;
        g.targetAmount = targetAmount;
        g.deadline = deadline;
        g.currency = currency;
        notifyListeners();
    }
};

export const deleteGoal = async (id: number) => {
    const idx = memoryStore.goals.findIndex(g => g.id === id);
    if (idx > -1) {
        memoryStore.goals.splice(idx, 1);
        notifyListeners();
    }
};

// ===================================================
// Investments
// ===================================================

export const addInvestment = async (
    data: Omit<Investment, 'id' | 'status'>,
    syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }
) => {
    const newId = Date.now();
    let linkedTransactionId: number | undefined = undefined;

    // Sync logic
    if (syncOptions.syncToTransaction && syncOptions.sourceAccountId) {
        let totalExpense = data.amount || 0;
        if (data.type === 'stock') {
            totalExpense = (data.costPrice || 0) + (data.handlingFee || 0);
        } else {
            totalExpense = data.amount + (data.handlingFee || 0);
        }

        if (totalExpense > 0) {
            linkedTransactionId = await addTransactionDB({
                amount: totalExpense,
                type: TransactionType.EXPENSE,
                date: new Date(data.date),
                description: `投資: ${data.name}`,
                accountId: syncOptions.sourceAccountId
            });

            const acc = memoryStore.accounts.find(a => a.id === syncOptions.sourceAccountId);
            if (acc) acc.currentBalance -= totalExpense;
        }
    }

    memoryStore.investments.push({ ...data, id: newId, status: 'active', linkedTransactionId });
    notifyListeners();
    return newId;
};

export const getInvestments = async (): Promise<Investment[]> => {
    return memoryStore.investments.filter(inv => inv.status === 'active').sort((a, b) => b.date.localeCompare(a.date));
};

export const updateInvestment = async (id: number, data: Partial<Investment>) => {
    const inv = memoryStore.investments.find(i => i.id === id);
    if (inv) {
        Object.assign(inv, data);
        notifyListeners();
    }
};

export const processInvestmentAction = async (
    id: number,
    actionType: 'sell' | 'close' | 'withdraw',
    data: { amount?: number; returnAmount?: number; date: string; },
    syncOptions: { syncToTransaction: boolean; targetAccountId?: number }
) => {
    const inv = memoryStore.investments.find(i => i.id === id);
    if (!inv) throw new Error("Investment not found");

    if (inv.type === 'stock' && actionType === 'sell') {
        const sellShares = data.amount || 0;
        inv.amount -= sellShares;
        if (inv.amount <= 0) {
            inv.amount = 0;
            inv.status = 'sold';
        }
    } else if (actionType === 'close' || actionType === 'withdraw') {
        if (inv.type === 'fixed_deposit') {
            inv.status = 'closed';
            inv.amount = 0;
        } else if (inv.type === 'savings') {
            const withdrawAmount = data.amount || 0;
            inv.amount -= withdrawAmount;
            if (inv.amount <= 0) {
                inv.amount = 0;
                inv.status = 'closed';
            }
        }
    }

    if (syncOptions.syncToTransaction && syncOptions.targetAccountId && data.returnAmount && data.returnAmount > 0) {
        await addTransactionDB({
            amount: data.returnAmount,
            type: TransactionType.INCOME,
            date: new Date(data.date),
            description: `投資回收: ${inv.name} (${actionType})`,
            accountId: syncOptions.targetAccountId
        });

        const acc = memoryStore.accounts.find(a => a.id === syncOptions.targetAccountId);
        if (acc) acc.currentBalance += data.returnAmount;
    }
    notifyListeners();
};

export const updateStockPrice = async (name: string, price: number) => {
    memoryStore.investments
        .filter(inv => inv.type === 'stock' && inv.status === 'active' && inv.name === name)
        .forEach(inv => inv.currentPrice = price);
    notifyListeners();
};

// ===================================================
// Stats & Helpers
// ===================================================
export const getCategorySpending = async (year: number, month: number): Promise<{ [key: string]: number }> => {
    const targetMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const result: { [key: string]: number } = {};

    memoryStore.transactions.forEach((t) => {
        if (t.type === TransactionType.EXPENSE && t.date.startsWith(targetMonthStr)) {
            result[t.description] = (result[t.description] || 0) + t.amount;
        }
    });

    return result;
};

export const getDistinctCategories = async (): Promise<string[]> => {
    const categories = new Set(
        memoryStore.transactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .map(t => t.description)
    );
    return Array.from(categories).sort();
};

// Backup helpers (matches native)
export const getAllTransactionsDB = async () => getTransactionsWithAccount();
export const getAllInvestmentsDB = async () => getInvestments(); // Approximate, actually native returns row directly

// Need to match DB helper object structure EXACTLY for sync.ts
const getAllTransactionsRaw = async () => [...memoryStore.transactions];
const getAllInvestmentsRaw = async () => [...memoryStore.investments];

export const dbOperations = {
    initDatabase,
    getAccounts,
    updateAccountBalanceDB,
    addTransactionDB,
    updateTransactionDB,
    deleteTransactionDB,
    performTransfer,
    updateTransfer,
    getTransactionsByAccountDB,
    getTransactionsWithAccount,
    addAccountDB,
    deleteAccountDB,
    getBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    getGoals,
    addGoal,
    updateGoalAmount,
    updateGoal,
    deleteGoal,
    getCategorySpending,
    getDistinctCategories,
    addInvestment,
    getInvestments,
    updateInvestment,
    processInvestmentAction,
    updateStockPrice,
    clearAllData: async () => {
        memoryStore.accounts = [];
        memoryStore.transactions = [];
        memoryStore.budgets = [];
        memoryStore.goals = [];
        memoryStore.investments = [];
        await initDatabase(true);
    },
    getAllTransactionsDB: getAllTransactionsRaw,
    getAllInvestmentsDB: getAllInvestmentsRaw,
    importAccountDB: async (acc: any) => { memoryStore.accounts.push(acc); },
    importTransactionDB: async (t: any) => { memoryStore.transactions.push(t); },
    importBudgetDB: async (b: any) => { memoryStore.budgets.push(b); },
    importGoalDB: async (g: any) => { memoryStore.goals.push(g); },
    importInvestmentDB: async (i: any) => { memoryStore.investments.push(i); },
    addDataChangeListener,
    removeDataChangeListener
};
