import { budgetRepository } from '../repositories';
import { Budget } from '@/src/types';

export const getBudgets = async (): Promise<Budget[]> => {
    return budgetRepository.getBudgets();
};

export const addBudget = async (category: string, amount: number, period: string = 'monthly', currency: string = 'TWD') => {
    return budgetRepository.addBudget(category, amount, period, currency);
};

export const updateBudget = async (id: number, category: string, amount: number, period: string, currency: string) => {
    return budgetRepository.updateBudget(id, category, amount, period, currency);
};

export const deleteBudget = async (id: number) => {
    return budgetRepository.deleteBudget(id);
};

export const importBudgetDB = async (b: any) => {
    return budgetRepository.importBudget(b);
};
