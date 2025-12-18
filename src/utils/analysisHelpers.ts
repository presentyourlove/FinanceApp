import { Transaction, TransactionType } from '@/src/types';
import i18n from '@/src/i18n';

export interface CategoryData {
    name: string;
    amount: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

export interface AnalysisResult {
    income: number;
    expense: number;
    topCategories: CategoryData[];
    advice: string[];
}

/**
 * Calculates total income and expense, aggregating expenses by category.
 * Converts amounts to main currency based on provided exchange rates.
 */
export const calculateTotals = (
    transactions: (Transaction & { accountCurrency: string })[],
    rates: Record<string, number>,
    mainCurrency: string,
    colors: string[],
    subtleTextColor: string
): AnalysisResult => {
    let income = 0;
    let expense = 0;
    const categoryMap = new Map<string, number>();

    for (const t of transactions) {
        // Get account currency rate relative to main currency
        // Default to 1 if currency matches map or is missing (fallback)
        const accRate = rates[t.accountCurrency] || 1;

        // Convert amount to main currency
        // Rate: 1 Main = X AccountCurrency  => AmountMain = AmountAccount / Rate
        // If rates are defined as "How much Main for 1 Account", logic would be different.
        // Based on previous code: AmountMain = AmountAccount / accRate implies accRate is "How many AccountUnits per 1 MainUnit".
        const amountInMain = t.amount / accRate;

        if (t.type === TransactionType.INCOME) {
            income += amountInMain;
        } else if (t.type === TransactionType.EXPENSE) {
            expense += amountInMain;
            const cat = t.description?.split(' ')[0] || i18n.t('common.others');
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + amountInMain);
        }
    }

    // Process Categories
    const sortedCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount], index) => ({
            name: category,
            amount: Math.round(amount),
            color: colors[index % colors.length],
            legendFontColor: subtleTextColor,
            legendFontSize: 12
        }));

    return {
        income,
        expense,
        topCategories: sortedCategories,
        advice: [] // Generated separately
    };
};

/**
 * Generates financial advice based on income vs expense ratio.
 */
export const generateAdvice = (income: number, expense: number, topCategoryName: string | undefined, period: 'month' | 'year'): string[] => {
    const advice: string[] = [];
    const periodText = period === 'month' ? i18n.t('analysis.thisMonth') : i18n.t('analysis.thisYear');

    if (expense > income) {
        advice.push(i18n.t('analysis.adviceOverSpent', { period: periodText }));
    } else if (expense > income * 0.8) {
        advice.push(i18n.t('analysis.adviceHighSpent', { period: periodText }));
    } else {
        advice.push(i18n.t('analysis.adviceGood', { period: periodText }));
    }

    if (topCategoryName) {
        advice.push(i18n.t('analysis.adviceTopCategory', { category: topCategoryName }));
    }

    return advice;
};
