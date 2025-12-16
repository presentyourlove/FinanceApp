import { useState, useCallback } from 'react';
import { dbOperations, Budget } from '@/src/services/database';
import { TransactionType } from '@/src/types';
import * as CategoryStorage from '@/src/services/storage/categoryStorage';
import * as CurrencyStorage from '@/src/services/storage/currencyStorage';

export const useBudgets = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [spendingMap, setSpendingMap] = useState<{ [key: number]: number }>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const loadBudgets = useCallback(async () => {
        try {
            setLoading(true);
            const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

            const [budgetData, currencySettings, transactions] = await Promise.all([
                dbOperations.getBudgets(),
                CurrencyStorage.loadCurrencySettings(),
                dbOperations.getTransactionsWithAccount(startOfYear)
            ]);

            setBudgets(budgetData);
            const rates = currencySettings.exchangeRates;

            const newSpendingMap: { [key: number]: number } = {};
            const now = new Date();

            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfYearDate = new Date(now.getFullYear(), 0, 1);

            budgetData.forEach(budget => {
                const budgetRate = rates[budget.currency] || 1;
                let totalSpent = 0;

                let startDate;
                if (budget.period === 'weekly') startDate = startOfWeek;
                else if (budget.period === 'monthly') startDate = startOfMonth;
                else startDate = startOfYearDate;

                transactions.forEach(t => {
                    if (t.type === TransactionType.EXPENSE && (t.description?.startsWith(budget.category))) {
                        const tDate = new Date(t.date);
                        if (tDate >= startDate && tDate <= now) {
                            const accRate = rates[t.accountCurrency] || 1;
                            const amountInBudget = (t.amount / accRate) * budgetRate;
                            totalSpent += amountInBudget;
                        }
                    }
                });

                newSpendingMap[budget.id] = Math.round(totalSpent);
            });

            setSpendingMap(newSpendingMap);

            const cats = await CategoryStorage.loadCategories();
            setAvailableCategories(cats.expense);
        } catch (error) {
            console.error("Failed to load budgets:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const addBudget = async (category: string, amount: number, period: string, currency: string) => {
        await dbOperations.addBudget(category, amount, period, currency);
        await loadBudgets();
    };

    const updateBudget = async (id: number, category: string, amount: number, period: string, currency: string) => {
        await dbOperations.updateBudget(id, category, amount, period, currency);
        await loadBudgets();
    };

    const deleteBudget = async (id: number) => {
        await dbOperations.deleteBudget(id);
        await loadBudgets();
    };

    return {
        budgets,
        spendingMap,
        availableCategories,
        loading,
        refresh: loadBudgets,
        addBudget,
        updateBudget,
        deleteBudget
    };
};
