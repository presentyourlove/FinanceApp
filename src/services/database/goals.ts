import { goalRepository } from '../repositories';
import { Goal } from '@/src/types';

export const getGoals = async (): Promise<Goal[]> => {
    return goalRepository.getGoals();
};

export const addGoal = async (name: string, targetAmount: number, deadline: string | undefined = undefined, currency: string = 'TWD') => {
    return goalRepository.addGoal(name, targetAmount, deadline, currency);
};

export const updateGoalAmount = async (id: number, currentAmount: number) => {
    return goalRepository.updateGoalAmount(id, currentAmount);
};

export const updateGoal = async (id: number, name: string, targetAmount: number, deadline?: string, currency: string = 'TWD') => {
    return goalRepository.updateGoal(id, name, targetAmount, deadline, currency);
};

export const deleteGoal = async (id: number) => {
    return goalRepository.deleteGoal(id);
};

export const importGoalDB = async (g: any) => {
    return goalRepository.importGoal(g);
};
