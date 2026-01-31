import { investmentRepository } from '../repositories';
import { Investment } from '@/src/types';

export const addInvestment = async (
    data: Omit<Investment, 'id' | 'status'>,
    syncOptions: { syncToTransaction: boolean; sourceAccountId?: number }
) => {
    return investmentRepository.addInvestment(data, syncOptions);
};

export const getInvestments = async (): Promise<Investment[]> => {
    return investmentRepository.getInvestments();
};

export const updateInvestment = async (id: number, data: Partial<Investment>) => {
    return investmentRepository.updateInvestment(id, data);
};

export const processInvestmentAction = async (
    id: number,
    actionType: 'sell' | 'close' | 'withdraw',
    data: {
        amount?: number;
        returnAmount?: number;
        date: string;
    },
    syncOptions: { syncToTransaction: boolean; targetAccountId?: number }
) => {
    return investmentRepository.processInvestmentAction(id, actionType, data, syncOptions);
};

export const updateStockPrice = async (name: string, price: number) => {
    return investmentRepository.updateStockPrice(name, price);
};

export const getAllInvestmentsDB = async () => {
    return investmentRepository.getAllInvestments();
};

export const importInvestmentDB = async (inv: any) => {
    return investmentRepository.importInvestment(inv);
};
