export interface Account {
    id: number;
    name: string;
    initialBalance: number;
    currentBalance: number;
    currency: string;
    sortIndex?: number;
}

export enum TransactionType {
    INCOME = 'income',
    EXPENSE = 'expense',
    TRANSFER = 'transfer',
}

export interface Transaction {
    id: number;
    amount: number;
    type: TransactionType;
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

export interface Category {
    id: number;
    icon: string;
    name: string;
    type: TransactionType;
    isDefault: boolean;
}

export interface GroupedInvestment extends Investment {
    averageCost?: number;
    totalShares?: number;
    marketValue?: number;
    unrealizedProfit?: number;
    returnRate?: number;
    estimatedInterest?: number;
}
