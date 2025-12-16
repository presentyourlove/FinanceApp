import { useState, useCallback, useMemo } from 'react';
import { dbOperations } from '@/src/services/database';
import { loadCurrencySettings } from '@/src/services/storage/currencyStorage';
import { Investment, Account, GroupedInvestment } from '@/src/types';

export const useInvestments = () => {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [currencyOptions, setCurrencyOptions] = useState<string[]>(['TWD']);
    const [loading, setLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const invs = await dbOperations.getInvestments();
            setInvestments(invs);
            const accs = await dbOperations.getAccounts();
            setAccounts(accs);
            const settings = await loadCurrencySettings();
            setCurrencyOptions(Object.keys(settings.exchangeRates));
        } catch (e) {
            console.error("Failed to load investment data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const groupedInvestments = useMemo(() => {
        const stocksMap: { [key: string]: GroupedInvestment } = {};
        const fixedDeposits: Investment[] = [];
        const savings: Investment[] = [];

        investments.forEach(inv => {
            if (inv.type === 'stock') {
                if (stocksMap[inv.name]) {
                    stocksMap[inv.name].amount += inv.amount;
                    stocksMap[inv.name].costPrice = (stocksMap[inv.name].costPrice || 0) + (inv.costPrice || 0);
                    // Use the latest price found
                    if (new Date(inv.date) > new Date(stocksMap[inv.name].date)) {
                        stocksMap[inv.name].currentPrice = inv.currentPrice;
                    }
                } else {
                    stocksMap[inv.name] = { ...inv };
                }
            } else if (inv.type === 'fixed_deposit') {
                fixedDeposits.push(inv);
            } else if (inv.type === 'savings') {
                savings.push(inv);
            }
        });

        const stocks = Object.values(stocksMap).map(s => {
            const avgCost = s.costPrice ? s.costPrice / s.amount : 0;
            const marketVal = s.amount * (s.currentPrice || 0);
            const profit = marketVal - (s.costPrice || 0);
            const rate = s.costPrice ? (profit / s.costPrice) * 100 : 0;
            return {
                ...s,
                averageCost: avgCost,
                marketValue: marketVal,
                unrealizedProfit: profit,
                returnRate: rate
            };
        });

        const calculateInterest = (inv: Investment) => {
            const days = (new Date().getTime() - new Date(inv.date).getTime()) / (1000 * 3600 * 24);
            if (days < 0) return 0;
            return inv.amount * ((inv.interestRate || 0) / 100) * (days / 365);
        };

        const fds = fixedDeposits.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));
        const savs = savings.map(i => ({ ...i, estimatedInterest: calculateInterest(i) }));

        return [
            { title: '股票', data: stocks },
            { title: '定存', data: fds },
            { title: '活存', data: savs }
        ].filter(section => section.data.length > 0);
    }, [investments]);

    return {
        investments,
        accounts,
        currencyOptions,
        groupedInvestments,
        loading,
        refresh: loadData
    };
};
