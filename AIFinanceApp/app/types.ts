export interface Account {
    id: number;
    name: string;
    initialBalance: number;
    currentBalance: number;
    currency: string;
}

export interface Transaction {
    id: number;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: string; // ISO string format
    description: string;
    accountId: number;
    targetAccountId?: number;
}

export interface Budget {
    id: number;
    category: string;
    amount: number;
    period: string;
    currency: string;
}

export interface Goal {
    id: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    currency: string;
}

export interface Investment {
    id: number;
    name: string;
    type: 'stock' | 'fixed_deposit' | 'savings';
    amount: number;
    costPrice?: number;
    currentPrice?: number;
    currency: string;
    date: string;
    maturityDate?: string;
    interestRate?: number;
    interestFrequency?: 'daily' | 'monthly' | 'yearly';
    handlingFee?: number;
    purchaseMethod?: string;
    notes?: string;
    sourceAccountId?: number;
    linkedTransactionId?: number;
    status: 'active' | 'sold' | 'closed';
}
